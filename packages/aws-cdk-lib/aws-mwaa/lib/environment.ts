import { Construct } from 'constructs';
import { CfnEnvironment } from './mwaa.generated';
import * as iam from '../../aws-iam';
import * as s3 from '../../aws-s3';
import { IBucket } from '../../aws-s3/lib/bucket';
import { Resource } from '../../core';

/**
 * Properties for a new MWAA Environment.
 */
export interface EnvironmentProps {
  /**
   * Airflow version.
   */
  readonly airflowVersion: AirflowVersion;
  /**
   * S3 bucket that contains Airflow DAGs.
   */
  readonly bucket: IBucket;
  /**
   * The relative path to the DAGs folder on the S3 bucket.
   */
  readonly dagS3Path: string;
  /**
   * The environment class type.
   */
  readonly environmentClass: EnvironmentClass;
  /**
   * Name of the environment.
   */
  readonly name: string;
  /**
   * Environment execution role.
   *
   * The role must be assumable by the service principals 'airflow-env.amazonaws.com'
   * and 'airflow.amazonaws.com'.
   *
   * @default - A new role will be created, having the default policies attached.
   */
  readonly role?: iam.IRole;
}

/**
 * The supported Airflow version.
 */
export enum AirflowVersion {
  V2_4_3 = '2.4.3',
  V2_5_1 = '2.5.1',
  V2_6_3 = '2.6.3',
  V2_7_2 = '2.7.2',
  V2_8_1 = '2.8.1',
}

/**
 * The environment class.
 */
export enum EnvironmentClass {
  MW1_SMALL = 'mw1.small',
  MW1_MEDIUM = 'mw1.medium',
  MW1_LARGE = 'mw1.large',
}

/**
 * A new MWAA environment.
 */
export class Environment extends Resource {

  public readonly airflowVersion: string;
  public readonly bucket: s3.IBucket;
  public readonly dagS3Path: string;
  public readonly environmentClass: string;
  public readonly name: string;
  public readonly role: iam.IRole;

  constructor(scope: Construct, id: string, props: EnvironmentProps) {
    super(scope, id);

    this.airflowVersion = props.airflowVersion;
    this.bucket = props.bucket;
    this.dagS3Path = props.dagS3Path;
    this.environmentClass = props.environmentClass;
    this.name = props.name;

    if (!props.role) {
      this.role = new iam.Role(this, 'ExecutionRole', {
        roleName: `AmazonMWAA-${props.name}-ExecutionRole`,
        assumedBy: new iam.CompositePrincipal(
          new iam.ServicePrincipal('airflow-env.amazonaws.com'),
          new iam.ServicePrincipal('airflow.amazonaws.com'),
        ),
      });

      this.role.addToPrincipalPolicy(new iam.PolicyStatement({
        actions: ['airflow:PublishMetrics'],
        resources: [this.stack.formatArn({
          service: 'airflow',
          resource: 'environment',
          resourceName: props.name,
        })],
      }));

      this.role.addToPrincipalPolicy(new iam.PolicyStatement({
        effect: iam.Effect.DENY,
        actions: ['s3:ListAllMyBuckets'],
        resources: [this.bucket.bucketArn, this.bucket.arnForObjects('*')],
      }));

      this.role.addToPrincipalPolicy(new iam.PolicyStatement({
        actions: ['s3:GetObject*', 's3:GetBucket*', 's3:List*'],
        resources: [this.bucket.bucketArn, this.bucket.arnForObjects('*')],
      }));

      this.role.addToPrincipalPolicy(new iam.PolicyStatement({
        actions: [
          'logs:CreateLogStream',
          'logs:CreateLogGroup',
          'logs:PutLogEvents',
          'logs:GetLogEvents',
          'logs:GetLogRecord',
          'logs:GetLogGroupFields',
          'logs:GetQueryResults',
        ],
        resources: [this.stack.formatArn({
          service: 'logs',
          resource: 'log-group',
          resourceName: `airflow-${props.name}-*`,
        })],
      }));

      this.role.addToPrincipalPolicy(new iam.PolicyStatement({
        actions: ['logs:DescribeLogGroups', 'cloudwatch:PutMetricData'],
        resources: ['*'],
      }));

      this.role.addToPrincipalPolicy(new iam.PolicyStatement({
        actions: [
          'sqs:ChangeMessageVisibility',
          'sqs:DeleteMessage',
          'sqs:GetQueueAttributes',
          'sqs:GetQueueUrl',
          'sqs:ReceiveMessage',
          'sqs:SendMessage',
        ],
        resources: [this.stack.formatArn({
          service: 'sqs',
          account: '*',
          resource: 'airflow-celery-*',
        })],
      }));

      this.role.addToPrincipalPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'kms:Decrypt',
          'kms:DescribeKey',
          'kms:GenerateDataKey*',
          'kms:Encrypt',
        ],
        notResources: [this.stack.formatArn({
          service: 'kms',
          resource: 'key',
          region: '*',
          resourceName: '*',
        })],
        conditions: {
          StringLike: { 'kms:ViaService': `sqs.${this.stack.region}.amazonaws.com` },
        },
      }));
    } else {
      this.role = props.role;
    }

    new CfnEnvironment(this, 'Resource', {
      airflowVersion: this.airflowVersion,
      dagS3Path: props.dagS3Path,
      environmentClass: props.environmentClass,
      executionRoleArn: this.role.roleArn,
      name: this.name,
      sourceBucketArn: this.bucket.bucketArn,
    });
  }
}

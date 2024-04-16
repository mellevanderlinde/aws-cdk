import { Construct } from 'constructs';
import { CfnEnvironment } from './mwaa.generated';
import * as ec2 from '../../aws-ec2';
import * as iam from '../../aws-iam';
import * as kms from '../../aws-kms';
import * as s3 from '../../aws-s3';
import { IBucket } from '../../aws-s3/lib/bucket';
import { Resource } from '../../core';

/**
 * Properties for a new MWAA Environment.
 */
export interface EnvironmentProps {
  /**
   * Apache Airflow Web server access mode. To learn more, see https://docs.aws.amazon.com/mwaa/latest/userguide/configuring-networking.html.
   */
  readonly accessMode?: AccessMode;
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
   * Key to encrypt and decrypt data in the environment.
   */
  readonly kmsKey?: kms.Key;
  /**
   * Maximum number of workers to run in the environment.
   */
  readonly maxWorkers: number;
  /**
   * Minimum number of workers to run in the environment.
   */
  readonly minWorkers: number;
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
  /**
   * Tags to attach to the environment resource.
   */
  readonly tags?: Tag[];
  /**
   * Security groups to attach to the environment. Between 1 and 5 security groups must be provided.
   */
  readonly securityGroups: ec2.ISecurityGroup[];
  /**
   * Number of schedulers to run in the environment. Accepts between 2 to 5.
   *
   * @default - 2 schedulers.
   */
  readonly schedulers?: number;
  /**
   * Two subnets to attach to the environment.
   */
  readonly subnets: ec2.ISubnet[];
}

/**
 * The Apache Airflow Web server access mode.
 */
export enum AccessMode {
  PRIVATE_ONLY = 'PRIVATE_ONLY',
  PUBLIC_ONLY = 'PUBLIC_ONLY',
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
 * Tags to attach to the environment resource.
 */
export interface Tag {
  readonly Key: string;
  readonly Value: string;
}

/**
 * A new MWAA environment.
 */
export class Environment extends Resource {

  public readonly accessMode?: AccessMode;
  public readonly airflowVersion: string;
  public readonly bucket: s3.IBucket;
  public readonly dagS3Path: string;
  public readonly environmentClass: string;
  public readonly kmsKey?: kms.Key;
  public readonly maxWorkers: number;
  public readonly minWorkers: number;
  public readonly name: string;
  public readonly role: iam.IRole;
  public readonly securityGroups: ec2.ISecurityGroup[];
  public readonly schedulers: number;
  public readonly subnets: ec2.ISubnet[];
  public readonly tags?: Tag[];

  constructor(scope: Construct, id: string, props: EnvironmentProps) {
    super(scope, id);

    this.accessMode = props.accessMode;
    this.airflowVersion = props.airflowVersion;
    this.bucket = props.bucket;
    this.dagS3Path = props.dagS3Path;
    this.environmentClass = props.environmentClass;
    this.kmsKey = props.kmsKey;
    this.maxWorkers = props.maxWorkers;
    this.minWorkers = props.minWorkers;
    this.name = props.name;
    this.role = !props.role ? this.createRole() : props.role;
    this.schedulers = !props.schedulers ? 2 : props.schedulers;
    this.securityGroups = props.securityGroups;
    this.subnets = props.subnets;
    this.tags = props.tags;

    if (this.securityGroups.length < 1 || this.securityGroups.length > 5) {
      throw new Error(`Received ${this.securityGroups.length} security groups, while between 1 and 5 are required`);
    }

    if (this.subnets.length !== 2) {
      throw new Error(`Received ${this.subnets.length} subnet(s), while 2 are required`);
    }

    if (this.schedulers < 2 || this.schedulers > 5) {
      throw new Error(`Number of specified schedulers is ${this.schedulers}, while it must be between 2 to 5.`);
    }

    new CfnEnvironment(this, 'Resource', {
      airflowVersion: this.airflowVersion,
      dagS3Path: this.dagS3Path,
      environmentClass: this.environmentClass,
      executionRoleArn: this.role.roleArn,
      kmsKey: this.kmsKey?.keyArn,
      maxWorkers: this.maxWorkers,
      minWorkers: this.minWorkers,
      name: this.name,
      networkConfiguration: {
        securityGroupIds: this.renderSecurityGroups(),
        subnetIds: this.renderSubnets(),
      },
      schedulers: this.schedulers,
      sourceBucketArn: this.bucket.bucketArn,
      tags: this.tags,
      webserverAccessMode: this.accessMode,
    });
  }

  private renderSubnets(): string[] {
    return this.subnets.map(subnet => subnet.subnetId);
  }

  private renderSecurityGroups(): string[] {
    return this.securityGroups.map(sg => sg.securityGroupId);
  }

  private createRole(): iam.Role {
    const role = new iam.Role(this, 'ExecutionRole', {
      roleName: `AmazonMWAA-${this.name}-ExecutionRole`,
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('airflow-env.amazonaws.com'),
        new iam.ServicePrincipal('airflow.amazonaws.com'),
      ),
    });

    role.addToPrincipalPolicy(new iam.PolicyStatement({
      actions: ['airflow:PublishMetrics'],
      resources: [this.stack.formatArn({
        service: 'airflow',
        resource: 'environment',
        resourceName: this.name,
      })],
    }));

    role.addToPrincipalPolicy(new iam.PolicyStatement({
      effect: iam.Effect.DENY,
      actions: ['s3:ListAllMyBuckets'],
      resources: [this.bucket.bucketArn, this.bucket.arnForObjects('*')],
    }));

    role.addToPrincipalPolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject*', 's3:GetBucket*', 's3:List*'],
      resources: [this.bucket.bucketArn, this.bucket.arnForObjects('*')],
    }));

    role.addToPrincipalPolicy(new iam.PolicyStatement({
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
        resourceName: `airflow-${this.name}-*`,
      })],
    }));

    role.addToPrincipalPolicy(new iam.PolicyStatement({
      actions: ['logs:DescribeLogGroups', 'cloudwatch:PutMetricData'],
      resources: ['*'],
    }));

    role.addToPrincipalPolicy(new iam.PolicyStatement({
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

    role.addToPrincipalPolicy(new iam.PolicyStatement({
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

    return role;
  }
}

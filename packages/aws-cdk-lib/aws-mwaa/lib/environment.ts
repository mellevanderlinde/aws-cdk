import { Construct } from 'constructs';
import { CfnEnvironment } from './mwaa.generated';
import * as ec2 from '../../aws-ec2';
import * as iam from '../../aws-iam';
import * as kms from '../../aws-kms';
import * as logs from '../../aws-logs';
import * as s3 from '../../aws-s3';
import { IResource, Resource } from '../../core';

/**
 * Properties for a new MWAA Environment.
 */
export interface EnvironmentProps {
  /**
   * Apache Airflow Web server access mode. To learn more,
   * see https://docs.aws.amazon.com/mwaa/latest/userguide/configuring-networking.html.
   *
   * @default - No web server access mode defined.
   */
  readonly accessMode?: AccessMode;
  /**
   * Key-value pairs of the Airflow configuration options for the environment.
   * To learn more, see https://docs.aws.amazon.com/mwaa/latest/userguide/configuring-env-variables.html.
   *
   * @default - No configurations are specified.
   */
  readonly airflowConfigurations?: { [key: string]: string };
  /**
   * Airflow version to be used in the environment.
   *
   * @default - Airflow version 2.8.1 (latest) will be used.
   */
  readonly airflowVersion?: AirflowVersion;
  /**
   * S3 bucket that contains Airflow DAGs.
   */
  readonly bucket: s3.IBucket;
  /**
   * CloudWatch log group that saves the DAG processing logs.
   *
   * @default - No log group is used.
   */
  readonly dagProcessingLogGroup?: logs.ILogGroup;
  /**
   * The relative path to the DAGs folder in the S3 bucket.
   */
  readonly dagS3Path: string;
  /**
   * Whether the VPC endpoints configured for the environment are created and managed by the customer or by Amazon MWAA.
   *
   * @default - No endpoint management specified.
   */
  readonly endpointManagement?: EndpointManagement;
  /**
   * The environment class type.
   *
   * @default - mw1.small is used.
   */
  readonly environmentClass?: EnvironmentClass;
  /**
   * Key to encrypt and decrypt data in the environment.
   *
   * @default - An AWS managed key is used.
   */
  readonly kmsKey?: kms.IKey;
  /**
   * Logging level for the Airflow logs in CloudWatch.
   *
   * @default - Logging at INFO level.
   */
  readonly logLevel?: LogLevel;
  /**
   * Maximum number of workers to run in the environment.
   *
   * @default - 1 worker is used.
   */
  readonly maxWorkers?: number;
  /**
   * Minimum number of workers to run in the environment.
   *
   * @default - 1 worker is used.
   */
  readonly minWorkers?: number;
  /**
   * Name of the environment.
   */
  readonly name: string;
  /**
   * The object version of the plugins.zip file in the S3 bucket.
   *
   * @default - No version is provided.
   */
  readonly pluginsVersion?: string;
  /**
   * The relative path to the requirements.txt file in the S3 bucket.
   *
   * @default - No path is provided.
   */
  readonly requirementsS3Path?: string;
  /**
   * The object version of the requirements.txt file in the S3 bucket.
   *
   * @default - No version is provided.
   */
  readonly requirementsVersion?: string;
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
   * Security groups to attach to the environment. Between 1 and 5 security groups must be provided.
   */
  readonly securityGroups: ec2.ISecurityGroup[];
  /**
   * CloudWatch log group that saves the scheduler logs.
   *
   * @default - No log group is used.
   */
  readonly schedulerLogGroup?: logs.ILogGroup;
  /**
   * Number of schedulers to run in the environment. Accepts between 2 to 5.
   *
   * @default - 2 schedulers are used.
   */
  readonly schedulers?: number;
  /**
   * The relative path to the startup shell script file in the S3 bucket.
   *
   * @default - No path is provided.
   */
  readonly startupScriptS3Path?: string;
  /**
   * The object version of the startup shell script file in the S3 bucket.
   *
   * @default - No version is provided.
   */
  readonly startupScriptVersion?: string;
  /**
   * Two subnets to attach to the environment.
   */
  readonly subnets: ec2.ISubnet[];
  /**
   * Tags to attach to the environment resource.
   *
   * @default - No tags are attached.
   */
  readonly tags?: { [key: string]: string };
  /**
   * CloudWatch log group that saves the task logs.
   *
   * @default - No log group is used.
   */
  readonly taskLogGroup?: logs.ILogGroup;
  /**
   * CloudWatch log group that saves the webserver logs.
   *
   * @default - No log group is used.
   */
  readonly webserverLogGroup?: logs.ILogGroup;
  /**
   * The day and time of the week to start weekly maintenance updates of
   * the environment in the following format: DAY:HH:MM.
   *
   * For example: TUE:03:30. A start time can be specified in 30 minute increments only.
   *
   * Supported input includes the following: MON|TUE|WED|THU|FRI|SAT|SUN:([01]\\d|2[0-3]):(00|30)
   *
   * @default - No window start is specified.
   */
  readonly weeklyMaintenanceWindowStart?: string;
  /**
   * CloudWatch log group that saves the worker logs.
   *
   * @default - No log group is used.
   */
  readonly workerLogGroup?: logs.ILogGroup;
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
 * Create and manage the VPC endpoints by either the customer or MWAA.
 */
export enum EndpointManagement {
  CUSTOMER = 'CUSTOMER',
  SERVICE = 'SERVICE',
}

/**
 * The environment class.
 */
export enum EnvironmentClass {
  MW1_SMALL = 'mw1.small',
  MW1_MEDIUM = 'mw1.medium',
  MW1_LARGE = 'mw1.large',
  MW1_XLARGE = 'mw1.xlarge',
  MW1_2XLARGE = 'mw1.2xlarge',
}

export enum LogLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

/**
 * A new MWAA environment.
 */
export class Environment extends Resource implements IEnvironment {
  
  public readonly airflowVersion: AirflowVersion;
  private readonly bucket: s3.IBucket;
  public readonly environmentClass: EnvironmentClass;
  private readonly logLevel: LogLevel;
  public readonly name: string;
  public readonly role: iam.IRole;
  private readonly schedulers: number;
  private readonly securityGroups: ec2.ISecurityGroup[];
  private readonly subnets: ec2.ISubnet[];

  constructor(scope: Construct, id: string, props: EnvironmentProps) {
    super(scope, id);

    this.airflowVersion = props.airflowVersion ?? AirflowVersion.V2_8_1;
    this.bucket = props.bucket;
    this.environmentClass = props.environmentClass ?? EnvironmentClass.MW1_SMALL;
    this.logLevel = props.logLevel ?? LogLevel.INFO;
    this.name = props.name;
    this.role = props.role ?? this.createRole();
    this.schedulers = props.schedulers ?? 2;
    this.securityGroups = props.securityGroups;
    this.subnets = props.subnets;

    if (this.securityGroups.length < 1 || this.securityGroups.length > 5) {
      throw new Error(`Received ${this.securityGroups.length} security groups, while between 1 and 5 are required`);
    }

    if (this.subnets.length !== 2) {
      throw new Error(`Received ${this.subnets.length} subnet(s), while 2 are required`);
    }

    if (this.schedulers < 2 || this.schedulers > 5) {
      throw new Error(`Number of specified schedulers is ${this.schedulers}, while it must be between 2 to 5.`);
    }

    let loggingConfiguration: CfnEnvironment.LoggingConfigurationProperty | undefined = undefined;
    if (props.dagProcessingLogGroup || props.schedulerLogGroup || props.taskLogGroup || props.webserverLogGroup || props.workerLogGroup) {
      loggingConfiguration = {
        dagProcessingLogs: {
          cloudWatchLogGroupArn: props.dagProcessingLogGroup?.logGroupArn,
          enabled: props.dagProcessingLogGroup?.logGroupArn ? true: undefined,
          logLevel: this.logLevel,
        },
        schedulerLogs: {
          cloudWatchLogGroupArn: props.schedulerLogGroup?.logGroupArn,
          enabled: props.schedulerLogGroup?.logGroupArn ? true: undefined,
          logLevel: this.logLevel,
        },
        taskLogs: {
          cloudWatchLogGroupArn: props.taskLogGroup?.logGroupArn,
          enabled: props.taskLogGroup?.logGroupArn ? true: undefined,
          logLevel: this.logLevel,
        },
        webserverLogs: {
          cloudWatchLogGroupArn: props.webserverLogGroup?.logGroupArn,
          enabled: props.webserverLogGroup?.logGroupArn ? true: undefined,
          logLevel: this.logLevel,
        },
        workerLogs: {
          cloudWatchLogGroupArn: props.workerLogGroup?.logGroupArn,
          enabled: props.workerLogGroup?.logGroupArn ? true: undefined,
          logLevel: this.logLevel,
        },
      };
    }

    new CfnEnvironment(this, 'Resource', {
      airflowConfigurationOptions: props.airflowConfigurations,
      airflowVersion: this.airflowVersion,
      dagS3Path: props.dagS3Path,
      endpointManagement: props.endpointManagement,
      environmentClass: this.environmentClass,
      executionRoleArn: this.role.roleArn,
      kmsKey: props.kmsKey?.keyArn,
      loggingConfiguration: loggingConfiguration,
      maxWorkers: props.maxWorkers ?? 1,
      minWorkers: props.minWorkers ?? 1,
      name: this.name,
      networkConfiguration: {
        securityGroupIds: this.renderSecurityGroups(),
        subnetIds: this.renderSubnets(),
      },
      pluginsS3ObjectVersion: props.pluginsVersion,
      requirementsS3ObjectVersion: props.requirementsVersion,
      requirementsS3Path: props.requirementsS3Path,
      schedulers: this.schedulers,
      sourceBucketArn: this.bucket.bucketArn,
      startupScriptS3ObjectVersion: props.startupScriptVersion,
      startupScriptS3Path: props.startupScriptS3Path,
      tags: props.tags,
      webserverAccessMode: props.accessMode,
      weeklyMaintenanceWindowStart: props.weeklyMaintenanceWindowStart,
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

export interface IEnvironment extends IResource {
   readonly airflowVersion: string;
   readonly environmentClass: string;
   readonly name: string;
   readonly role: iam.IRole;
}
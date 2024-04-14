import { Construct } from 'constructs';
import { CfnEnvironment } from './mwaa.generated';
import { IBucket } from '../../aws-s3/lib/bucket';
import { Resource } from '../../core';

/**
 * Properties for a new MWAA Environment.
 */
export interface EnvironmentProps {
  /**
   * Name of the environment.
   */
  readonly name: string;
  /**
   * Airflow version.
   */
  readonly airflowVersion: AirflowVersion;
  /**
   * S3 bucket that contains Airflow DAGs.
   */
  readonly sourceBucket: IBucket;
  /**
   * The relative path to the DAGs folder on the S3 bucket.
   */
  readonly dagS3Path: string;
  /**
   * The environment class type.
   */
  readonly environmentClass: EnvironmentClass;
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
  constructor(scope: Construct, id: string, props: EnvironmentProps) {
    super(scope, id);

    new CfnEnvironment(this, 'Resource', {
      name: props.name,
      airflowVersion: props.airflowVersion,
      sourceBucketArn: props.sourceBucket.bucketArn,
      dagS3Path: props.dagS3Path,
      environmentClass: props.environmentClass,
    });
  }
}

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
}

/**
 * The supported Airflow version.
 */
export enum AirflowVersion {
  v2_4_3 = '2.4.3',
  v2_5_1 = '2.5.1',
  v2_6_3 = '2.6.3',
  v2_7_2 = '2.7.2',
  v2_8_1 = '2.8.1',
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
    });
  }
}

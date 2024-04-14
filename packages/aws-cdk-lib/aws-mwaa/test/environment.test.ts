import { Template } from '../../assertions';
import * as cdk from '../../core';
import * as mwaa from '../lib';
import * as s3 from '../../aws-s3/lib/bucket';

describe('Environment', () => {
  describe('environment tests', () => {
    test('all defaults', () => {
      const stack = new cdk.Stack();
      const bucket = new s3.Bucket(stack, 'Bucket');

      new mwaa.Environment(stack, 'Environment', {
        name: 'mwaa',
        airflowVersion: mwaa.AirflowVersion.v2_8_1,
        sourceBucket: bucket,
        dagS3Path: 'dags',
      });

      const template = Template.fromStack(stack);

      template.resourceCountIs('AWS::MWAA::Environment', 1);
      template.hasResourceProperties('AWS::MWAA::Environment', {
        Name: 'mwaa',
        AirflowVersion: '2.8.1',
        SourceBucketArn: { 'Fn::GetAtt': ['Bucket83908E77', 'Arn'] },
        DagS3Path: 'dags',
      });
    });
  });
});
import { Template } from '../../assertions';
import * as iam from '../../aws-iam/lib';
import * as s3 from '../../aws-s3/lib';
import * as cdk from '../../core';
import * as mwaa from '../lib';

describe('Environment', () => {
  describe('environment tests', () => {
    test('all defaults', () => {
      const stack = new cdk.Stack();
      const bucket = new s3.Bucket(stack, 'Bucket');

      new mwaa.Environment(stack, 'Environment', {
        name: 'Airflow',
        airflowVersion: mwaa.AirflowVersion.V2_8_1,
        sourceBucket: bucket,
        dagS3Path: 'dags',
        environmentClass: mwaa.EnvironmentClass.MW1_SMALL,
      });

      const template = Template.fromStack(stack);

      template.resourceCountIs('AWS::MWAA::Environment', 1);
      template.hasResourceProperties('AWS::MWAA::Environment', {
        Name: 'Airflow',
        AirflowVersion: '2.8.1',
        SourceBucketArn: { 'Fn::GetAtt': ['Bucket83908E77', 'Arn'] },
        DagS3Path: 'dags',
        EnvironmentClass: 'mw1.small',
        ExecutionRoleArn: { 'Fn::GetAtt': ['EnvironmentExecutionRoleA0E74382', 'Arn'] },
      });

      template.resourceCountIs('AWS::IAM::Role', 1);
      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'AmazonMWAA-Airflow-ExecutionRole',
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: {
                Service: 'airflow-env.amazonaws.com',
              },
            }, {
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: {
                Service: 'airflow.amazonaws.com',
              },
            },
          ],
        },
      });

      template.resourceCountIs('AWS::IAM::Policy', 1);
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyName: 'EnvironmentExecutionRoleDefaultPolicy063C3CFA',
        Roles: [{ Ref: 'EnvironmentExecutionRoleA0E74382' }],
        PolicyDocument: {
          Statement: [
            {
              Action: 'airflow:PublishMetrics',
              Effect: 'Allow',
              Resource: {
                'Fn::Join': [
                  '',
                  [
                    'arn:',
                    {
                      Ref: 'AWS::Partition',
                    },
                    ':airflow:',
                    {
                      Ref: 'AWS::Region',
                    },
                    ':',
                    {
                      Ref: 'AWS::AccountId',
                    },
                    ':environment/Airflow',
                  ],
                ],
              },
            }, {
              Action: 's3:ListAllMyBuckets',
              Effect: 'Deny',
              Resource: [
                {
                  'Fn::GetAtt': [
                    'Bucket83908E77',
                    'Arn',
                  ],
                },
                {
                  'Fn::Join': [
                    '',
                    [
                      {
                        'Fn::GetAtt': [
                          'Bucket83908E77',
                          'Arn',
                        ],
                      },
                      '/*',
                    ],
                  ],
                },
              ],
            },
            {
              Action: [
                's3:GetObject*',
                's3:GetBucket*',
                's3:List*',
              ],
              Effect: 'Allow',
              Resource: [
                {
                  'Fn::GetAtt': [
                    'Bucket83908E77',
                    'Arn',
                  ],
                },
                {
                  'Fn::Join': [
                    '',
                    [
                      {
                        'Fn::GetAtt': [
                          'Bucket83908E77',
                          'Arn',
                        ],
                      },
                      '/*',
                    ],
                  ],
                },
              ],
            },
            {
              Action: [
                'logs:CreateLogStream',
                'logs:CreateLogGroup',
                'logs:PutLogEvents',
                'logs:GetLogEvents',
                'logs:GetLogRecord',
                'logs:GetLogGroupFields',
                'logs:GetQueryResults',
              ],
              Effect: 'Allow',
              Resource: {
                'Fn::Join': [
                  '',
                  [
                    'arn:',
                    {
                      Ref: 'AWS::Partition',
                    },
                    ':logs:',
                    {
                      Ref: 'AWS::Region',
                    },
                    ':',
                    {
                      Ref: 'AWS::AccountId',
                    },
                    ':log-group/airflow-Airflow-*',
                  ],
                ],
              },
            },
            {
              Action: [
                'logs:DescribeLogGroups',
                'cloudwatch:PutMetricData',
              ],
              Effect: 'Allow',
              Resource: '*',
            },
            {
              Action: [
                'sqs:ChangeMessageVisibility',
                'sqs:DeleteMessage',
                'sqs:GetQueueAttributes',
                'sqs:GetQueueUrl',
                'sqs:ReceiveMessage',
                'sqs:SendMessage',
              ],
              Effect: 'Allow',
              Resource: {
                'Fn::Join': [
                  '',
                  [
                    'arn:',
                    {
                      Ref: 'AWS::Partition',
                    },
                    ':sqs:',
                    {
                      Ref: 'AWS::Region',
                    },
                    ':*:airflow-celery-*',
                  ],
                ],
              },
            },
            {
              Action: [
                'kms:Decrypt',
                'kms:DescribeKey',
                'kms:GenerateDataKey*',
                'kms:Encrypt',
              ],
              Condition: {
                StringLike: {
                  'kms:ViaService': {
                    'Fn::Join': [
                      '',
                      [
                        'sqs.',
                        {
                          Ref: 'AWS::Region',
                        },
                        '.amazonaws.com',
                      ],
                    ],
                  },
                },
              },
              Effect: 'Allow',
              NotResource: {
                'Fn::Join': [
                  '',
                  [
                    'arn:',
                    {
                      Ref: 'AWS::Partition',
                    },
                    ':kms:*:',
                    {
                      Ref: 'AWS::AccountId',
                    },
                    ':key/*',
                  ],
                ],
              },
            },
          ],
        },
      });
    });

    test('execution role attached', () => {
      const stack = new cdk.Stack();
      const bucket = new s3.Bucket(stack, 'Bucket');

      const role = new iam.Role(stack, 'ExecutionRole', {
        roleName: 'AttachedExecutionRole',
        assumedBy: new iam.CompositePrincipal(
          new iam.ServicePrincipal('airflow-env.amazonaws.com'),
          new iam.ServicePrincipal('airflow.amazonaws.com'),
        ),
      });

      new mwaa.Environment(stack, 'Environment', {
        name: 'Airflow',
        airflowVersion: mwaa.AirflowVersion.V2_8_1,
        sourceBucket: bucket,
        dagS3Path: 'dags',
        environmentClass: mwaa.EnvironmentClass.MW1_SMALL,
        role,
      });

      const template = Template.fromStack(stack);

      template.resourceCountIs('AWS::MWAA::Environment', 1);
      template.hasResourceProperties('AWS::MWAA::Environment', {
        ExecutionRoleArn: { 'Fn::GetAtt': ['ExecutionRole605A040B', 'Arn'] },
      });

      template.resourceCountIs('AWS::IAM::Role', 1);
      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'AttachedExecutionRole',
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: {
                Service: 'airflow-env.amazonaws.com',
              },
            }, {
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: {
                Service: 'airflow.amazonaws.com',
              },
            },
          ],
        },
      });
    });
  });
});

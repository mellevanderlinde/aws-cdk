import { Template } from '../../assertions';
import * as ec2 from '../../aws-ec2/lib';
import * as iam from '../../aws-iam/lib';
import * as kms from '../../aws-kms/lib';
import * as logs from '../../aws-logs';
import * as s3 from '../../aws-s3/lib';
import * as cdk from '../../core';
import * as mwaa from '../lib';

describe('Environment', () => {
  describe('environment tests', () => {

    let stack: cdk.Stack;
    let bucket: s3.Bucket;
    let dagS3Path: string;
    let vpc: ec2.Vpc;
    let name: string;
    let securityGroups: ec2.SecurityGroup[];
    let subnet1: ec2.Subnet;
    let subnet2: ec2.Subnet;
    let subnets: ec2.Subnet[];

    beforeEach(() => {
      stack = new cdk.Stack();
      bucket = new s3.Bucket(stack, 'Bucket');
      dagS3Path = 'dags';
      vpc = new ec2.Vpc(stack, 'Vpc');
      name = 'Airflow';
      securityGroups = [new ec2.SecurityGroup(stack, 'SecurityGroup', { vpc })];
      subnet1 = new ec2.Subnet(stack, 'subnet1', {
        vpcId: vpc.vpcId,
        availabilityZone: vpc.availabilityZones[0],
        cidrBlock: vpc.vpcCidrBlock,
      });
      subnet2 = new ec2.Subnet(stack, 'subnet2', {
        vpcId: vpc.vpcId,
        availabilityZone: vpc.availabilityZones[1],
        cidrBlock: vpc.vpcCidrBlock,
      });
      subnets = [subnet1, subnet2];
    });

    test('all defaults', () => {
      const environment = new mwaa.Environment(stack, 'Environment', {
        bucket,
        dagS3Path,
        name,
        securityGroups,
        subnets,
      });

      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::MWAA::Environment', 1);
      expect(template).toMatchSnapshot();

      expect(environment.airflowVersion).toBe('2.8.1');
      expect(environment.environmentClass).toBe('mw1.small');
      expect(environment.environmentArn).toBeDefined();
      expect(environment.environmentName).toBe('Airflow');
      expect(environment.role).toBeInstanceOf(iam.Role);
    });

    test('execution role attached', () => {
      const role = new iam.Role(stack, 'ExecutionRole', {
        roleName: 'AttachedExecutionRole',
        assumedBy: new iam.CompositePrincipal(
          new iam.ServicePrincipal('airflow-env.amazonaws.com'),
          new iam.ServicePrincipal('airflow.amazonaws.com'),
        ),
      });

      new mwaa.Environment(stack, 'Environment', {
        bucket,
        dagS3Path,
        name,
        role,
        securityGroups,
        subnets,
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

    test('incorrect number of security groups', () => {
      expect(() => new mwaa.Environment(stack, 'Environment1', {
        bucket,
        dagS3Path,
        name,
        securityGroups: [],
        subnets,
      })).toThrow('Received 0 security groups, while between 1 and 5 are required');

      expect(() => new mwaa.Environment(stack, 'Environment2', {
        bucket,
        dagS3Path,
        name,
        securityGroups: [
          new ec2.SecurityGroup(stack, 'SecurityGroup1', { vpc }),
          new ec2.SecurityGroup(stack, 'SecurityGroup2', { vpc }),
          new ec2.SecurityGroup(stack, 'SecurityGroup3', { vpc }),
          new ec2.SecurityGroup(stack, 'SecurityGroup4', { vpc }),
          new ec2.SecurityGroup(stack, 'SecurityGroup5', { vpc }),
          new ec2.SecurityGroup(stack, 'SecurityGroup6', { vpc }),
        ],
        subnets,
      })).toThrow('Received 6 security groups, while between 1 and 5 are required');
    });

    test('incorrect number of subnets', () => {
      expect(() => new mwaa.Environment(stack, 'Environment1', {
        bucket,
        dagS3Path,
        name,
        securityGroups,
        subnets: [],
      })).toThrow('Received 0 subnet(s), while 2 are required');

      expect(() => new mwaa.Environment(stack, 'Environment2', {
        bucket,
        dagS3Path,
        name,
        securityGroups,
        subnets: [subnet1],
      })).toThrow('Received 1 subnet(s), while 2 are required');

      expect(() => new mwaa.Environment(stack, 'Environment3', {
        bucket,
        dagS3Path,
        name,
        securityGroups,
        subnets: [
          subnet1, subnet2,
          new ec2.Subnet(stack, 'subnet3', {
            vpcId: vpc.vpcId,
            availabilityZone: vpc.availabilityZones[0],
            cidrBlock: vpc.vpcCidrBlock,
          }),
        ],
      })).toThrow('Received 3 subnet(s), while 2 are required');
    });

    test('schedulers specified', () => {
      expect(() => new mwaa.Environment(stack, 'Environment2', {
        bucket,
        dagS3Path,
        name,
        securityGroups,
        schedulers: 1,
        subnets,
      })).toThrow('Number of specified schedulers is 1, while it must be between 2 to 5.');

      expect(() => new mwaa.Environment(stack, 'Environment3', {
        bucket,
        dagS3Path,
        name,
        securityGroups,
        schedulers: 6,
        subnets,
      })).toThrow('Number of specified schedulers is 6, while it must be between 2 to 5.');
    });

    test('optional properties specified', () => {
      const environment = new mwaa.Environment(stack, 'Environment', {
        accessMode: mwaa.AccessMode.PRIVATE_ONLY,
        airflowConfigurations: { 'core.default_timezone': 'utc' },
        airflowVersion: mwaa.AirflowVersion.V2_7_2,
        bucket,
        dagS3Path,
        endpointManagement: mwaa.EndpointManagement.SERVICE,
        environmentClass: mwaa.EnvironmentClass.MW1_LARGE,
        kmsKey: new kms.Key(stack, 'Key'),
        maxWorkers: 5,
        minWorkers: 2,
        name,
        pluginsVersion: 'plugins-hash',
        requirementsS3Path: 'requirements-path',
        requirementsVersion: 'requirements-hash',
        securityGroups,
        subnets,
        startupScriptS3Path: 'startup-path',
        startupScriptVersion: 'startup-version',
        tags: { key: 'value' },
        weeklyMaintenanceWindowStart: 'TUE:03:30',
      });

      const template = Template.fromStack(stack);
      expect(template).toMatchSnapshot();

      expect(environment.airflowVersion).toBe('2.7.2');
      expect(environment.environmentClass).toBe('mw1.large');
    });

    test('log groups specified', () => {
      const environment = new mwaa.Environment(stack, 'Environment', {
        bucket,
        dagS3Path,
        name,
        securityGroups,
        subnets,
        dagProcessingLogGroup: new logs.LogGroup(stack, 'DagLogs'),
        webserverLogGroup: new logs.LogGroup(stack, 'WebserverLogs'),
        logLevel: mwaa.LogLevel.WARNING,
      });
    });
  });
});

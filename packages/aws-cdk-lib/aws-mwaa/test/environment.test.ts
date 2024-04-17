import { Template } from '../../assertions';
import * as ec2 from '../../aws-ec2/lib';
import * as iam from '../../aws-iam/lib';
import * as kms from '../../aws-kms/lib';
import * as s3 from '../../aws-s3/lib';
import * as cdk from '../../core';
import * as mwaa from '../lib';

describe('Environment', () => {
  describe('environment tests', () => {

    let stack: cdk.Stack;
    let bucket: s3.Bucket;
    let vpc: ec2.Vpc;
    let securityGroup: ec2.SecurityGroup;
    let subnet1: ec2.Subnet;
    let subnet2: ec2.Subnet;

    beforeEach(() => {
      stack = new cdk.Stack();
      bucket = new s3.Bucket(stack, 'Bucket');
      vpc = new ec2.Vpc(stack, 'Vpc');
      securityGroup = new ec2.SecurityGroup(stack, 'SecurityGroup', {
        vpc,
      });
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
    });

    test('all defaults', () => {
      const environment = new mwaa.Environment(stack, 'Environment', {
        bucket: bucket,
        dagS3Path: 'dags',
        name: 'Airflow',
        securityGroups: [securityGroup],
        subnets: [subnet1, subnet2],
      });

      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::MWAA::Environment', 1);
      expect(template).toMatchSnapshot();

      expect(environment.accessMode).toBe(undefined);
      expect(environment.airflowVersion).toBe('2.8.1');
      expect(environment.bucket).toBeInstanceOf(s3.Bucket);
      expect(environment.dagS3Path).toBe('dags');
      expect(environment.endpointManagement).toBe(undefined);
      expect(environment.environmentClass).toBe('mw1.small');
      expect(environment.kmsKey).toBe(undefined);
      expect(environment.maxWorkers).toBe(1);
      expect(environment.minWorkers).toBe(1);
      expect(environment.name).toBe('Airflow');
      expect(environment.pluginsVersion).toBe(undefined);
      expect(environment.requirementsS3Path).toBe(undefined);
      expect(environment.requirementsVersion).toBe(undefined);
      expect(environment.role).toBeInstanceOf(iam.Role);
      expect(environment.securityGroups).toBeInstanceOf(Array);
      expect(environment.securityGroups[0]).toBeInstanceOf(ec2.SecurityGroup);
      expect(environment.schedulers).toBe(2);
      expect(environment.subnets).toBeInstanceOf(Array);
      expect(environment.subnets[0]).toBeInstanceOf(ec2.Subnet);
      expect(environment.tags).toBe(undefined);
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
        dagS3Path: 'dags',
        name: 'Airflow',
        role,
        securityGroups: [securityGroup],
        subnets: [subnet1, subnet2],
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
        bucket: bucket,
        dagS3Path: 'dags',
        name: 'Airflow',
        securityGroups: [],
        subnets: [subnet1, subnet2],
      })).toThrow('Received 0 security groups, while between 1 and 5 are required');

      expect(() => new mwaa.Environment(stack, 'Environment2', {
        bucket: bucket,
        dagS3Path: 'dags',
        name: 'Airflow',
        securityGroups: [
          new ec2.SecurityGroup(stack, 'SecurityGroup1', { vpc }),
          new ec2.SecurityGroup(stack, 'SecurityGroup2', { vpc }),
          new ec2.SecurityGroup(stack, 'SecurityGroup3', { vpc }),
          new ec2.SecurityGroup(stack, 'SecurityGroup4', { vpc }),
          new ec2.SecurityGroup(stack, 'SecurityGroup5', { vpc }),
          new ec2.SecurityGroup(stack, 'SecurityGroup6', { vpc }),
        ],
        subnets: [subnet1, subnet2],
      })).toThrow('Received 6 security groups, while between 1 and 5 are required');
    });

    test('incorrect number of subnets', () => {
      expect(() => new mwaa.Environment(stack, 'Environment1', {
        bucket: bucket,
        dagS3Path: 'dags',
        name: 'Airflow',
        securityGroups: [securityGroup],
        subnets: [],
      })).toThrow('Received 0 subnet(s), while 2 are required');

      expect(() => new mwaa.Environment(stack, 'Environment2', {
        bucket: bucket,
        dagS3Path: 'dags',
        name: 'Airflow',
        securityGroups: [securityGroup],
        subnets: [subnet1],
      })).toThrow('Received 1 subnet(s), while 2 are required');

      expect(() => new mwaa.Environment(stack, 'Environment3', {
        bucket: bucket,
        dagS3Path: 'dags',
        name: 'Airflow',
        securityGroups: [securityGroup],
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
      expect(new mwaa.Environment(stack, 'Environment1', {
        bucket: bucket,
        dagS3Path: 'dags',
        name: 'Airflow',
        securityGroups: [securityGroup],
        schedulers: 4,
        subnets: [subnet1, subnet2],
      }).schedulers).toBe(4);

      expect(() => new mwaa.Environment(stack, 'Environment2', {
        bucket: bucket,
        dagS3Path: 'dags',
        name: 'Airflow',
        securityGroups: [securityGroup],
        schedulers: 1,
        subnets: [subnet1, subnet2],
      })).toThrow('Number of specified schedulers is 1, while it must be between 2 to 5.');

      expect(() => new mwaa.Environment(stack, 'Environment3', {
        bucket: bucket,
        dagS3Path: 'dags',
        name: 'Airflow',
        securityGroups: [securityGroup],
        schedulers: 6,
        subnets: [subnet1, subnet2],
      })).toThrow('Number of specified schedulers is 6, while it must be between 2 to 5.');
    });

    test('optional properties specified', () => {
      const environment = new mwaa.Environment(stack, 'Environment', {
        accessMode: mwaa.AccessMode.PRIVATE_ONLY,
        airflowVersion: mwaa.AirflowVersion.V2_7_2,
        bucket: bucket,
        dagS3Path: 'dags',
        endpointManagement: mwaa.EndpointManagement.SERVICE,
        environmentClass: mwaa.EnvironmentClass.MW1_LARGE,
        kmsKey: new kms.Key(stack, 'Key'),
        maxWorkers: 5,
        minWorkers: 2,
        name: 'Airflow',
        pluginsVersion: 'plugins-hash',
        requirementsS3Path: 'requirements-path',
        requirementsVersion: 'requirements-hash',
        securityGroups: [securityGroup],
        subnets: [subnet1, subnet2],
        tags: [{ Key: 'key', Value: 'value' }],
      });

      expect(environment.airflowVersion).toBe('2.7.2');
      expect(environment.accessMode).toBe('PRIVATE_ONLY');
      expect(environment.endpointManagement).toBe('SERVICE');
      expect(environment.environmentClass).toBe('mw1.large');
      expect(environment.kmsKey).toBeInstanceOf(kms.Key);
      expect(environment.maxWorkers).toBe(5);
      expect(environment.minWorkers).toBe(2);
      expect(environment.pluginsVersion).toBe('plugins-hash');
      expect(environment.requirementsS3Path).toBe('requirements-path');
      expect(environment.requirementsVersion).toBe('requirements-hash');
      expect(environment.tags).toStrictEqual([{ Key: 'key', Value: 'value' }]);
    });
  });
});

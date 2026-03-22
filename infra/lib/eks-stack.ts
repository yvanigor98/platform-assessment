import * as cdk from 'aws-cdk-lib';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';
import { KubectlV29Layer } from '@aws-cdk/lambda-layer-kubectl-v29';

interface EksStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  repository: ecr.Repository;
}

export class EksStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EksStackProps) {
    super(scope, id, props);

    // the IAM role the EKS control plane uses to manage AWS resources on my behalf
    // IAM role that the EKS cluster itself assumes
    const clusterRole = new iam.Role(this, 'ClusterRole', {
      assumedBy: new iam.ServicePrincipal('eks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSClusterPolicy'),
      ],
    });

    // The EKS cluster — lives in private subnets for security
    const cluster = new eks.Cluster(this, 'PlatformCluster', {
      clusterName: 'platform-cluster',
      version: eks.KubernetesVersion.V1_29,
      vpc: props.vpc,
      vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
      role: clusterRole,
        // we tell 'CDK' to NOT CREATE default nodes, we shall define our own, which will give us full control
      defaultCapacity: 0, // we define our own node group below
      kubectlLayer: new KubectlV29Layer(this, 'KubectlLayer'),
    });

    // IAM role for the worker nodes
    const nodeRole = new iam.Role(this, 'NodeRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        // it let the node join the cluster
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSWorkerNodePolicy'),
        // it let the node manage pod networking
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKS_CNI_Policy'),
        // it let the node pull Docker Images from ECR
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'),
      ],
    });

    // Grant nodes permission to pull images from our ECR repo
    // it explicitly grants my specific ECR repo pull access to the nodes
    props.repository.grantPull(nodeRole);

    // The actual worker nodes — t3.medium, 2 to 4 nodes, exactly what the assessment asked for
    cluster.addNodegroupCapacity('PlatformNodes', {
      instanceTypes: [new ec2.InstanceType('t3.medium')],
      minSize: 2,
      maxSize: 4,
      desiredSize: 2,
      nodeRole: nodeRole,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });
  }
}
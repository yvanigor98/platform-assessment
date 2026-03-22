#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/network-stack';
import { EcrStack } from '../lib/ecr-stack';
import { EksStack } from '../lib/eks-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || '123456789012',
  region: process.env.CDK_DEFAULT_REGION || 'af-south-1',
};

// Stack 1 - Network foundation
const networkStack = new NetworkStack(app, 'NetworkStack', { env });

// Stack 2 - Container registry
const ecrStack = new EcrStack(app, 'EcrStack', { env });

// Stack 3 - EKS cluster, depends on network and ECR
const eksStack = new EksStack(app, 'EksStack', {
  env,
  vpc: networkStack.vpc,
  repository: ecrStack.repository,
});

// Explicit dependency so CDK deploys in the right order
// tells CDK to always deploy NetworkStack first, then EcrStack, then EksStack. the order matters because EKS needs the vpc to already exist
eksStack.addDependency(networkStack);
eksStack.addDependency(ecrStack);
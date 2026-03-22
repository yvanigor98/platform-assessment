import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';

export class EcrStack extends cdk.Stack {
    // exposes the repo so EKsStack can grant nodes pull access to it
  public readonly repository: ecr.Repository;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.repository = new ecr.Repository(this, 'PlatformRepo', {
        // the name of my private Docker image registry  
      repositoryName: 'platform-app',
    // the 'DESTROY' option will tear down the stack, which will have the repo cleaned up completely, but in prod its safe to use 'RETAIN' to avoid accidental deletion of the repo and its images
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    //   everytime a docker image is pushed, AWS automatically scans it for vulnerabilities and reports any findings in the ECR console, which is a great security feature to catch potential issues early on
      imageScanOnPush: true,
    });
  }
}
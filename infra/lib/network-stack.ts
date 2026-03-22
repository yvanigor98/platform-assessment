import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class NetworkStack extends cdk.Stack {
    //  exposes the VPC so EksStack can reference it
    public readonly vpc: ec2.Vpc;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        this.vpc = new ec2.Vpc(this, 'PlatformVpc', {
            // spreads across 2 availability zones (data centers) for high availability
            maxAzs: 2,
            // one NAT gateway so private subnet servers can reach the internet
            natGateways: 1,
            // Two subnet types: public (internet-facing) and private (where EKS nodes live safely)
            subnetConfiguration: [
                {
                    name: 'Public',
                    subnetType: ec2.SubnetType.PUBLIC,
                    cidrMask: 24,
                },
                {
                    name: 'Private',
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                    cidrMask: 24,
                },
            ],
        });
    }
}

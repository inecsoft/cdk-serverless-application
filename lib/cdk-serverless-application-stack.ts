import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import path from 'path';
import { Networking } from './cdk-networking';
import { DocumentManagementApi } from './api';

// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkServerlessApplicationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new cdk.aws_s3.Bucket(this, 'DocumentsBucket-upload', {
      accessControl: cdk.aws_s3.BucketAccessControl.PRIVATE,
      encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
      versioned: false,
      blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new cdk.aws_s3_deployment.BucketDeployment(this, 'DocumentsDeployment', {
      sources: [
        cdk.aws_s3_deployment.Source.asset(
          path.join(__dirname, '..', 'documents')
        ),
      ],
      destinationBucket: bucket,
      memoryLimit: 512,
    });

    new Networking(this, 'NetworkingConstruct', {
      maxAzs: 3,
      natGateways: 1,
    });

    const api = new DocumentManagementApi(this, 'DocumentManageApi', {
      documentBucket: bucket,
    });

    new cdk.CfnOutput(this, 'DocumentsBucketNameExport', {
      value: bucket.bucketName,
      exportName: 'DocumentsBucketName',
    });
  }
}

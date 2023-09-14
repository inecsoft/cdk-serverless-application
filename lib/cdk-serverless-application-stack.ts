import * as cdk from 'aws-cdk-lib';
import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Networking } from './cdk-networking';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Architecture } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import {
  CorsHttpMethod,
  HttpApi,
  HttpMethod,
} from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3';
import {
  Distribution,
  OriginAccessIdentity,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { execSync, ExecSyncOptions } from 'child_process';
import { join } from 'path';
import { copySync } from 'fs-extra';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';

import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  PhysicalResourceId,
} from 'aws-cdk-lib/custom-resources';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
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

import { Construct } from 'constructs';

import * as cdk from 'aws-cdk-lib';

import path from 'path';

export class NextjsLambdaCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // aws lambda list-layers --profile ivan-arteaga-dev --region eu-west-1 | jq -r '.Layers[]'

    const lambdaAdapterLayer = cdk.aws_lambda.LayerVersion.fromLayerVersionArn(
      this,
      'LambdaAdapterLayerX86',
      `arn:aws:lambda:${this.region}:753240598075:layer:LambdaAdapterLayerX86:3`
    );

    const lambdaAdapterLayerVersion = new cdk.aws_lambda.LayerVersion(
      this,
      'lambdaAdapterLayer',
      {
        removalPolicy: cdk.RemovalPolicy.RETAIN,
        code: cdk.aws_lambda.Code.fromAsset(
          path.join(__dirname, '../app/.next/', 'standalone')
        ),
        compatibleArchitectures: [
          cdk.aws_lambda.Architecture.X86_64,
          cdk.aws_lambda.Architecture.ARM_64,
        ],
      }
    );

    const nextCdkFunction = new cdk.aws_lambda.Function(
      this,
      'NextCdkFunction',
      {
        runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
        handler: 'run.sh',
        code: cdk.aws_lambda.Code.fromAsset(
          path.join(__dirname, '../app/.next/', 'standalone')
        ),
        architecture: cdk.aws_lambda.Architecture.X86_64,
        environment: {
          AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
          RUST_LOG: 'info',
          PORT: '8080',
        },
        layers: [lambdaAdapterLayer],
        memorySize: 256,
        timeout: cdk.Duration.minutes(5),
        description: 'Nodejs 18 lambda for nextjs',
      }
    );

    const api = new cdk.aws_apigateway.RestApi(this, 'api', {
      cloudWatchRole: true,
      deployOptions: {
        loggingLevel: cdk.aws_apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: cdk.aws_apigateway.Cors.ALL_ORIGINS,
        allowMethods: cdk.aws_apigateway.Cors.ALL_METHODS,
      },
    });

    const nextCdkFunctionIntegration = new cdk.aws_apigateway.LambdaIntegration(
      nextCdkFunction,
      {
        allowTestInvoke: false,
      }
    );
    api.root.addMethod('ANY', nextCdkFunctionIntegration);

    api.root.addProxy({
      defaultIntegration: new cdk.aws_apigateway.LambdaIntegration(
        nextCdkFunction,
        {
          allowTestInvoke: false,
        }
      ),
      anyMethod: true,
    });

    const nextLoggingBucket = new cdk.aws_s3.Bucket(
      this,
      'next-logging-bucket',
      {
        blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL,
        encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
        versioned: true,
        accessControl: cdk.aws_s3.BucketAccessControl.LOG_DELIVERY_WRITE,
      }
    );

    const nextBucket = new cdk.aws_s3.Bucket(this, 'next-bucket', {
      blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL,
      encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      serverAccessLogsBucket: nextLoggingBucket,
      serverAccessLogsPrefix: 's3-access-logs',
    });

    new cdk.CfnOutput(this, 'Next bucket', { value: nextBucket.bucketName });

    const cloudfrontDistribution = new cdk.aws_cloudfront.Distribution(
      this,
      'Distribution',
      {
        defaultBehavior: {
          origin: new cdk.aws_cloudfront_origins.RestApiOrigin(api),
          viewerProtocolPolicy:
            cdk.aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cdk.aws_cloudfront.CachePolicy.CACHING_DISABLED,
        },
        additionalBehaviors: {
          '_next/static/*': {
            origin: new cdk.aws_cloudfront_origins.S3Origin(nextBucket),
            viewerProtocolPolicy:
              cdk.aws_cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          },
          'static/*': {
            origin: new cdk.aws_cloudfront_origins.S3Origin(nextBucket),
            viewerProtocolPolicy:
              cdk.aws_cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          },
        },
        minimumProtocolVersion:
          cdk.aws_cloudfront.SecurityPolicyProtocol.TLS_V1_2_2018,
        logBucket: nextLoggingBucket,
        logFilePrefix: 'cloudfront-access-logs',
      }
    );

    new cdk.CfnOutput(this, 'CloudFront URL', {
      value: `https://${cloudfrontDistribution.distributionDomainName}`,
    });

    // #!/bin/bash -e
    // aws s3 cp ./.next/static s3://next-bucket/_next/static --recursive
    new cdk.aws_s3_deployment.BucketDeployment(
      this,
      'deploy-next-static-bucket',
      {
        sources: [cdk.aws_s3_deployment.Source.asset('app/.next/static/')],
        destinationBucket: nextBucket,
        destinationKeyPrefix: '_next/static',
        distribution: cloudfrontDistribution,
        distributionPaths: ['/_next/static/*'],
      }
    );

    new cdk.aws_s3_deployment.BucketDeployment(
      this,
      'deploy-next-public-bucket',
      {
        sources: [cdk.aws_s3_deployment.Source.asset('app/public/static/')],
        destinationBucket: nextBucket,
        destinationKeyPrefix: 'static',
        distribution: cloudfrontDistribution,
        distributionPaths: ['/static/*'],
      }
    );
  }
}

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import path from 'path';

export interface StackNameProps extends cdk.StackProps {}

export class NextjsLamdbaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: StackNameProps) {
    super(scope, id, props);

    const lambdaAdapterLayer = cdk.aws_lambda.LayerVersion.fromLayerVersionArn(
      this,
      'LambdaAdapterLayerX86',
      `arn:aws:lambda:${this.region}:${this.account}:layer:LambdaAdapterLayerX86:3`
    );

    /*
    // Role for the lambda function
    const lambdaRole = new cdk.aws_iam.Role(this, 'lambdaRole', {
      assumedBy: new cdk.aws_iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    lambdaRole.addManagedPolicy(
      cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaBasicExecutionRole'
      )
    );
    // only required if your function lives in a VPC
    lambdaRole.addManagedPolicy(
      cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaVPCAccessExecutionRole'
      )
    );
    */

    const nextCdkFunction = new cdk.aws_lambda.Function(
      this,
      'NextCdkFunction',
      {
        runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
        handler: 'run.sh',
        code: cdk.aws_lambda.Code.fromAsset(
          path.join(__dirname, '../app/.next/', 'standalone')
        ),
        architecture: cdk.aws_lambda.Architecture.X86_64, //cdk.aws_lambda.Architecture.ARM_64
        environment: {
          AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
          RUST_LOG: 'info',
          PORT: '8080',
        },
        layers: [lambdaAdapterLayer],
        timeout: cdk.Duration.minutes(5),
        // role: lambdaRole, // user-provided role
      }
    );

    // CloudWatch alarm to report when your function timed out:
    if (nextCdkFunction.timeout) {
      new cdk.aws_cloudwatch.Alarm(
        this,
        `nextjsCdkFunctionLambdaTimeoutAlarm`,
        {
          metric: nextCdkFunction.metricDuration().with({
            statistic: 'Maximum',
          }),
          evaluationPeriods: 1,
          datapointsToAlarm: 1,
          threshold: nextCdkFunction.timeout.toMilliseconds(),
          treatMissingData: cdk.aws_cloudwatch.TreatMissingData.IGNORE,
          alarmName: 'nextjsCdkFunction Lambda Timeout',
        }
      );
    }

    const api = new cdk.aws_apigateway.RestApi(this, 'api', {
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

    // database settings
    const table = new cdk.aws_dynamodb.Table(this, 'NotesTable', {
      billingMode: cdk.aws_dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'pk', type: cdk.aws_dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      sortKey: { name: 'sk', type: cdk.aws_dynamodb.AttributeType.STRING },
      tableName: 'NotesTable',
    });
  }
}

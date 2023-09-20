import * as cdk from 'aws-cdk-lib';
import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
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

// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkServerlessApplicationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new Table(this, 'NotesTable', {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'pk', type: AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      sortKey: { name: 'sk', type: AttributeType.STRING },
      tableName: 'NotesTable',
    });

    const readFunction = new NodejsFunction(this, 'ReadNotesFn', {
      architecture: Architecture.ARM_64,
      entry: `${__dirname}/fns/readFunction.ts`,
      logRetention: RetentionDays.ONE_WEEK,
    });

    const writeFunction = new NodejsFunction(this, 'WriteNoteFn', {
      architecture: Architecture.ARM_64,
      entry: `${__dirname}/fns/writeFunction.ts`,
      logRetention: RetentionDays.ONE_WEEK,
    });

    // to grant permissions to our functions to access the table
    table.grantReadData(readFunction);

    table.grantWriteData(writeFunction);

    // create the HTTP API
    const api = new HttpApi(this, 'NotesApi', {
      corsPreflight: {
        allowHeaders: ['Content-Type'],
        allowMethods: [CorsHttpMethod.GET, CorsHttpMethod.POST],
        allowOrigins: ['*'],
      },
    });

    const readIntegration = new HttpLambdaIntegration(
      'ReadIntegration',
      readFunction
    );

    const writeIntegration = new HttpLambdaIntegration(
      'WriteIntegration',
      writeFunction
    );

    api.addRoutes({
      integration: readIntegration,
      methods: [HttpMethod.GET],
      path: '/notes',
    });

    api.addRoutes({
      integration: writeIntegration,
      methods: [HttpMethod.POST],
      path: '/notes',
    });

    new cdk.CfnOutput(this, 'HttpApiUrl', { value: api.apiEndpoint });
    new cdk.CfnOutput(this, 'HttpApiUrl-data', {
      value: `${api.apiEndpoint}/notes}`,
    });

    const websiteBucket = new Bucket(this, 'WebsiteBucket', {
      autoDeleteObjects: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // This S3 Bucket has no public access. Instead, we're going to give access via CloudFront Distribution.
    // To do that, we'll need to use the OriginAccessIdentity construct to grant the read access CloudFront.
    const originAccessIdentity = new OriginAccessIdentity(
      this,
      'OriginAccessIdentity'
    );
    websiteBucket.grantRead(originAccessIdentity);

    const distribution = new Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new S3Origin(websiteBucket, { originAccessIdentity }),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });

    const execOptions: ExecSyncOptions = {
      stdio: ['ignore', process.stderr, 'inherit'],
    };

    // The bundler will run vite build which puts our transpiled web application under /dist,
    // then it'll copy those files into the CDK staging directory (usually cdk.out).

    // const entry = path.join(__dirname, '../frontend');

    const bundle = Source.asset(join(__dirname, 'web'), {
      bundling: {
        command: [
          'sh',
          '-c',
          'echo "Docker build not supported. Please install esbuild."',
        ],
        image: cdk.DockerImage.fromRegistry('alpine'),
        local: {
          tryBundle(outputDir: string) {
            try {
              execSync('npx vite build', execOptions);
            } catch {
              return false;
            }

            try {
              // copy the dist directory that is created with 'yarn generate'
              // to the cdk outDir
              copySync(join(__dirname, '../dist'), outputDir, {
                overwrite: true,
              });
            } catch {
              return false;
            }
            return true;
          },
        },
      },
    });

    new BucketDeployment(this, 'DeployWebsite', {
      destinationBucket: websiteBucket,
      distribution,
      logRetention: RetentionDays.ONE_DAY,
      prune: false,
      sources: [bundle],
    });

    new AwsCustomResource(this, 'ApiUrlResource', {
      logRetention: RetentionDays.ONE_DAY,
      onUpdate: {
        action: 'putObject',
        parameters: {
          Body: Stack.of(this).toJsonString({
            [this.stackName]: { HttpApiUrl: api.apiEndpoint },
          }),
          Bucket: websiteBucket.bucketName,
          CacheControl: 'max-age=0, no-cache, no-store, must-revalidate',
          ContentType: 'application/json',
          Key: 'config.json',
        },
        physicalResourceId: PhysicalResourceId.of('config'),
        service: 'S3',
      },
      policy: AwsCustomResourcePolicy.fromStatements([
        new PolicyStatement({
          actions: ['s3:PutObject'],
          resources: [websiteBucket.arnForObjects('config.json')],
        }),
      ]),
    });

    new cdk.CfnOutput(this, 'DistributionDomain', {
      value: distribution.distributionDomainName,
    });
  }
}

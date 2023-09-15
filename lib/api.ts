import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import path from 'path';

interface DocumentManagementApiProps {
  documentBucket: cdk.aws_s3.IBucket;
}

export class DocumentManagementApi extends Construct {
  constructor(scope: Construct, id: string, props: DocumentManagementApiProps) {
    super(scope, id);

    const getDocumentsFunction = new cdk.aws_lambda_nodejs.NodejsFunction(
      this,
      'GetDocumentsFunction',
      {
        runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
        handler: 'getDocuments',
        memorySize: 256,
        architecture: cdk.aws_lambda.Architecture.X86_64,
        timeout: cdk.Duration.minutes(5),
        tracing: cdk.aws_lambda.Tracing.ACTIVE,
        entry: path.join(__dirname, '..', 'api', 'getDocuments', 'index.ts'),
        environment: {
          DOCUMENTS_BUCKET_NAME: props.documentBucket.bucketName,
        },
        // layers: [lambdaAdapterLayer],
        // role: lambdaRole, // user-provided role
        bundling: {
          externalModules: [
            '@aws-sdk/*', // Use the AWS SDK for JS v3 available in the Lambda runtime
            'cool-module', // 'cool-module' is already available in a Layer
          ],
        },
      }
    );

    const bucketPermissions = new cdk.aws_iam.PolicyStatement();
    bucketPermissions.addResources(`${props.documentBucket.bucketArn}/*`);
    bucketPermissions.addActions('s3:GetObject', 's3:PutObject');
    getDocumentsFunction.addToRolePolicy(bucketPermissions);

    const bucketContainerPermissions = new cdk.aws_iam.PolicyStatement();
    bucketContainerPermissions.addResources(props.documentBucket.bucketArn);
    bucketContainerPermissions.addActions('s3:ListBucket');
    getDocumentsFunction.addToRolePolicy(bucketContainerPermissions);
  }
}

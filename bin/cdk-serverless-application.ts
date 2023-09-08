#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkServerlessApplicationStack } from '../lib/cdk-serverless-application-stack';
import { PipelineStack } from '../lib/cdk-serverless-app-pipeline-stack';
import { NextjsLamdbaStack } from '../lib/cdk-nextjsapp-stack';
import { Construct } from 'constructs';

const app = new cdk.App();
// new CdkServerlessApplicationStack(app, 'CdkServerlessApplicationStack', {
//   /* If you don't specify 'env', this stack will be environment-agnostic.
//    * Account/Region-dependent features and context lookups will not work,
//    * but a single synthesized template can be deployed anywhere. */

//   /* Uncomment the next line to specialize this stack for the AWS Account
//    * and Region that are implied by the current CLI configuration. */
//   // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

//   /* Uncomment the next line if you know exactly what Account and Region you
//    * want to deploy the stack to. */
//   // env: { account: '123456789012', region: 'us-east-1' },

//   /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */

//   tags: {
//     environment: 'dev',
//     category: 'ecommerce',
//     tech: 'cdk',
//     repo: 'cdk-serverless-application',
//     product_owner: 'ivan.arteaga',
//   },
// });

const delivery = new PipelineStack(app, 'Frontend-DeliveryPipeline', {
  name: 'Frontend-DeliveryPipeline',
  env: {
    // account: '12345678910',
    region: 'eu-west-1',
  },
});

export interface AppStageProps extends cdk.StageProps {
  name: string;
}
export class AppStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props?: AppStageProps) {
    super(scope, id, props);

    new CdkServerlessApplicationStack(this, 'CdkServerlessApplicationStack', {
      tags: {
        environment: 'dev',
        category: 'ecommerce',
        tech: 'cdk',
        repo: 'cdk-serverless-application',
        product_owner: 'ivan.arteaga',
      },
    });

    new NextjsLamdbaStack(this, 'NextjsLamdbaStack', {
      tags: {
        environment: 'dev',
        category: 'ecommerce',
        tech: 'cdk',
        repo: 'cdk-serverless-application',
        product_owner: 'ivan.arteaga',
      },
    });
  }
}

delivery.pipeline.addStage(
  new AppStage(app, 'App', {
    name: 'deploy-app',
    env: {
      // account: '5555557759',
      region: 'eu-west-1',
    },
  })
);

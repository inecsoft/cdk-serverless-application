#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { pythonLambdaCdkStack } from '../lib/lambda-from-image-python';
import { PipelineStack } from '../lib/cdk-serverless-app-pipeline-stack';

const app = new cdk.App();

const delivery = new PipelineStack(app, 'python-DeliveryPipeline', {
  name: 'python-DeliveryPipeline',
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

    new pythonLambdaCdkStack(this, 'pythonLambdaCdkStack', {
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
    name: 'deploy-python-app',
    env: {
      // account: '5555557759',
      region: 'eu-west-1',
    },
  })
);

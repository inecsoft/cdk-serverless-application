#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NextjsLambdaCdkStack } from '../lib/nextjs-lambda-cdk-stack';
import { PipelineStack } from '../lib/cdk-serverless-app-pipeline-stack';

const app = new cdk.App();

const delivery = new PipelineStack(app, 'nextjs-DeliveryPipeline', {
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

    new NextjsLambdaCdkStack(this, 'NextjsLambdaCdkStack', {
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
    name: 'deploy-nextjs-app',
  })
);

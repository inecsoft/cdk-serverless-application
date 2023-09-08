import * as cdk from 'aws-cdk-lib';
import * as pipelines from 'aws-cdk-lib/pipelines';
import { Construct } from 'constructs';

export interface PipelineStackProps extends cdk.StackProps {
  name: string;
}

export class PipelineStack extends cdk.Stack {
  public readonly pipeline: pipelines.CodePipeline;

  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const sourcegithubpat = pipelines.CodePipelineSource.gitHub(
      'inecsoft/cdk-serverless-application',
      'nextjs-app',
      {
        // This is optional
        authentication: cdk.SecretValue.secretsManager('dev/pat'),
      }
    );

    const sourcegithubconnection = pipelines.CodePipelineSource.connection(
      'inecsoft/cdk-serverless-application',
      'cdk-serverless-app',
      {
        connectionArn: 'REPLACE_WITH_CONNECTION_ARN',
      }
    );

    this.pipeline = new pipelines.CodePipeline(this, 'Pipeline', {
      synth: new pipelines.ShellStep('synth', {
        input: sourcegithubpat,
        commands: [
          'npm ci',
          'cd app',
          'npm ci',
          'npm run build',
          'cd ..',
          'npx cdk synth',
          'echo {SourceVariables.BranchName}',
        ],
      }),
      crossAccountKeys: true,
      dockerEnabledForSynth: true,
    });
  }
}

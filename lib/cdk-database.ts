import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class AppDatabase extends Construct {
  public readonly documentsTable: cdk.aws_dynamodb.ITable;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const documentsTable = new cdk.aws_dynamodb.Table(this, 'DocumentsTable', {
      billingMode: cdk.aws_dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'PK',
        type: cdk.aws_dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: cdk.aws_dynamodb.AttributeType.STRING,
      },
    });

    this.documentsTable = documentsTable;
  }
}

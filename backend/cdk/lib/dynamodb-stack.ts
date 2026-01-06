import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class DynamoDBStack extends cdk.Stack {
  public readonly connectionsTable: dynamodb.Table;
  public readonly conversationsTable: dynamodb.Table;
  public readonly fileAttachmentsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.connectionsTable = new dynamodb.Table(this, 'ConnectionsTable', {
      tableName: 'pltw-connections',
      partitionKey: { name: 'connectionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl',
    });

    this.conversationsTable = new dynamodb.Table(this, 'ConversationsTable', {
      tableName: 'pltw-conversations',
      partitionKey: { name: 'conversationId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    this.conversationsTable.addGlobalSecondaryIndex({
      indexName: 'UserIdIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'startTime', type: dynamodb.AttributeType.NUMBER },
    });

    this.fileAttachmentsTable = new dynamodb.Table(this, 'FileAttachmentsTable', {
      tableName: 'pltw-file-attachments',
      partitionKey: { name: 'fileId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl',
    });

    this.fileAttachmentsTable.addGlobalSecondaryIndex({
      indexName: 'ConversationIdIndex',
      partitionKey: { name: 'conversationId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'uploadedAt', type: dynamodb.AttributeType.NUMBER },
    });

    new cdk.CfnOutput(this, 'ConnectionsTableName', {
      value: this.connectionsTable.tableName,
      exportName: 'ConnectionsTableName',
    });

    new cdk.CfnOutput(this, 'ConversationsTableName', {
      value: this.conversationsTable.tableName,
      exportName: 'ConversationsTableName',
    });

    new cdk.CfnOutput(this, 'FileAttachmentsTableName', {
      value: this.fileAttachmentsTable.tableName,
      exportName: 'FileAttachmentsTableName',
    });
  }
}

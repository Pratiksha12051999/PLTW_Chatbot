import * as cdk from 'aws-cdk-lib';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { WebSocketLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Construct } from 'constructs';
import * as path from 'path';

interface WebSocketStackProps extends cdk.StackProps {
  connectionsTable: dynamodb.Table;
  conversationsTable: dynamodb.Table;
  fileAttachmentsTable: dynamodb.Table;
  uploadsBucket: s3.IBucket;
}

export class WebSocketStack extends cdk.Stack {
  public readonly webSocketApi: apigatewayv2.WebSocketApi;
  public readonly webSocketStage: apigatewayv2.WebSocketStage;

  constructor(scope: Construct, id: string, props: WebSocketStackProps) {
    super(scope, id, props);

    const { connectionsTable, conversationsTable, fileAttachmentsTable, uploadsBucket } = props;

    // Path to BUNDLED Lambda code - FIXED PATH
    const lambdaCodePath = path.join(__dirname, '../../lambda-bundle');

    // Connect Handler
    const connectHandler = new lambda.Function(this, 'ConnectHandlerV2', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'connect.handler',
      code: lambda.Code.fromAsset(lambdaCodePath),
      timeout: cdk.Duration.seconds(10),
      environment: {
        CONNECTIONS_TABLE: connectionsTable.tableName,
      },
    });

    // Disconnect Handler
    const disconnectHandler = new lambda.Function(this, 'DisconnectHandlerV2', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'disconnect.handler',
      code: lambda.Code.fromAsset(lambdaCodePath),
      timeout: cdk.Duration.seconds(10),
      environment: {
        CONNECTIONS_TABLE: connectionsTable.tableName,
      },
    });

    // Send Message Handler
    const sendMessageHandler = new lambda.Function(this, 'SendMessageHandlerV2', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'sendMessage.handler',
      code: lambda.Code.fromAsset(lambdaCodePath),
      timeout: cdk.Duration.seconds(29),
      memorySize: 1024,
      environment: {
        CONNECTIONS_TABLE: connectionsTable.tableName,
        CONVERSATIONS_TABLE: conversationsTable.tableName,
        FILE_ATTACHMENTS_TABLE: fileAttachmentsTable.tableName,
        UPLOADS_BUCKET: uploadsBucket.bucketName,
        BEDROCK_AGENT_ID: process.env.BEDROCK_AGENT_ID || '',
        BEDROCK_AGENT_ALIAS_ID: process.env.BEDROCK_AGENT_ALIAS_ID || '',
      },
    });

    // Grant DynamoDB permissions
    connectionsTable.grantReadWriteData(connectHandler);
    connectionsTable.grantReadWriteData(disconnectHandler);
    connectionsTable.grantReadWriteData(sendMessageHandler);
    conversationsTable.grantReadWriteData(sendMessageHandler);
    fileAttachmentsTable.grantReadData(sendMessageHandler);

    // Grant S3 permissions for sendMessageHandler (read access for file metadata)
    uploadsBucket.grantRead(sendMessageHandler);

    // Bedrock permissions for sendMessageHandler
    sendMessageHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'bedrock:InvokeAgent',
          'bedrock:InvokeModel',
          'bedrock:InvokeModelWithResponseStream',
          'bedrock:Retrieve',
          'bedrock:RetrieveAndGenerate'
        ],
        resources: ['*'],
      })
    );

    // Create WebSocket API
    this.webSocketApi = new apigatewayv2.WebSocketApi(this, 'PLTWWebSocketApi', {
      apiName: 'pltw-chatbot-websocket-api',
      description: 'WebSocket API for PLTW Chatbot',
      connectRouteOptions: {
        integration: new WebSocketLambdaIntegration('ConnectIntegration', connectHandler),
      },
      disconnectRouteOptions: {
        integration: new WebSocketLambdaIntegration('DisconnectIntegration', disconnectHandler),
      },
      defaultRouteOptions: {
        integration: new WebSocketLambdaIntegration('SendMessageIntegration', sendMessageHandler),
      },
    });

    // Create WebSocket Stage
    this.webSocketStage = new apigatewayv2.WebSocketStage(this, 'ProductionStage', {
      webSocketApi: this.webSocketApi,
      stageName: 'prod',
      autoDeploy: true,
    });

    // WebSocket permissions for sendMessageHandler
    sendMessageHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['execute-api:ManageConnections'],
        resources: [
          `arn:aws:execute-api:${this.region}:${this.account}:${this.webSocketApi.apiId}/*`,
        ],
      })
    );

    // Outputs
    new cdk.CfnOutput(this, 'WebSocketURL', {
      value: this.webSocketStage.url,
      description: 'WebSocket API URL',
      exportName: 'WebSocketURL',
    });

    new cdk.CfnOutput(this, 'WebSocketApiId', {
      value: this.webSocketApi.apiId,
      exportName: 'WebSocketApiId',
    });
  }
}
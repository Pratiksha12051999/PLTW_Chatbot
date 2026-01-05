import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import * as path from 'path';

interface RestApiStackProps extends cdk.StackProps {
  conversationsTable: dynamodb.Table;
}

export class RestApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: RestApiStackProps) {
    super(scope, id, props);

    const { conversationsTable } = props;

    // Admin metrics handler
    const metricsHandler = new lambda.Function(this, 'MetricsHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'admin.getMetrics',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../dist/handlers/rest')),
      timeout: cdk.Duration.seconds(30),
      environment: {
        CONVERSATIONS_TABLE: conversationsTable.tableName,
      },
    });

    // Conversations handler
    const conversationsHandler = new lambda.Function(this, 'ConversationsHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'admin.getConversations',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../dist/handlers/rest')),
      timeout: cdk.Duration.seconds(30),
      environment: {
        CONVERSATIONS_TABLE: conversationsTable.tableName,
      },
    });

    // Feedback handler
    const feedbackHandler = new lambda.Function(this, 'FeedbackHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'feedback.submitFeedback',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../dist/handlers/rest')),
      timeout: cdk.Duration.seconds(10),
      environment: {
        CONVERSATIONS_TABLE: conversationsTable.tableName,
      },
    });

    // Grant DynamoDB permissions
    conversationsTable.grantReadData(metricsHandler);
    conversationsTable.grantReadData(conversationsHandler);
    conversationsTable.grantReadWriteData(feedbackHandler);

    // Create REST API
    this.api = new apigateway.RestApi(this, 'PLTWRestApi', {
      restApiName: 'pltw-chatbot-rest-api',
      description: 'REST API for PLTW Chatbot Admin',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // Admin endpoints
    const admin = this.api.root.addResource('admin');
    const metrics = admin.addResource('metrics');
    metrics.addMethod('GET', new apigateway.LambdaIntegration(metricsHandler));

    const conversations = admin.addResource('conversations');
    conversations.addMethod('GET', new apigateway.LambdaIntegration(conversationsHandler));

    // Feedback endpoint
    const feedback = this.api.root.addResource('feedback');
    feedback.addMethod('POST', new apigateway.LambdaIntegration(feedbackHandler));

    // Outputs
    new cdk.CfnOutput(this, 'RestApiUrl', {
      value: this.api.url,
      description: 'REST API URL',
      exportName: 'RestApiUrl',
    });
  }
}

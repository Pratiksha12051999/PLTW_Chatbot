import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

interface RestApiStackProps extends cdk.StackProps {
  conversationsTable: dynamodb.Table;
  userPool: cognito.IUserPool;
}

export class RestApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: RestApiStackProps) {
    super(scope, id, props);

    const { conversationsTable, userPool } = props;

    // 1. Admin Handler - handles /admin/metrics and /admin/conversations
    const adminHandler = new lambda.Function(this, 'AdminHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'admin.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-bundle')),
      timeout: cdk.Duration.seconds(30),
      environment: {
        CONVERSATIONS_TABLE: conversationsTable.tableName,
      },
    });

    // 2. Feedback Handler - handles /feedback
    const feedbackHandler = new lambda.Function(this, 'FeedbackHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'feedback.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-bundle')),
      timeout: cdk.Duration.seconds(10),
      environment: {
        CONVERSATIONS_TABLE: conversationsTable.tableName,
      },
    });

    // 3. Sentiment Handler - handles sentiment analysis for conversations
    const sentimentHandler = new lambda.Function(this, 'SentimentHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'sentiment.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-bundle')),
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
      environment: {
        CONVERSATIONS_TABLE: conversationsTable.tableName,
        NOVA_PRO_MODEL_ID: 'amazon.nova-pro-v1:0',
      },
    });

    // ============================================
    // PERMISSIONS
    // ============================================

    // Admin handler - read access to conversations table
    conversationsTable.grantReadData(adminHandler);

    // Feedback handler - read/write access to conversations table
    conversationsTable.grantReadWriteData(feedbackHandler);

    // Sentiment handler - read/write access to conversations table + Bedrock
    conversationsTable.grantReadWriteData(sentimentHandler);
    sentimentHandler.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['bedrock:InvokeModel'],
      resources: ['arn:aws:bedrock:*::foundation-model/amazon.nova-pro-v1:0'],
    }));

    // ============================================
    // EVENTBRIDGE RULE - Trigger sentiment analysis every 5 minutes
    // ============================================

    const sentimentRule = new events.Rule(this, 'SentimentAnalysisRule', {
      ruleName: 'pltw-sentiment-analysis-schedule',
      description: 'Triggers sentiment analysis for inactive conversations every 5 minutes',
      schedule: events.Schedule.rate(cdk.Duration.minutes(5)),
    });

    sentimentRule.addTarget(new targets.LambdaFunction(sentimentHandler));

    // ============================================
    // REST API
    // ============================================

    this.api = new apigateway.RestApi(this, 'PLTWRestApi', {
      restApiName: 'pltw-chatbot-rest-api',
      description: 'REST API for PLTW Chatbot Admin',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // Create Cognito authorizer for admin endpoints
    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'AdminAuthorizer', {
      cognitoUserPools: [userPool],
      authorizerName: 'AdminCognitoAuthorizer',
      identitySource: 'method.request.header.Authorization',
    });

    // Lambda integrations
    const adminIntegration = new apigateway.LambdaIntegration(adminHandler);
    const feedbackIntegration = new apigateway.LambdaIntegration(feedbackHandler);

    // ============================================
    // ADMIN ENDPOINTS (protected by Cognito)
    // ============================================

    const admin = this.api.root.addResource('admin');
    
    // GET /admin/metrics
    const metrics = admin.addResource('metrics');
    metrics.addMethod('GET', adminIntegration, {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // GET /admin/conversations
    const conversations = admin.addResource('conversations');
    conversations.addMethod('GET', adminIntegration, {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // ============================================
    // FEEDBACK ENDPOINT (public)
    // ============================================

    const feedback = this.api.root.addResource('feedback');
    feedback.addMethod('POST', feedbackIntegration);

    // ============================================
    // OUTPUTS
    // ============================================

    new cdk.CfnOutput(this, 'RestApiUrl', {
      value: this.api.url,
      description: 'REST API URL',
      exportName: 'RestApiUrl',
    });
  }
}

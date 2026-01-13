import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import * as path from 'path';

interface RestApiStackProps extends cdk.StackProps {
  conversationsTable: dynamodb.Table;
  fileAttachmentsTable: dynamodb.Table;
  uploadsBucket: s3.IBucket;
  userPool: cognito.IUserPool;
}

export class RestApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: RestApiStackProps) {
    super(scope, id, props);

    const { conversationsTable, fileAttachmentsTable, uploadsBucket, userPool } = props;

    // ============================================
    // CONSOLIDATED LAMBDA FUNCTIONS (3 total)
    // ============================================

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

    // 2. Upload Handler - handles /upload/*
    const uploadHandler = new lambda.Function(this, 'UploadHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'upload.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-bundle')),
      timeout: cdk.Duration.seconds(10),
      environment: {
        FILE_ATTACHMENTS_TABLE: fileAttachmentsTable.tableName,
        UPLOADS_BUCKET: uploadsBucket.bucketName,
      },
    });

    // 3. Feedback Handler - handles /feedback
    const feedbackHandler = new lambda.Function(this, 'FeedbackHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'feedback.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-bundle')),
      timeout: cdk.Duration.seconds(10),
      environment: {
        CONVERSATIONS_TABLE: conversationsTable.tableName,
      },
    });

    // ============================================
    // PERMISSIONS
    // ============================================

    // Admin handler - read access to conversations table
    conversationsTable.grantReadData(adminHandler);

    // Feedback handler - read/write access to conversations table
    conversationsTable.grantReadWriteData(feedbackHandler);

    // Upload handler - S3 and DynamoDB permissions
    uploadsBucket.grantPut(uploadHandler);
    uploadsBucket.grantRead(uploadHandler);
    fileAttachmentsTable.grantReadWriteData(uploadHandler);

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
    const uploadIntegration = new apigateway.LambdaIntegration(uploadHandler);
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
    // UPLOAD ENDPOINTS (public)
    // ============================================

    const upload = this.api.root.addResource('upload');
    
    // POST /upload/presign
    const presign = upload.addResource('presign');
    presign.addMethod('POST', uploadIntegration);

    // POST /upload/confirm
    const confirm = upload.addResource('confirm');
    confirm.addMethod('POST', uploadIntegration);

    // GET /upload/download/{fileId}
    const download = upload.addResource('download');
    const downloadFile = download.addResource('{fileId}');
    downloadFile.addMethod('GET', uploadIntegration);

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

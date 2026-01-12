import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import * as path from 'path';

interface RestApiStackProps extends cdk.StackProps {
  conversationsTable: dynamodb.Table;
  fileAttachmentsTable: dynamodb.Table;
  uploadsBucket: s3.IBucket;
}

export class RestApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: RestApiStackProps) {
    super(scope, id, props);

    const { conversationsTable, fileAttachmentsTable, uploadsBucket } = props;

    // Admin metrics handler
    const metricsHandler = new lambda.Function(this, 'MetricsHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'admin.getMetrics',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-bundle')),
      timeout: cdk.Duration.seconds(30),
      environment: {
        CONVERSATIONS_TABLE: conversationsTable.tableName,
      },
    });

    // Conversations handler
    const conversationsHandler = new lambda.Function(this, 'ConversationsHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'admin.getConversations',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-bundle')),
      timeout: cdk.Duration.seconds(30),
      environment: {
        CONVERSATIONS_TABLE: conversationsTable.tableName,
      },
    });

    // Feedback handler
    const feedbackHandler = new lambda.Function(this, 'FeedbackHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'feedback.submitFeedback',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-bundle')),
      timeout: cdk.Duration.seconds(10),
      environment: {
        CONVERSATIONS_TABLE: conversationsTable.tableName,
      },
    });

    // Grant DynamoDB permissions
    conversationsTable.grantReadData(metricsHandler);
    conversationsTable.grantReadData(conversationsHandler);
    conversationsTable.grantReadWriteData(feedbackHandler);

    // Upload presign handler - POST /upload/presign
    const presignUploadHandler = new lambda.Function(this, 'PresignUploadHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'upload.presignUpload',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-bundle')),
      timeout: cdk.Duration.seconds(10),
      environment: {
        FILE_ATTACHMENTS_TABLE: fileAttachmentsTable.tableName,
        UPLOADS_BUCKET: uploadsBucket.bucketName,
      },
    });

    // Upload confirm handler - POST /upload/confirm
    const confirmUploadHandler = new lambda.Function(this, 'ConfirmUploadHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'upload.confirmUpload',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-bundle')),
      timeout: cdk.Duration.seconds(10),
      environment: {
        FILE_ATTACHMENTS_TABLE: fileAttachmentsTable.tableName,
        UPLOADS_BUCKET: uploadsBucket.bucketName,
      },
    });

    // Download URL handler - GET /upload/download/{fileId}
    const downloadUrlHandler = new lambda.Function(this, 'DownloadUrlHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'upload.getDownloadUrl',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-bundle')),
      timeout: cdk.Duration.seconds(10),
      environment: {
        FILE_ATTACHMENTS_TABLE: fileAttachmentsTable.tableName,
        UPLOADS_BUCKET: uploadsBucket.bucketName,
      },
    });

    // Citation URL handler - POST /citation/url
    const citationUrlHandler = new lambda.Function(this, 'CitationUrlHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'upload.getCitationUrl',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-bundle')),
      timeout: cdk.Duration.seconds(10),
      environment: {
        FILE_ATTACHMENTS_TABLE: fileAttachmentsTable.tableName,
        UPLOADS_BUCKET: uploadsBucket.bucketName,
      },
    });

    // Grant S3 permissions (PutObject, GetObject) to upload handlers
    uploadsBucket.grantPut(presignUploadHandler);
    uploadsBucket.grantRead(downloadUrlHandler);
    // Presign handler needs GetObject for generating presigned URLs
    uploadsBucket.grantRead(presignUploadHandler);

    // Citation handler needs broad S3 read access for knowledge base buckets
    citationUrlHandler.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: ['arn:aws:s3:::*/*'],  // Access to any S3 bucket for citations
    }));

    // Grant DynamoDB permissions for file attachments table
    fileAttachmentsTable.grantReadWriteData(presignUploadHandler);
    fileAttachmentsTable.grantReadWriteData(confirmUploadHandler);
    fileAttachmentsTable.grantReadData(downloadUrlHandler);

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

    // Upload endpoints
    const upload = this.api.root.addResource('upload');
    
    // POST /upload/presign - Generate presigned URL for upload
    const presign = upload.addResource('presign');
    presign.addMethod('POST', new apigateway.LambdaIntegration(presignUploadHandler));

    // POST /upload/confirm - Confirm upload completion
    const confirm = upload.addResource('confirm');
    confirm.addMethod('POST', new apigateway.LambdaIntegration(confirmUploadHandler));

    // GET /upload/download/{fileId} - Get download URL
    const download = upload.addResource('download');
    const downloadFile = download.addResource('{fileId}');
    downloadFile.addMethod('GET', new apigateway.LambdaIntegration(downloadUrlHandler));

    // Citation endpoint
    const citation = this.api.root.addResource('citation');
    
    // POST /citation/url - Get presigned URL for citation source
    const citationUrl = citation.addResource('url');
    citationUrl.addMethod('POST', new apigateway.LambdaIntegration(citationUrlHandler));

    // Outputs
    new cdk.CfnOutput(this, 'RestApiUrl', {
      value: this.api.url,
      description: 'REST API URL',
      exportName: 'RestApiUrl',
    });
  }
}

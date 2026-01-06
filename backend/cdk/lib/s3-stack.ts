import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class S3Stack extends cdk.Stack {
  public readonly uploadsBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create S3 bucket for file uploads
    this.uploadsBucket = new s3.Bucket(this, 'UploadsBucket', {
      bucketName: `pltw-chatbot-uploads-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
      
      // Server-side encryption (AES-256) - Requirement 1.1
      encryption: s3.BucketEncryption.S3_MANAGED,
      
      // Block all public access - Requirement 1.2
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      
      // Enforce SSL for all requests
      enforceSSL: true,
      
      // Removal policy for development (change to RETAIN for production)
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      
      // CORS configuration for frontend origin - Requirement 1.3
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
          ],
          allowedOrigins: ['*'], // In production, restrict to specific frontend origin
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3000,
        },
      ],
      
      // Lifecycle rules for pending file cleanup (24h TTL)
      lifecycleRules: [
        {
          id: 'CleanupPendingUploads',
          enabled: true,
          expiration: cdk.Duration.days(1),
          prefix: 'uploads/',
          tagFilters: {
            status: 'pending',
          },
        },
      ],
    });

    // Outputs
    new cdk.CfnOutput(this, 'UploadsBucketName', {
      value: this.uploadsBucket.bucketName,
      description: 'S3 Uploads Bucket Name',
      exportName: 'UploadsBucketName',
    });

    new cdk.CfnOutput(this, 'UploadsBucketArn', {
      value: this.uploadsBucket.bucketArn,
      description: 'S3 Uploads Bucket ARN',
      exportName: 'UploadsBucketArn',
    });
  }
}

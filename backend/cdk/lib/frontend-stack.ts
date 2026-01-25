import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import { Construct } from "constructs";

export class FrontendStack extends cdk.Stack {
  public readonly frontendBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly frontendUrl: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 Bucket for Frontend
    this.frontendBucket = new s3.Bucket(this, "FrontendBucket", {
      bucketName: `pltw-chatbot-frontend-${this.account}`,
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "index.html",
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
        },
      ],
    });

    // CloudFront Origin Access Identity
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      "OriginAccessIdentity",
      {
        comment: "Access identity for PLTW Chatbot Frontend",
      },
    );

    // Grant CloudFront access to S3 bucket
    this.frontendBucket.grantRead(originAccessIdentity);

    // CloudFront Function for Next.js static export routing
    const urlRewriteFunction = new cloudfront.Function(
      this,
      "UrlRewriteFunction",
      {
        code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  
  // If URI is root, serve index.html
  if (uri === '/' || uri === '') {
    request.uri = '/index.html';
    return request;
  }
  
  // If URI ends with /, append index.html
  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
    return request;
  }
  
  // If URI has no extension, try to serve it as a directory with index.html
  if (!uri.includes('.')) {
    request.uri = uri + '/index.html';
  }
  
  return request;
}
      `),
        comment: "URL rewrite function for Next.js static export",
      },
    );

    // CloudFront Distribution
    this.distribution = new cloudfront.Distribution(
      this,
      "FrontendDistribution",
      {
        defaultBehavior: {
          origin: origins.S3BucketOrigin.withOriginAccessIdentity(
            this.frontendBucket,
            {
              originAccessIdentity,
            },
          ),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          compress: true,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          functionAssociations: [
            {
              function: urlRewriteFunction,
              eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
            },
          ],
        },
        defaultRootObject: "index.html",
        // REMOVED aggressive error responses that redirect everything to /index.html
        // Only handle true 404s for missing files
        errorResponses: [
          {
            httpStatus: 403,
            responseHttpStatus: 404,
            responsePagePath: "/404.html",
            ttl: cdk.Duration.seconds(10),
          },
        ],
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
        comment: "PLTW Chatbot Frontend Distribution",
      },
    );

    this.frontendUrl = `https://${this.distribution.distributionDomainName}`;

    // Outputs
    new cdk.CfnOutput(this, "FrontendBucketName", {
      value: this.frontendBucket.bucketName,
      description: "Frontend S3 Bucket Name",
    });

    new cdk.CfnOutput(this, "CloudFrontDistributionId", {
      value: this.distribution.distributionId,
      description: "CloudFront Distribution ID",
    });

    new cdk.CfnOutput(this, "FrontendUrl", {
      value: this.frontendUrl,
      description: "Frontend CloudFront URL",
    });
  }
}

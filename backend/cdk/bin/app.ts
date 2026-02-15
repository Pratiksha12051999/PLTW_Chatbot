#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { DynamoDBStack } from "../lib/dynamodb-stack";
import { WebSocketStack } from "../lib/websocket-stack";
import { RestApiStack } from "../lib/rest-api-stack";
import { CognitoStack } from "../lib/cognito-stack";
import { AmplifyStack } from "../lib/amplify-stack";
import { SQSStack } from "../lib/sqs-stack";
import { FrontendStack } from "../lib/frontend-stack";

const app = new cdk.App();

// Get context variables for Amplify (optional)
const githubToken = app.node.tryGetContext("githubToken");
const githubOwner = app.node.tryGetContext("githubOwner");
const githubRepo = app.node.tryGetContext("githubRepo");
const branches = app.node.tryGetContext("branches")?.split(",") || ["main"];

// DynamoDB Stack
const dynamoDBStack = new DynamoDBStack(app, "PLTWChatbotDynamoDBStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

// Cognito Stack
const cognitoStack = new CognitoStack(app, "CognitoStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

// SQS Stack
const sqsStack = new SQSStack(app, "SQSStack", {
  conversationsTable: dynamoDBStack.conversationsTable,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

// Frontend Stack (S3 + CloudFront) - Create this first to get the URL
const frontendStack = new FrontendStack(app, "FrontendStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

// WebSocket Stack
const webSocketStack = new WebSocketStack(app, "WebSocketStack", {
  conversationsTable: dynamoDBStack.conversationsTable,
  connectionsTable: dynamoDBStack.connectionsTable,
  escalationQueue: sqsStack.escalationQueue,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

// REST API Stack - Now pass the frontend URL for CORS
const restApiStack = new RestApiStack(app, "RestApiStack", {
  conversationsTable: dynamoDBStack.conversationsTable,
  userPool: cognitoStack.userPool,
  frontendUrl: frontendStack.frontendUrl, // ← SECURITY: Pass CloudFront URL for CORS
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

// Stack dependencies
webSocketStack.addDependency(dynamoDBStack);
restApiStack.addDependency(dynamoDBStack);
restApiStack.addDependency(cognitoStack);
webSocketStack.addDependency(sqsStack);
restApiStack.addDependency(sqsStack);
sqsStack.addDependency(dynamoDBStack);

// Amplify Stack (only if GitHub credentials provided)
if (githubToken && githubOwner && githubRepo) {
  const amplifyStack = new AmplifyStack(app, "AmplifyStack", {
    githubToken,
    githubOwner,
    githubRepo,
    branches,
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
  });

  amplifyStack.addDependency(webSocketStack);
  amplifyStack.addDependency(restApiStack);
}

#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DynamoDBStack } from '../lib/dynamodb-stack';
import { WebSocketStack } from '../lib/websocket-stack';
import { RestApiStack } from '../lib/rest-api-stack';
import { CognitoStack } from '../lib/cognito-stack';

const app = new cdk.App();

// DynamoDB Stack
const dynamoDBStack = new DynamoDBStack(app, 'DynamoDBStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

// Cognito Stack
const cognitoStack = new CognitoStack(app, 'CognitoStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

// WebSocket Stack
const webSocketStack = new WebSocketStack(app, 'WebSocketStack', {
  conversationsTable: dynamoDBStack.conversationsTable,
  connectionsTable: dynamoDBStack.connectionsTable,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

// REST API Stack
const restApiStack = new RestApiStack(app, 'RestApiStack', {
  conversationsTable: dynamoDBStack.conversationsTable,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

webSocketStack.addDependency(dynamoDBStack);
restApiStack.addDependency(dynamoDBStack);
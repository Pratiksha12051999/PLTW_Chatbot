#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const cdk = __importStar(require("aws-cdk-lib"));
const dynamodb_stack_1 = require("../lib/dynamodb-stack");
const websocket_stack_1 = require("../lib/websocket-stack");
const rest_api_stack_1 = require("../lib/rest-api-stack");
const cognito_stack_1 = require("../lib/cognito-stack");
const s3_stack_1 = require("../lib/s3-stack");
const app = new cdk.App();
// DynamoDB Stack
const dynamoDBStack = new dynamodb_stack_1.DynamoDBStack(app, 'PLTWChatbotDynamoDBStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
});
// Cognito Stack
const cognitoStack = new cognito_stack_1.CognitoStack(app, 'CognitoStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
});
// S3 Stack for file uploads
const s3Stack = new s3_stack_1.S3Stack(app, 'S3Stack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
});
// WebSocket Stack
const webSocketStack = new websocket_stack_1.WebSocketStack(app, 'WebSocketStack', {
    conversationsTable: dynamoDBStack.conversationsTable,
    connectionsTable: dynamoDBStack.connectionsTable,
    fileAttachmentsTable: dynamoDBStack.fileAttachmentsTable,
    uploadsBucket: s3Stack.uploadsBucket,
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
});
// REST API Stack
const restApiStack = new rest_api_stack_1.RestApiStack(app, 'RestApiStack', {
    conversationsTable: dynamoDBStack.conversationsTable,
    fileAttachmentsTable: dynamoDBStack.fileAttachmentsTable,
    uploadsBucket: s3Stack.uploadsBucket,
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
});
webSocketStack.addDependency(dynamoDBStack);
webSocketStack.addDependency(s3Stack);
restApiStack.addDependency(dynamoDBStack);
restApiStack.addDependency(s3Stack);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHVDQUFxQztBQUNyQyxpREFBbUM7QUFDbkMsMERBQXNEO0FBQ3RELDREQUF3RDtBQUN4RCwwREFBcUQ7QUFDckQsd0RBQW9EO0FBQ3BELDhDQUEwQztBQUUxQyxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUUxQixpQkFBaUI7QUFDakIsTUFBTSxhQUFhLEdBQUcsSUFBSSw4QkFBYSxDQUFDLEdBQUcsRUFBRSwwQkFBMEIsRUFBRTtJQUN2RSxHQUFHLEVBQUU7UUFDSCxPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUI7UUFDeEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCO0tBQ3ZDO0NBQ0YsQ0FBQyxDQUFDO0FBRUgsZ0JBQWdCO0FBQ2hCLE1BQU0sWUFBWSxHQUFHLElBQUksNEJBQVksQ0FBQyxHQUFHLEVBQUUsY0FBYyxFQUFFO0lBQ3pELEdBQUcsRUFBRTtRQUNILE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQjtRQUN4QyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0I7S0FDdkM7Q0FDRixDQUFDLENBQUM7QUFFSCw0QkFBNEI7QUFDNUIsTUFBTSxPQUFPLEdBQUcsSUFBSSxrQkFBTyxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUU7SUFDMUMsR0FBRyxFQUFFO1FBQ0gsT0FBTyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CO1FBQ3hDLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQjtLQUN2QztDQUNGLENBQUMsQ0FBQztBQUVILGtCQUFrQjtBQUNsQixNQUFNLGNBQWMsR0FBRyxJQUFJLGdDQUFjLENBQUMsR0FBRyxFQUFFLGdCQUFnQixFQUFFO0lBQy9ELGtCQUFrQixFQUFFLGFBQWEsQ0FBQyxrQkFBa0I7SUFDcEQsZ0JBQWdCLEVBQUUsYUFBYSxDQUFDLGdCQUFnQjtJQUNoRCxvQkFBb0IsRUFBRSxhQUFhLENBQUMsb0JBQW9CO0lBQ3hELGFBQWEsRUFBRSxPQUFPLENBQUMsYUFBYTtJQUNwQyxHQUFHLEVBQUU7UUFDSCxPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUI7UUFDeEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCO0tBQ3ZDO0NBQ0YsQ0FBQyxDQUFDO0FBRUgsaUJBQWlCO0FBQ2pCLE1BQU0sWUFBWSxHQUFHLElBQUksNkJBQVksQ0FBQyxHQUFHLEVBQUUsY0FBYyxFQUFFO0lBQ3pELGtCQUFrQixFQUFFLGFBQWEsQ0FBQyxrQkFBa0I7SUFDcEQsb0JBQW9CLEVBQUUsYUFBYSxDQUFDLG9CQUFvQjtJQUN4RCxhQUFhLEVBQUUsT0FBTyxDQUFDLGFBQWE7SUFDcEMsR0FBRyxFQUFFO1FBQ0gsT0FBTyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CO1FBQ3hDLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQjtLQUN2QztDQUNGLENBQUMsQ0FBQztBQUVILGNBQWMsQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDNUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN0QyxZQUFZLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQzFDLFlBQVksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG5pbXBvcnQgJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3Rlcic7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgRHluYW1vREJTdGFjayB9IGZyb20gJy4uL2xpYi9keW5hbW9kYi1zdGFjayc7XG5pbXBvcnQgeyBXZWJTb2NrZXRTdGFjayB9IGZyb20gJy4uL2xpYi93ZWJzb2NrZXQtc3RhY2snO1xuaW1wb3J0IHsgUmVzdEFwaVN0YWNrIH0gZnJvbSAnLi4vbGliL3Jlc3QtYXBpLXN0YWNrJztcbmltcG9ydCB7IENvZ25pdG9TdGFjayB9IGZyb20gJy4uL2xpYi9jb2duaXRvLXN0YWNrJztcbmltcG9ydCB7IFMzU3RhY2sgfSBmcm9tICcuLi9saWIvczMtc3RhY2snO1xuXG5jb25zdCBhcHAgPSBuZXcgY2RrLkFwcCgpO1xuXG4vLyBEeW5hbW9EQiBTdGFja1xuY29uc3QgZHluYW1vREJTdGFjayA9IG5ldyBEeW5hbW9EQlN0YWNrKGFwcCwgJ1BMVFdDaGF0Ym90RHluYW1vREJTdGFjaycsIHtcbiAgZW52OiB7XG4gICAgYWNjb3VudDogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfQUNDT1VOVCxcbiAgICByZWdpb246IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX1JFR0lPTixcbiAgfSxcbn0pO1xuXG4vLyBDb2duaXRvIFN0YWNrXG5jb25zdCBjb2duaXRvU3RhY2sgPSBuZXcgQ29nbml0b1N0YWNrKGFwcCwgJ0NvZ25pdG9TdGFjaycsIHtcbiAgZW52OiB7XG4gICAgYWNjb3VudDogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfQUNDT1VOVCxcbiAgICByZWdpb246IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX1JFR0lPTixcbiAgfSxcbn0pO1xuXG4vLyBTMyBTdGFjayBmb3IgZmlsZSB1cGxvYWRzXG5jb25zdCBzM1N0YWNrID0gbmV3IFMzU3RhY2soYXBwLCAnUzNTdGFjaycsIHtcbiAgZW52OiB7XG4gICAgYWNjb3VudDogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfQUNDT1VOVCxcbiAgICByZWdpb246IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX1JFR0lPTixcbiAgfSxcbn0pO1xuXG4vLyBXZWJTb2NrZXQgU3RhY2tcbmNvbnN0IHdlYlNvY2tldFN0YWNrID0gbmV3IFdlYlNvY2tldFN0YWNrKGFwcCwgJ1dlYlNvY2tldFN0YWNrJywge1xuICBjb252ZXJzYXRpb25zVGFibGU6IGR5bmFtb0RCU3RhY2suY29udmVyc2F0aW9uc1RhYmxlLFxuICBjb25uZWN0aW9uc1RhYmxlOiBkeW5hbW9EQlN0YWNrLmNvbm5lY3Rpb25zVGFibGUsXG4gIGZpbGVBdHRhY2htZW50c1RhYmxlOiBkeW5hbW9EQlN0YWNrLmZpbGVBdHRhY2htZW50c1RhYmxlLFxuICB1cGxvYWRzQnVja2V0OiBzM1N0YWNrLnVwbG9hZHNCdWNrZXQsXG4gIGVudjoge1xuICAgIGFjY291bnQ6IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX0FDQ09VTlQsXG4gICAgcmVnaW9uOiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9SRUdJT04sXG4gIH0sXG59KTtcblxuLy8gUkVTVCBBUEkgU3RhY2tcbmNvbnN0IHJlc3RBcGlTdGFjayA9IG5ldyBSZXN0QXBpU3RhY2soYXBwLCAnUmVzdEFwaVN0YWNrJywge1xuICBjb252ZXJzYXRpb25zVGFibGU6IGR5bmFtb0RCU3RhY2suY29udmVyc2F0aW9uc1RhYmxlLFxuICBmaWxlQXR0YWNobWVudHNUYWJsZTogZHluYW1vREJTdGFjay5maWxlQXR0YWNobWVudHNUYWJsZSxcbiAgdXBsb2Fkc0J1Y2tldDogczNTdGFjay51cGxvYWRzQnVja2V0LFxuICBlbnY6IHtcbiAgICBhY2NvdW50OiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9BQ0NPVU5ULFxuICAgIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfUkVHSU9OLFxuICB9LFxufSk7XG5cbndlYlNvY2tldFN0YWNrLmFkZERlcGVuZGVuY3koZHluYW1vREJTdGFjayk7XG53ZWJTb2NrZXRTdGFjay5hZGREZXBlbmRlbmN5KHMzU3RhY2spO1xucmVzdEFwaVN0YWNrLmFkZERlcGVuZGVuY3koZHluYW1vREJTdGFjayk7XG5yZXN0QXBpU3RhY2suYWRkRGVwZW5kZW5jeShzM1N0YWNrKTsiXX0=
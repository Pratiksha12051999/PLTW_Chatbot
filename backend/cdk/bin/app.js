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
const amplify_stack_1 = require("../lib/amplify-stack");
const sqs_stack_1 = require("../lib/sqs-stack");
const app = new cdk.App();
// Get context variables for Amplify (optional)
const githubToken = app.node.tryGetContext('githubToken');
const githubOwner = app.node.tryGetContext('githubOwner');
const githubRepo = app.node.tryGetContext('githubRepo');
const branches = app.node.tryGetContext('branches')?.split(',') || ['main'];
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
// SQS Stack
const sqsStack = new sqs_stack_1.SQSStack(app, 'SQSStack', {
    conversationsTable: dynamoDBStack.conversationsTable,
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
    escalationQueue: sqsStack.escalationQueue, // Add this line
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
    userPool: cognitoStack.userPool,
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
});
webSocketStack.addDependency(dynamoDBStack);
webSocketStack.addDependency(s3Stack);
restApiStack.addDependency(dynamoDBStack);
restApiStack.addDependency(s3Stack);
restApiStack.addDependency(cognitoStack);
webSocketStack.addDependency(sqsStack);
restApiStack.addDependency(sqsStack);
sqsStack.addDependency(dynamoDBStack);
// Amplify Stack (only if GitHub credentials provided)
if (githubToken && githubOwner && githubRepo) {
    const amplifyStack = new amplify_stack_1.AmplifyStack(app, 'AmplifyStack', {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHVDQUFxQztBQUNyQyxpREFBbUM7QUFDbkMsMERBQXNEO0FBQ3RELDREQUF3RDtBQUN4RCwwREFBcUQ7QUFDckQsd0RBQW9EO0FBQ3BELDhDQUEwQztBQUMxQyx3REFBb0Q7QUFDcEQsZ0RBQTRDO0FBRTVDLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBRTFCLCtDQUErQztBQUMvQyxNQUFNLFdBQVcsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUMxRCxNQUFNLFdBQVcsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUMxRCxNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUN4RCxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUU1RSxpQkFBaUI7QUFDakIsTUFBTSxhQUFhLEdBQUcsSUFBSSw4QkFBYSxDQUFDLEdBQUcsRUFBRSwwQkFBMEIsRUFBRTtJQUN2RSxHQUFHLEVBQUU7UUFDSCxPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUI7UUFDeEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCO0tBQ3ZDO0NBQ0YsQ0FBQyxDQUFDO0FBRUgsZ0JBQWdCO0FBQ2hCLE1BQU0sWUFBWSxHQUFHLElBQUksNEJBQVksQ0FBQyxHQUFHLEVBQUUsY0FBYyxFQUFFO0lBQ3pELEdBQUcsRUFBRTtRQUNILE9B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Q0YsQ0FBQyxDQUFDO0lBRUgsWUFBWSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUMzQyxZQUFZLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQzNDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG5pbXBvcnQgJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3Rlcic7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgRHluYW1vREJTdGFjayB9IGZyb20gJy4uL2xpYi9keW5hbW9kYi1zdGFjayc7XG5pbXBvcnQgeyBXZWJTb2NrZXRTdGFjayB9IGZyb20gJy4uL2xpYi93ZWJzb2NrZXQtc3RhY2snO1xuaW1wb3J0IHsgUmVzdEFwaVN0YWNrIH0gZnJvbSAnLi4vbGliL3Jlc3QtYXBpLXN0YWNrJztcbmltcG9ydCB7IENvZ25pdG9TdGFjayB9IGZyb20gJy4uL2xpYi9jb2duaXRvLXN0YWNrJztcbmltcG9ydCB7IFMzU3RhY2sgfSBmcm9tICcuLi9saWIvczMtc3RhY2snO1xuaW1wb3J0IHsgQW1wbGlmeVN0YWNrIH0gZnJvbSAnLi4vbGliL2FtcGxpZnktc3RhY2snO1xuaW1wb3J0IHsgU1FTU3RhY2sgfSBmcm9tICcuLi9saWIvc3FzLXN0YWNrJztcblxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcblxuLy8gR2V0IGNvbnRleHQgdmFyaWFibGVzIGZvciBBbXBsaWZ5IChvcHRpb25hbClcbmNvbnN0IGdpdGh1YlRva2VuID0gYXBwLm5vZGUudHJ5R2V0Q29udGV4dCgnZ2l0aHViVG9rZW4nKTtcbmNvbnN0IGdpdGh1Yk93bmVyID0gYXBwLm5vZGUudHJ5R2V0Q29udGV4dCgnZ2l0aHViT3duZXInKTtcbmNvbnN0IGdpdGh1YlJlcG8gPSBhcHAubm9kZS50cnlHZXRDb250ZXh0KCdnaXRodWJSZXBvJyk7XG5jb25zdCBicmFuY2hlcyA9IGFwcC5ub2RlLnRyeUdldENvbnRleHQoJ2JyYW5jaGVzJyk/LnNwbGl0KCcsJykgfHwgWydtYWluJ107XG5cbi8vIER5bmFtb0RCIFN0YWNrXG5jb25zdCBkeW5hbW9EQlN0YWNrID0gbmV3IER5bmFtb0RCU3RhY2soYXBwLCAnUExUV0NoYXRib3REeW5hbW9EQlN0YWNrJywge1xuICBlbnY6IHtcbiAgICBhY2NvdW50OiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9BQ0NPVU5ULFxuICAgIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfUkVHSU9OLFxuICB9LFxufSk7XG5cbi8vIENvZ25pdG8gU3RhY2tcbmNvbnN0IGNvZ25pdG9TdGFjayA9IG5ldyBDb2duaXRvU3RhY2soYXBwLCAnQ29nbml0b1N0YWNrJywge1xuICBlbnY6IHtcbiAgICBhY2NvdW50OiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9BQ0NPVU5ULFxuICAgIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfUkVHSU9OLFxuICB9LFxufSk7XG5cbi8vIFNRUyBTdGFja1xuY29uc3Qgc3FzU3RhY2sgPSBuZXcgU1FTU3RhY2soYXBwLCAnU1FTU3RhY2snLCB7XG4gIGNvbnZlcnNhdGlvbnNUYWJsZTogZHluYW1vREJTdGFjay5jb252ZXJzYXRpb25zVGFibGUsXG4gIGVudjoge1xuICAgIGFjY291bnQ6IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX0FDQ09VTlQsXG4gICAgcmVnaW9uOiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9SRUdJT04sXG4gIH0sXG59KTtcblxuLy8gUzMgU3RhY2sgZm9yIGZpbGUgdXBsb2Fkc1xuY29uc3QgczNTdGFjayA9IG5ldyBTM1N0YWNrKGFwcCwgJ1MzU3RhY2snLCB7XG4gIGVudjoge1xuICAgIGFjY291bnQ6IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX0FDQ09VTlQsXG4gICAgcmVnaW9uOiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9SRUdJT04sXG4gIH0sXG59KTtcblxuLy8gV2ViU29ja2V0IFN0YWNrXG5jb25zdCB3ZWJTb2NrZXRTdGFjayA9IG5ldyBXZWJTb2NrZXRTdGFjayhhcHAsICdXZWJTb2NrZXRTdGFjaycsIHtcbiAgY29udmVyc2F0aW9uc1RhYmxlOiBkeW5hbW9EQlN0YWNrLmNvbnZlcnNhdGlvbnNUYWJsZSxcbiAgY29ubmVjdGlvbnNUYWJsZTogZHluYW1vREJTdGFjay5jb25uZWN0aW9uc1RhYmxlLFxuICBmaWxlQXR0YWNobWVudHNUYWJsZTogZHluYW1vREJTdGFjay5maWxlQXR0YWNobWVudHNUYWJsZSxcbiAgdXBsb2Fkc0J1Y2tldDogczNTdGFjay51cGxvYWRzQnVja2V0LFxuICBlc2NhbGF0aW9uUXVldWU6IHNxc1N0YWNrLmVzY2FsYXRpb25RdWV1ZSwgIC8vIEFkZCB0aGlzIGxpbmVcbiAgZW52OiB7XG4gICAgYWNjb3VudDogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfQUNDT1VOVCxcbiAgICByZWdpb246IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX1JFR0lPTixcbiAgfSxcbn0pO1xuXG4vLyBSRVNUIEFQSSBTdGFja1xuY29uc3QgcmVzdEFwaVN0YWNrID0gbmV3IFJlc3RBcGlTdGFjayhhcHAsICdSZXN0QXBpU3RhY2snLCB7XG4gIGNvbnZlcnNhdGlvbnNUYWJsZTogZHluYW1vREJTdGFjay5jb252ZXJzYXRpb25zVGFibGUsXG4gIGZpbGVBdHRhY2htZW50c1RhYmxlOiBkeW5hbW9EQlN0YWNrLmZpbGVBdHRhY2htZW50c1RhYmxlLFxuICB1cGxvYWRzQnVja2V0OiBzM1N0YWNrLnVwbG9hZHNCdWNrZXQsXG4gIHVzZXJQb29sOiBjb2duaXRvU3RhY2sudXNlclBvb2wsXG4gIGVudjoge1xuICAgIGFjY291bnQ6IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX0FDQ09VTlQsXG4gICAgcmVnaW9uOiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9SRUdJT04sXG4gIH0sXG59KTtcblxud2ViU29ja2V0U3RhY2suYWRkRGVwZW5kZW5jeShkeW5hbW9EQlN0YWNrKTtcbndlYlNvY2tldFN0YWNrLmFkZERlcGVuZGVuY3koczNTdGFjayk7XG5yZXN0QXBpU3RhY2suYWRkRGVwZW5kZW5jeShkeW5hbW9EQlN0YWNrKTtcbnJlc3RBcGlTdGFjay5hZGREZXBlbmRlbmN5KHMzU3RhY2spO1xucmVzdEFwaVN0YWNrLmFkZERlcGVuZGVuY3koY29nbml0b1N0YWNrKTtcbndlYlNvY2tldFN0YWNrLmFkZERlcGVuZGVuY3koc3FzU3RhY2spO1xucmVzdEFwaVN0YWNrLmFkZERlcGVuZGVuY3koc3FzU3RhY2spO1xuc3FzU3RhY2suYWRkRGVwZW5kZW5jeShkeW5hbW9EQlN0YWNrKTtcblxuXG4vLyBBbXBsaWZ5IFN0YWNrIChvbmx5IGlmIEdpdEh1YiBjcmVkZW50aWFscyBwcm92aWRlZClcbmlmIChnaXRodWJUb2tlbiAmJiBnaXRodWJPd25lciAmJiBnaXRodWJSZXBvKSB7XG4gIGNvbnN0IGFtcGxpZnlTdGFjayA9IG5ldyBBbXBsaWZ5U3RhY2soYXBwLCAnQW1wbGlmeVN0YWNrJywge1xuICAgIGdpdGh1YlRva2VuLFxuICAgIGdpdGh1Yk93bmVyLFxuICAgIGdpdGh1YlJlcG8sXG4gICAgYnJhbmNoZXMsXG4gICAgZW52OiB7XG4gICAgICBhY2NvdW50OiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9BQ0NPVU5ULFxuICAgICAgcmVnaW9uOiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9SRUdJT04sXG4gICAgfSxcbiAgfSk7XG4gIFxuICBhbXBsaWZ5U3RhY2suYWRkRGVwZW5kZW5jeSh3ZWJTb2NrZXRTdGFjayk7XG4gIGFtcGxpZnlTdGFjay5hZGREZXBlbmRlbmN5KHJlc3RBcGlTdGFjayk7XG59XG4iXX0=
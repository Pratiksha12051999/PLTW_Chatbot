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
const app = new cdk.App();
// DynamoDB Stack
const dynamoDBStack = new dynamodb_stack_1.DynamoDBStack(app, 'DynamoDBStack', {
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
// WebSocket Stack
const webSocketStack = new websocket_stack_1.WebSocketStack(app, 'WebSocketStack', {
    conversationsTable: dynamoDBStack.conversationsTable,
    connectionsTable: dynamoDBStack.connectionsTable,
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
});
// REST API Stack
const restApiStack = new rest_api_stack_1.RestApiStack(app, 'RestApiStack', {
    conversationsTable: dynamoDBStack.conversationsTable,
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
});
webSocketStack.addDependency(dynamoDBStack);
restApiStack.addDependency(dynamoDBStack);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHVDQUFxQztBQUNyQyxpREFBbUM7QUFDbkMsMERBQXNEO0FBQ3RELDREQUF3RDtBQUN4RCwwREFBcUQ7QUFDckQsd0RBQW9EO0FBRXBELE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBRTFCLGlCQUFpQjtBQUNqQixNQUFNLGFBQWEsR0FBRyxJQUFJLDhCQUFhLENBQUMsR0FBRyxFQUFFLGVBQWUsRUFBRTtJQUM1RCxHQUFHLEVBQUU7UUFDSCxPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUI7UUFDeEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCO0tBQ3ZDO0NBQ0YsQ0FBQyxDQUFDO0FBRUgsZ0JBQWdCO0FBQ2hCLE1BQU0sWUFBWSxHQUFHLElBQUksNEJBQVksQ0FBQyxHQUFHLEVBQUUsY0FBYyxFQUFFO0lBQ3pELEdBQUcsRUFBRTtRQUNILE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQjtRQUN4QyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0I7S0FDdkM7Q0FDRixDQUFDLENBQUM7QUFFSCxrQkFBa0I7QUFDbEIsTUFBTSxjQUFjLEdBQUcsSUFBSSxnQ0FBYyxDQUFDLEdBQUcsRUFBRSxnQkFBZ0IsRUFBRTtJQUMvRCxrQkFBa0IsRUFBRSxhQUFhLENBQUMsa0JBQWtCO0lBQ3BELGdCQUFnQixFQUFFLGFBQWEsQ0FBQyxnQkFBZ0I7SUFDaEQsR0FBRyxFQUFFO1FBQ0gsT0FBTyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CO1FBQ3hDLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQjtLQUN2QztDQUNGLENBQUMsQ0FBQztBQUVILGlCQUFpQjtBQUNqQixNQUFNLFlBQVksR0FBRyxJQUFJLDZCQUFZLENBQUMsR0FBRyxFQUFFLGNBQWMsRUFBRTtJQUN6RCxrQkFBa0IsRUFBRSxhQUFhLENBQUMsa0JBQWtCO0lBQ3BELEdBQUcsRUFBRTtRQUNILE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQjtRQUN4QyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0I7S0FDdkM7Q0FDRixDQUFDLENBQUM7QUFFSCxjQUFjLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQzVDLFlBQVksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG5pbXBvcnQgJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3Rlcic7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgRHluYW1vREJTdGFjayB9IGZyb20gJy4uL2xpYi9keW5hbW9kYi1zdGFjayc7XG5pbXBvcnQgeyBXZWJTb2NrZXRTdGFjayB9IGZyb20gJy4uL2xpYi93ZWJzb2NrZXQtc3RhY2snO1xuaW1wb3J0IHsgUmVzdEFwaVN0YWNrIH0gZnJvbSAnLi4vbGliL3Jlc3QtYXBpLXN0YWNrJztcbmltcG9ydCB7IENvZ25pdG9TdGFjayB9IGZyb20gJy4uL2xpYi9jb2duaXRvLXN0YWNrJztcblxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcblxuLy8gRHluYW1vREIgU3RhY2tcbmNvbnN0IGR5bmFtb0RCU3RhY2sgPSBuZXcgRHluYW1vREJTdGFjayhhcHAsICdEeW5hbW9EQlN0YWNrJywge1xuICBlbnY6IHtcbiAgICBhY2NvdW50OiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9BQ0NPVU5ULFxuICAgIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfUkVHSU9OLFxuICB9LFxufSk7XG5cbi8vIENvZ25pdG8gU3RhY2tcbmNvbnN0IGNvZ25pdG9TdGFjayA9IG5ldyBDb2duaXRvU3RhY2soYXBwLCAnQ29nbml0b1N0YWNrJywge1xuICBlbnY6IHtcbiAgICBhY2NvdW50OiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9BQ0NPVU5ULFxuICAgIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfUkVHSU9OLFxuICB9LFxufSk7XG5cbi8vIFdlYlNvY2tldCBTdGFja1xuY29uc3Qgd2ViU29ja2V0U3RhY2sgPSBuZXcgV2ViU29ja2V0U3RhY2soYXBwLCAnV2ViU29ja2V0U3RhY2snLCB7XG4gIGNvbnZlcnNhdGlvbnNUYWJsZTogZHluYW1vREJTdGFjay5jb252ZXJzYXRpb25zVGFibGUsXG4gIGNvbm5lY3Rpb25zVGFibGU6IGR5bmFtb0RCU3RhY2suY29ubmVjdGlvbnNUYWJsZSxcbiAgZW52OiB7XG4gICAgYWNjb3VudDogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfQUNDT1VOVCxcbiAgICByZWdpb246IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX1JFR0lPTixcbiAgfSxcbn0pO1xuXG4vLyBSRVNUIEFQSSBTdGFja1xuY29uc3QgcmVzdEFwaVN0YWNrID0gbmV3IFJlc3RBcGlTdGFjayhhcHAsICdSZXN0QXBpU3RhY2snLCB7XG4gIGNvbnZlcnNhdGlvbnNUYWJsZTogZHluYW1vREJTdGFjay5jb252ZXJzYXRpb25zVGFibGUsXG4gIGVudjoge1xuICAgIGFjY291bnQ6IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX0FDQ09VTlQsXG4gICAgcmVnaW9uOiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9SRUdJT04sXG4gIH0sXG59KTtcblxud2ViU29ja2V0U3RhY2suYWRkRGVwZW5kZW5jeShkeW5hbW9EQlN0YWNrKTtcbnJlc3RBcGlTdGFjay5hZGREZXBlbmRlbmN5KGR5bmFtb0RCU3RhY2spOyJdfQ==
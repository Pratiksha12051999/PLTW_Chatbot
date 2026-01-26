import * as cdk from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as iam from "aws-cdk-lib/aws-iam";
import { WebSocketLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { Construct } from "constructs";
import * as path from "path";

interface WebSocketStackProps extends cdk.StackProps {
  connectionsTable: dynamodb.Table;
  conversationsTable: dynamodb.Table;
  escalationQueue: sqs.Queue;
}

export class WebSocketStack extends cdk.Stack {
  public readonly webSocketApi: apigatewayv2.WebSocketApi;
  public readonly webSocketStage: apigatewayv2.WebSocketStage;

  constructor(scope: Construct, id: string, props: WebSocketStackProps) {
    super(scope, id, props);

    const { connectionsTable, conversationsTable, escalationQueue } = props;

    // Path to BUNDLED Lambda code
    const lambdaCodePath = path.join(__dirname, "../../lambda-bundle");

    // Connect Handler
    const connectHandler = new lambda.Function(this, "ConnectHandlerV2", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handlers/websocket/connect.handler", // ← FIXED: Added handlers/websocket/ prefix
      code: lambda.Code.fromAsset(lambdaCodePath),
      timeout: cdk.Duration.seconds(10),
      environment: {
        CONNECTIONS_TABLE: connectionsTable.tableName,
      },
    });

    // Disconnect Handler
    const disconnectHandler = new lambda.Function(this, "DisconnectHandlerV2", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handlers/websocket/disconnect.handler", // ← FIXED: Added handlers/websocket/ prefix
      code: lambda.Code.fromAsset(lambdaCodePath),
      timeout: cdk.Duration.seconds(10),
      environment: {
        CONNECTIONS_TABLE: connectionsTable.tableName,
      },
    });

    // Send Message Handler
    const sendMessageHandler = new lambda.Function(
      this,
      "SendMessageHandlerV2",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handlers/websocket/sendMessage.handler", // ← FIXED: Added handlers/websocket/ prefix
        code: lambda.Code.fromAsset(lambdaCodePath),
        timeout: cdk.Duration.seconds(29),
        memorySize: 1024,
        environment: {
          CONNECTIONS_TABLE: connectionsTable.tableName,
          CONVERSATIONS_TABLE: conversationsTable.tableName,
          ESCALATION_QUEUE_URL: escalationQueue.queueUrl,
          BEDROCK_AGENT_ID: process.env.BEDROCK_AGENT_ID || "",
          BEDROCK_AGENT_ALIAS_ID: process.env.BEDROCK_AGENT_ALIAS_ID || "",
          NOVA_PRO_MODEL_ID:
            process.env.NOVA_PRO_MODEL_ID || "amazon.nova-pro-v1:0",
        },
      },
    );

    // Grant DynamoDB permissions
    connectionsTable.grantReadWriteData(connectHandler);
    connectionsTable.grantReadWriteData(disconnectHandler);
    connectionsTable.grantReadWriteData(sendMessageHandler);
    conversationsTable.grantReadWriteData(sendMessageHandler);

    // Grant SQS permissions
    escalationQueue.grantSendMessages(sendMessageHandler);

    // Bedrock permissions - ALL actions needed (both bedrock and bedrock-agent-runtime)
    sendMessageHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          // "bedrock-agent-runtime:InvokeAgent", // Runtime calls
          "bedrock:InvokeAgent", // Control plane - CRITICAL!
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
          "bedrock:Retrieve",
          "bedrock:RetrieveAndGenerate",
        ],
        resources: ["*"],
      }),
    );

    // AWS Translate permissions
    sendMessageHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["translate:TranslateText"],
        resources: ["*"],
      }),
    );

    // Create WebSocket API
    this.webSocketApi = new apigatewayv2.WebSocketApi(
      this,
      "PLTWWebSocketApi",
      {
        apiName: "pltw-chatbot-websocket-api",
        description: "WebSocket API for PLTW Chatbot",
        connectRouteOptions: {
          integration: new WebSocketLambdaIntegration(
            "ConnectIntegration",
            connectHandler,
          ),
        },
        disconnectRouteOptions: {
          integration: new WebSocketLambdaIntegration(
            "DisconnectIntegration",
            disconnectHandler,
          ),
        },
        defaultRouteOptions: {
          integration: new WebSocketLambdaIntegration(
            "SendMessageIntegration",
            sendMessageHandler,
          ),
        },
      },
    );

    // Create WebSocket Stage
    this.webSocketStage = new apigatewayv2.WebSocketStage(
      this,
      "ProductionStage",
      {
        webSocketApi: this.webSocketApi,
        stageName: "prod",
        autoDeploy: true,
      },
    );

    // WebSocket permissions
    sendMessageHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["execute-api:ManageConnections"],
        resources: [
          `arn:aws:execute-api:${this.region}:${this.account}:${this.webSocketApi.apiId}/*`,
        ],
      }),
    );

    // Outputs
    new cdk.CfnOutput(this, "WebSocketURL", {
      value: this.webSocketStage.url,
      description: "WebSocket API URL",
      // exportName: 'WebSocketURL',
    });

    new cdk.CfnOutput(this, "WebSocketApiId", {
      value: this.webSocketApi.apiId,
      // exportName: 'WebSocketApiId',
    });
  }
}

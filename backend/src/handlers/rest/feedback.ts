import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBService } from "../../services/dynamodb.service.js";

const dynamoDBService = new DynamoDBService();

// CloudFront domain
const FRONTEND_URL = process.env.FRONTEND_URL || "";

// Proper CORS headers
const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": FRONTEND_URL,
  "Access-Control-Allow-Headers":
    "Content-Type,Authorization,X-Requested-With,X-Api-Key",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Credentials": "true",
};

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  console.log(`Feedback handler: ${event.httpMethod} ${event.path}`);

  // Handle OPTIONS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { conversationId, satisfaction } = body;

    if (!conversationId || !satisfaction) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    if (!["positive", "negative"].includes(satisfaction)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Invalid satisfaction value" }),
      };
    }

    console.log(
      `Recording ${satisfaction} feedback for conversation ${conversationId}`,
    );

    await dynamoDBService.updateConversation(conversationId, {
      satisfaction,
      updatedAt: Date.now(),
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error("Error recording feedback:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Failed to record feedback" }),
    };
  }
};

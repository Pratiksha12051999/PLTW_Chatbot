import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBService } from "../../services/dynamodb.service.js";

const dynamoDBService = new DynamoDBService();

// CloudFront domain
const FRONTEND_URL = process.env.FRONTEND_URL || "";

// Proper CORS headers + Security headers
const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": FRONTEND_URL,
  "Access-Control-Allow-Headers":
    "Content-Type,Authorization,X-Requested-With,X-Api-Key",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Credentials": "true",
  // ← SECURITY: Additional security headers
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Referrer-Policy": "strict-origin-when-cross-origin",
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
    const { conversationId, satisfaction, comment } = body;

    if (!conversationId || !satisfaction) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    // Validate conversationId format (UUID)
    if (!/^[a-f0-9-]{36}$/i.test(conversationId)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Invalid conversation ID format" }),
      };
    }

    if (!["positive", "negative"].includes(satisfaction)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Invalid satisfaction value" }),
      };
    }

    // Validate comment length if provided (max 1000 characters)
    if (comment && (typeof comment !== 'string' || comment.length > 1000)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Comment too long. Maximum 1000 characters." }),
      };
    }

    console.log(
      `Recording ${satisfaction} feedback for conversation ${conversationId}`,
    );

    // Sanitize comment (remove control characters)
    const sanitizedComment = comment?.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

    const updates: any = {
      satisfaction,
      updatedAt: Date.now(),
    };

    if (sanitizedComment) {
      updates.comment = sanitizedComment;
    }

    await dynamoDBService.updateConversation(conversationId, updates);

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

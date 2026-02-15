import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBService } from "../../services/dynamodb.service.js";
import { AdminMetrics, Conversation } from "../../types/index.js";

const dynamoDBService = new DynamoDBService();

// CloudFront domain - update this to your actual CloudFront URL
const FRONTEND_URL = process.env.FRONTEND_URL || "";

// Proper CORS headers for CloudFront origin + Security headers
const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": FRONTEND_URL,
  "Access-Control-Allow-Headers":
    "Content-Type,Authorization,X-Requested-With,X-Api-Key",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Credentials": "true",
  // ← SECURITY: Additional security headers
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

/**
 * Unified Admin Handler - routes requests based on path
 * Handles: GET /admin/metrics, GET /admin/conversations
 */
export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const path = event.path;
  const method = event.httpMethod;

  console.log(`Admin handler: ${method} ${path}`);
  console.log(
    `Origin: ${event.headers.origin || event.headers.Origin || "none"}`,
  );

  // Handle OPTIONS preflight request
  if (method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  try {
    // Route based on path
    if (path.endsWith("/metrics") && method === "GET") {
      return await getMetrics(event);
    } else if (path.endsWith("/conversations") && method === "GET") {
      return await getConversations(event);
    } else {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Not found" }),
      };
    }
  } catch (error) {
    console.error("Admin handler error:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};

export const getMetrics = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    // Input validation for days parameter
    const daysParam = parseInt(event.queryStringParameters?.days || "7");

    // Validate: Must be a number, between 1 and 90 days
    if (isNaN(daysParam) || daysParam < 1 || daysParam > 90) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Invalid 'days' parameter. Must be between 1 and 90." }),
      };
    }

    const days = daysParam;
    const endTime = Date.now();
    const startTime = endTime - days * 24 * 60 * 60 * 1000;

    console.log(`Fetching metrics for last ${days} days`);

    const conversations = await dynamoDBService.getConversationsByDateRange(
      startTime,
      endTime,
    );

    console.log(`Found ${conversations.length} conversations`);

    // Calculate satisfaction based on explicit feedback OR sentiment analysis
    const conversationsWithSentiment = conversations.filter(
      (c) => c.satisfaction || c.sentiment,
    );
    const positiveCount = conversations.filter(
      (c) =>
        c.satisfaction === "positive" ||
        (!c.satisfaction && c.sentiment === "positive"),
    ).length;
    const negativeCount = conversations.filter(
      (c) =>
        c.satisfaction === "negative" ||
        (!c.satisfaction && c.sentiment === "negative"),
    ).length;
    const neutralCount = conversations.filter(
      (c) => !c.satisfaction && c.sentiment === "neutral",
    ).length;

    const escalatedCount = conversations.filter(
      (c) => c.status === "escalated",
    ).length;

    // Overall satisfaction: positive / (positive + negative) * 100
    // Neutral doesn't count against satisfaction
    const totalRated = positiveCount + negativeCount;
    const overallSatisfaction =
      totalRated > 0 ? (positiveCount / totalRated) * 100 : 0;

    const metrics: AdminMetrics = {
      totalConversations: conversations.length,
      escalationRate:
        conversations.length > 0
          ? (escalatedCount / conversations.length) * 100
          : 0,
      overallSatisfaction,
      conversationVolume: calculateDailyVolume(conversations, days),
      topCategories: calculateTopCategories(conversations),
      escalationReasons: calculateEscalationReasons(conversations),
    };

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(metrics),
    };
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Failed to fetch metrics" }),
    };
  }
};

export const getConversations = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    // Input validation for limit parameter
    const limitParam = parseInt(event.queryStringParameters?.limit || "50");

    // Validate: Must be a number, between 1 and 1000
    if (isNaN(limitParam) || limitParam < 1 || limitParam > 1000) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Invalid 'limit' parameter. Must be between 1 and 1000." }),
      };
    }

    const limit = limitParam;

    console.log(`Fetching up to ${limit} conversations`);

    const conversations = await dynamoDBService.getAllConversations(limit);

    console.log(`Returning ${conversations.length} conversations`);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ conversations }),
    };
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Failed to fetch conversations" }),
    };
  }
};

function calculateDailyVolume(conversations: Conversation[], days: number) {
  const volumeMap = new Map<string, number>();
  conversations.forEach((conv) => {
    const date = new Date(conv.startTime).toISOString().split("T")[0];
    volumeMap.set(date, (volumeMap.get(date) || 0) + 1);
  });
  return Array.from(volumeMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function calculateTopCategories(conversations: Conversation[]) {
  const categoryMap = new Map<string, number>();
  conversations.forEach((conv) => {
    const category = conv.category || "uncategorized";
    categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
  });
  return Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function calculateEscalationReasons(conversations: Conversation[]) {
  const reasons = {
    no_answer: 0,
    user_not_satisfied: 0,
    requested_agent: 0,
  };

  conversations
    .filter((c) => c.status === "escalated")
    .forEach((conv) => {
      if (conv.escalationReason) {
        const reason = conv.escalationReason as keyof typeof reasons;
        reasons[reason]++;
      }
    });

  return reasons;
}

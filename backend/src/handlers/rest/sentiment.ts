import { APIGatewayProxyEvent, APIGatewayProxyResult, ScheduledEvent } from 'aws-lambda';
import { DynamoDBService } from '../../services/dynamodb.service.js';
import { SentimentService } from '../../services/sentiment.service.js';
import { Conversation } from '../../types/index.js';

const dynamoDBService = new DynamoDBService();
const sentimentService = new SentimentService(dynamoDBService);

// 10 minutes in milliseconds
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;

// Standard CORS headers
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

/**
 * Sentiment Analysis Handler
 * 
 * This handler can be triggered in two ways:
 * 1. Scheduled (EventBridge) - Scans for inactive conversations and analyzes sentiment
 * 2. Direct API call - Analyzes sentiment for a specific conversation
 * 
 * The handler checks for conversations that:
 * - Have been inactive for 10+ minutes
 * - Are still in 'active' status
 * - Don't have explicit user feedback (satisfaction)
 * 
 * For these conversations, it uses Nova Pro to analyze the overall sentiment
 * based on the conversation content.
 */
export const handler = async (
  event: APIGatewayProxyEvent | ScheduledEvent
): Promise<APIGatewayProxyResult> => {
  console.log('[Sentiment Handler] Invoked', { eventType: 'source' in event ? 'scheduled' : 'api' });

  try {
    // Check if this is a scheduled event or API call
    if ('source' in event && event.source === 'aws.events') {
      // Scheduled invocation - process all inactive conversations
      return await processInactiveConversations();
    } else {
      // API call - process specific conversation
      const apiEvent = event as APIGatewayProxyEvent;
      const body = JSON.parse(apiEvent.body || '{}');
      const { conversationId } = body;

      if (!conversationId) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Missing conversationId' }),
        };
      }

      const sentiment = await sentimentService.analyzeAndUpdateSentiment(conversationId);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ conversationId, sentiment }),
      };
    }
  } catch (error) {
    console.error('[Sentiment Handler] Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to analyze sentiment' }),
    };
  }
};

/**
 * Processes all conversations that have been inactive for 10+ minutes.
 * Updates their sentiment based on LLM analysis.
 */
async function processInactiveConversations(): Promise<APIGatewayProxyResult> {
  const now = Date.now();
  const cutoffTime = now - INACTIVITY_TIMEOUT_MS;

  console.log('[Sentiment Handler] Processing inactive conversations', {
    cutoffTime: new Date(cutoffTime).toISOString(),
  });

  // Get all conversations (we'll filter in memory for now)
  // In production, you'd want a GSI on lastActivityTime for efficiency
  const allConversations = await dynamoDBService.getAllConversations(500);

  // Filter for conversations that need sentiment analysis:
  // 1. Status is 'active' (not already resolved/escalated)
  // 2. No explicit user feedback (satisfaction)
  // 3. Last activity was more than 10 minutes ago
  // 4. No sentiment already set
  const conversationsToAnalyze = allConversations.filter((conv: Conversation) => {
    const lastActivity = conv.lastActivityTime || conv.startTime;
    const isInactive = lastActivity < cutoffTime;
    const needsAnalysis = conv.status === 'active' && !conv.satisfaction && !conv.sentiment;

    return isInactive && needsAnalysis;
  });

  console.log('[Sentiment Handler] Found conversations to analyze', {
    total: allConversations.length,
    toAnalyze: conversationsToAnalyze.length,
  });

  const results: Array<{ conversationId: string; sentiment: string; success: boolean }> = [];

  // Process each conversation
  for (const conv of conversationsToAnalyze) {
    try {
      const sentiment = await sentimentService.analyzeAndUpdateSentiment(conv.conversationId);
      results.push({
        conversationId: conv.conversationId,
        sentiment,
        success: true,
      });
    } catch (error) {
      console.error('[Sentiment Handler] Failed to analyze conversation', {
        conversationId: conv.conversationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      results.push({
        conversationId: conv.conversationId,
        sentiment: 'error',
        success: false,
      });
    }
  }

  console.log('[Sentiment Handler] Processing complete', {
    processed: results.length,
    successful: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
  });

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      message: 'Sentiment analysis complete',
      processed: results.length,
      results,
    }),
  };
}

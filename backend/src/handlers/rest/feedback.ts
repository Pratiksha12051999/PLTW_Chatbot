import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBService } from '../../services/dynamodb.service.js';

const dynamoDBService = new DynamoDBService();

// Standard CORS headers
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

/**
 * Unified Feedback Handler
 * Handles: POST /feedback
 * 
 * User feedback (thumbs up/down) is stored directly as satisfaction.
 * This explicit feedback takes precedence over LLM sentiment analysis.
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const method = event.httpMethod;

  console.log(`Feedback handler: ${method} ${event.path}`);

  if (method === 'POST') {
    return await submitFeedback(event);
  }

  return {
    statusCode: 404,
    headers: corsHeaders,
    body: JSON.stringify({ error: 'Not found' }),
  };
};

export const submitFeedback = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { conversationId, satisfaction, comment } = body;

    if (!conversationId || !satisfaction) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    // Validate satisfaction value
    if (!['positive', 'negative'].includes(satisfaction)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid satisfaction value. Must be "positive" or "negative"' }),
      };
    }

    console.log('[Feedback] Submitting user feedback', {
      conversationId,
      satisfaction,
      hasComment: !!comment,
    });

    // Store user's explicit feedback
    // satisfaction = thumbs up (positive) or thumbs down (negative)
    // sentiment is also set to match the explicit feedback
    const updates: Record<string, any> = {
      satisfaction,
      sentiment: satisfaction, // Explicit feedback sets sentiment directly
      lastActivityTime: Date.now(),
    };

    // Add comment if provided
    if (comment) {
      updates.comment = comment;
    }

    await dynamoDBService.updateConversation(conversationId, updates);

    console.log('[Feedback] Feedback saved successfully', {
      conversationId,
      satisfaction,
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Feedback submitted successfully' }),
    };
  } catch (error) {
    console.error('[Feedback] Error submitting feedback:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to submit feedback' }),
    };
  }
};
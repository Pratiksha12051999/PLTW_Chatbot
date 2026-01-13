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
    const { conversationId, satisfaction, comment } = body; // Added comment

    if (!conversationId || !satisfaction) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    const updates: any = {
      satisfaction,
      endTime: Date.now(),
      status: 'resolved',
    };

    // Add comment if provided
    if (comment) {
      updates.comment = comment;
    }

    // If user gives negative feedback, mark as escalated with 'user_not_satisfied' reason
    if (satisfaction === 'negative') {
      updates.status = 'escalated';
      updates.escalationReason = 'user_not_satisfied';
    }

    await dynamoDBService.updateConversation(conversationId, updates);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Feedback submitted successfully' }),
    };
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to submit feedback' }),
    };
  }
};
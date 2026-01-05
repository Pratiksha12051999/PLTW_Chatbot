import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBService } from '../../services/dynamodb.service.js';
import { AdminMetrics, Conversation } from '../../types/index.js';

const dynamoDBService = new DynamoDBService();

export const getMetrics = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const days = parseInt(event.queryStringParameters?.days || '7');
    const endTime = Date.now();
    const startTime = endTime - days * 24 * 60 * 60 * 1000;

    const conversations = await dynamoDBService.getConversationsByDateRange(
      startTime,
      endTime
    );

    const totalWithSatisfaction = conversations.filter((c) => c.satisfaction).length;
    const positiveCount = conversations.filter((c) => c.satisfaction === 'positive').length;
    const escalatedCount = conversations.filter((c) => c.status === 'escalated').length;

    const metrics: AdminMetrics = {
      totalConversations: conversations.length,
      escalationRate: conversations.length > 0 ? (escalatedCount / conversations.length) * 100 : 0,
      overallSatisfaction: totalWithSatisfaction > 0 ? (positiveCount / totalWithSatisfaction) * 100 : 0,
      conversationVolume: calculateDailyVolume(conversations, days),
      topCategories: calculateTopCategories(conversations),
      escalationReasons: calculateEscalationReasons(conversations),
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(metrics),
    };
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to fetch metrics' }),
    };
  }
};

export const getConversations = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const limit = parseInt(event.queryStringParameters?.limit || '50');
    const conversations = await dynamoDBService.getAllConversations(limit);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ conversations }),
    };
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to fetch conversations' }),
    };
  }
};

function calculateDailyVolume(conversations: Conversation[], days: number) {
  const volumeMap = new Map<string, number>();
  conversations.forEach((conv) => {
    const date = new Date(conv.startTime).toISOString().split('T')[0];
    volumeMap.set(date, (volumeMap.get(date) || 0) + 1);
  });
  return Array.from(volumeMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function calculateTopCategories(conversations: Conversation[]) {
  const categoryMap = new Map<string, number>();
  conversations.forEach((conv) => {
    const category = conv.category || 'uncategorized';
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
    .filter((c) => c.status === 'escalated')
    .forEach((conv) => {
      if (conv.escalationReason) {
        const reason = conv.escalationReason as keyof typeof reasons;
        reasons[reason]++;
      }
    });

  return reasons;
}

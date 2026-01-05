import { APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBService } from '../../services/dynamodb.service.js';
import { Connection, WebSocketConnectEvent } from '../../types/index.js';
import { v4 as uuidv4 } from 'uuid';

const dynamoDBService = new DynamoDBService();

export const handler = async (
  event: WebSocketConnectEvent
): Promise<APIGatewayProxyResultV2> => {
  const connectionId = event.requestContext.connectionId;
  const userId = event.queryStringParameters?.userId || uuidv4();

  console.log(`New connection: ${connectionId} for user: ${userId}`);

  const connection: Connection = {
    connectionId,
    userId,
    connectedAt: Date.now(),
    lastActivity: Date.now(),
  };

  try {
    await dynamoDBService.saveConnection(connection);
    return { statusCode: 200, body: 'Connected' };
  } catch (error) {
    console.error('Error handling connect:', error);
    return { statusCode: 500, body: 'Failed to connect' };
  }
};

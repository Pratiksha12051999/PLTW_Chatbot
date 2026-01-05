import { APIGatewayProxyWebsocketEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBService } from '../../services/dynamodb.service.js';

const dynamoDBService = new DynamoDBService();

export const handler = async (
  event: APIGatewayProxyWebsocketEventV2
): Promise<APIGatewayProxyResultV2> => {
  const connectionId = event.requestContext.connectionId;

  console.log(`Disconnecting: ${connectionId}`);

  try {
    await dynamoDBService.deleteConnection(connectionId);
    return { statusCode: 200, body: 'Disconnected' };
  } catch (error) {
    console.error('Error handling disconnect:', error);
    return { statusCode: 500, body: 'Failed to disconnect' };
  }
};

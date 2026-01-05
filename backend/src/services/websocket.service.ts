import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  GoneException,
} from '@aws-sdk/client-apigatewaymanagementapi';

export class WebSocketService {
  private client: ApiGatewayManagementApiClient;

  constructor(endpoint: string) {
    this.client = new ApiGatewayManagementApiClient({
      endpoint,
    });
  }

  async sendMessage(connectionId: string, data: any): Promise<boolean> {
    try {
      await this.client.send(
        new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: Buffer.from(JSON.stringify(data)),
        })
      );
      return true;
    } catch (error) {
      if (error instanceof GoneException) {
        console.log(`Connection ${connectionId} is gone`);
        return false;
      }
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async broadcast(connectionIds: string[], data: any): Promise<void> {
    await Promise.allSettled(
      connectionIds.map((id) => this.sendMessage(id, data))
    );
  }
}

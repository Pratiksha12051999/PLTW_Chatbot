import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  ScanCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { Conversation, Connection, Message } from '../types/index.js';

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE!;
const CONVERSATIONS_TABLE = process.env.CONVERSATIONS_TABLE!;

export class DynamoDBService {
  async saveConnection(connection: Connection): Promise<void> {
    await docClient.send(
      new PutCommand({
        TableName: CONNECTIONS_TABLE,
        Item: connection,
      })
    );
  }

  async getConnection(connectionId: string): Promise<Connection | null> {
    const result = await docClient.send(
      new GetCommand({
        TableName: CONNECTIONS_TABLE,
        Key: { connectionId },
      })
    );
    return (result.Item as Connection) || null;
  }

  async deleteConnection(connectionId: string): Promise<void> {
    await docClient.send(
      new DeleteCommand({
        TableName: CONNECTIONS_TABLE,
        Key: { connectionId },
      })
    );
  }

  async saveConversation(conversation: Conversation): Promise<void> {
    await docClient.send(
      new PutCommand({
        TableName: CONVERSATIONS_TABLE,
        Item: conversation,
      })
    );
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    const result = await docClient.send(
      new GetCommand({
        TableName: CONVERSATIONS_TABLE,
        Key: { conversationId },
      })
    );
    return (result.Item as Conversation) || null;
  }

  async updateConversation(
    conversationId: string,
    updates: Partial<Conversation>
  ): Promise<void> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value], index) => {
      updateExpressions.push(`#attr${index} = :val${index}`);
      expressionAttributeNames[`#attr${index}`] = key;
      expressionAttributeValues[`:val${index}`] = value;
    });

    await docClient.send(
      new UpdateCommand({
        TableName: CONVERSATIONS_TABLE,
        Key: { conversationId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
      })
    );
  }

  async addMessageToConversation(
    conversationId: string,
    message: Message
  ): Promise<void> {
    await docClient.send(
      new UpdateCommand({
        TableName: CONVERSATIONS_TABLE,
        Key: { conversationId },
        UpdateExpression:
          'SET messages = list_append(if_not_exists(messages, :empty), :message)',
        ExpressionAttributeValues: {
          ':message': [message],
          ':empty': [],
        },
      })
    );
  }

  async getConversationsByDateRange(
    startTime: number,
    endTime: number
  ): Promise<Conversation[]> {
    const result = await docClient.send(
      new ScanCommand({
        TableName: CONVERSATIONS_TABLE,
        FilterExpression: '#startTime BETWEEN :start AND :end',
        ExpressionAttributeNames: { '#startTime': 'startTime' },
        ExpressionAttributeValues: { ':start': startTime, ':end': endTime },
      })
    );
    return (result.Items as Conversation[]) || [];
  }

  async getAllConversations(limit: number = 100): Promise<Conversation[]> {
    const result = await docClient.send(
      new ScanCommand({
        TableName: CONVERSATIONS_TABLE,
      })
    );
    const conversations = (result.Items as Conversation[]) || [];
    // Sort by startTime descending (most recent first) and limit
    return conversations
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  }

  /**
   * Updates conversation category only if current category matches expected value.
   * Returns true if update succeeded, false if condition failed.
   */
  async updateCategoryIfMatch(
    conversationId: string,
    newCategory: string,
    expectedCurrentCategory: string
  ): Promise<boolean> {
    try {
      await docClient.send(
        new UpdateCommand({
          TableName: CONVERSATIONS_TABLE,
          Key: { conversationId },
          UpdateExpression: 'SET category = :newCategory',
          ConditionExpression: 'category = :expectedCategory OR attribute_not_exists(category)',
          ExpressionAttributeValues: {
            ':newCategory': newCategory,
            ':expectedCategory': expectedCurrentCategory,
          },
        })
      );
      return true;
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        // Category was already updated by another process
        return false;
      }
      throw error;
    }
  }
}

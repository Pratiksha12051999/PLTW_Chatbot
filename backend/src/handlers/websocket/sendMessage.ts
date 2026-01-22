import { APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBService } from '../../services/dynamodb.service.js';
import { BedrockService } from '../../services/bedrock.service.js';
import { WebSocketService } from '../../services/websocket.service.js';
import { TranslateService } from '../../services/translate.service.js';
import { CategorizationService } from '../../services/categorization.service.js';
import {
  Message,
  Conversation,
  ConversationCategory,
  WebSocketMessage,
  WebSocketMessageEvent,
} from '../../types/index.js';
import { v4 as uuidv4 } from 'uuid';

const dynamoDBService = new DynamoDBService();
const bedrockService = new BedrockService();
const translateService = new TranslateService();
const categorizationService = new CategorizationService(dynamoDBService);

export const handler = async (
  event: WebSocketMessageEvent
): Promise<APIGatewayProxyResultV2> => {
  const connectionId = event.requestContext.connectionId;
  const endpoint = `https://${event.requestContext.domainName}/${event.requestContext.stage}`;
  const wsService = new WebSocketService(endpoint);

  try {
    const body: WebSocketMessage = JSON.parse(event.body || '{}');
    const { message, conversationId: existingConversationId, action, category, language = 'en' } = body;

    console.log(`Received action: ${action} from connection: ${connectionId}`);
    console.log(`Language: ${language}`);

    if (action === 'escalate') {
      await handleEscalation(connectionId, existingConversationId!, wsService);
      return { statusCode: 200, body: 'Escalated' };
    }

    const connection = await dynamoDBService.getConnection(connectionId);
    if (!connection) {
      return { statusCode: 404, body: 'Connection not found' };
    }

    let conversation: Conversation;
    const conversationId = existingConversationId || uuidv4();

    if (existingConversationId) {
      const existing = await dynamoDBService.getConversation(existingConversationId);
      if (!existing) {
        return { statusCode: 404, body: 'Conversation not found' };
      }
      conversation = existing;
      
      // Update last activity time for existing conversations
      await dynamoDBService.updateConversation(existingConversationId, {
        lastActivityTime: Date.now(),
      });
    } else {
      conversation = {
        conversationId,
        userId: connection.userId,
        startTime: Date.now(),
        status: 'active',
        messages: [],
        category: (category as ConversationCategory) || 'general',
      };
      await dynamoDBService.saveConversation(conversation);

      // Fire-and-forget categorization for new conversations without FAQ category
      const shouldCategorize = !category || category.toLowerCase() === 'general';
      console.log(`[Categorization] Checking trigger condition - category: "${category}", shouldTrigger: ${shouldCategorize}`);
      if (shouldCategorize) {
        categorizationService.categorizeConversationAsync(conversationId, message!);
      }
    }

    const userMessage: Message = {
      messageId: uuidv4(),
      conversationId,
      content: message!,
      role: 'user',
      timestamp: Date.now(),
    };
    await dynamoDBService.addMessageToConversation(conversationId, userMessage);

    await wsService.sendMessage(connectionId, {
      type: 'message_received',
      message: userMessage,
    });

    // Translate user message to English if Spanish is selected
    let messageForBedrock = message!;
    if (language === 'es') {
      messageForBedrock = await translateService.translateToEnglish(message!);
      console.log(`Translated user message to English: ${messageForBedrock}`);
    }

    const { response, confidence, sources } = await bedrockService.invokeAgent(messageForBedrock, conversationId);

    // Translate response to Spanish if Spanish is selected
    let finalResponse = response;
    if (language === 'es') {
      finalResponse = await translateService.translateToSpanish(response);
      console.log(`Translated response to Spanish: ${finalResponse}`);
    }

    const assistantMessage: Message = {
      messageId: uuidv4(),
      conversationId,
      content: finalResponse,
      role: 'assistant',
      timestamp: Date.now(),
      metadata: { confidence, sources },
    };
    await dynamoDBService.addMessageToConversation(conversationId, assistantMessage);

    const messageCount = conversation.messages.length + 2;
    const shouldEscalate = bedrockService.shouldEscalate(confidence, messageCount);

    // Auto-escalate with 'no_answer' reason when confidence is very low
    if (confidence < 0.4 && conversation.status !== 'escalated') {
      await dynamoDBService.updateConversation(conversationId, {
        status: 'escalated',
        endTime: Date.now(),
        escalationReason: 'no_answer',
      });
    }

    await wsService.sendMessage(connectionId, {
      type: 'assistant_response',
      message: assistantMessage,
      shouldEscalate,
    });

    return { statusCode: 200, body: 'Message sent' };
  } catch (error) {
    console.error('Error handling message:', error);
    await wsService.sendMessage(connectionId, {
      type: 'error',
      message: 'Failed to process message',
    });
    return { statusCode: 500, body: 'Internal error' };
  }
};

async function handleEscalation(
  connectionId: string,
  conversationId: string,
  wsService: WebSocketService
): Promise<void> {
  await dynamoDBService.updateConversation(conversationId, {
    status: 'escalated',
    endTime: Date.now(),
    escalationReason: 'requested_agent',
  });

  await wsService.sendMessage(connectionId, {
    type: 'escalated',
    message: 'Connecting you to our Solution Center...',
    contactInfo: {
      phone: '877.335.7589',
      email: 'solutioncenter@pltw.org',
    },
  });
}

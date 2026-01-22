import { DynamoDBService } from '../../services/dynamodb.service.js';
import { BedrockService } from '../../services/bedrock.service.js';
import { WebSocketService } from '../../services/websocket.service.js';
import { EscalationService } from '../../services/escalation.service.js';
import { v4 as uuidv4 } from 'uuid';

const dynamoDBService = new DynamoDBService();
const bedrockService = new BedrockService();

export const handler = async (event: any) => {
  const connectionId = event.requestContext.connectionId;
  const endpoint = `https://${event.requestContext.domainName}/${event.requestContext.stage}`;
  const wsService = new WebSocketService(endpoint);

  try {
    const body = JSON.parse(event.body || '{}');
    const { message, conversationId: existingConversationId, action, category } = body;

    console.log(`Received message from connection: ${connectionId}`, { action, category });

    // Get connection
    const connection = await dynamoDBService.getConnection(connectionId);
    if (!connection) {
      console.error('Connection not found:', connectionId);
      return { statusCode: 404, body: 'Connection not found' };
    }

    // Get or create conversation
    let conversation;
    const conversationId = existingConversationId || uuidv4();

    if (existingConversationId) {
      const existing = await dynamoDBService.getConversation(existingConversationId);
      if (!existing) {
        console.error('Conversation not found:', existingConversationId);
        return { statusCode: 404, body: 'Conversation not found' };
      }
      conversation = existing;
    } else {
      conversation = {
        conversationId,
        userId: connection.userId,
        startTime: Date.now(),
        status: 'active',
        messages: [],
        category: category || 'General',
      };
      await dynamoDBService.saveConversation(conversation);
      console.log('Created new conversation:', conversationId);
    }

    // Save user message
    const userMessage = {
      messageId: uuidv4(),
      conversationId,
      content: message,
      role: 'user',
      timestamp: Date.now(),
    };

    await dynamoDBService.addMessageToConversation(conversationId, userMessage);

    // Send acknowledgment
    await wsService.sendMessage(connectionId, {
      type: 'message_received',
      message: userMessage,
    });

    // CHECK FOR ESCALATION
    const shouldEscalateNow = action === 'escalate' || EscalationService.shouldEscalate(message, action);

    if (shouldEscalateNow) {
      console.log('Escalation detected, adding to queue...');

      try {
        // Add to SQS queue
        const { queuePosition, ticketId } = await EscalationService.addToQueue({
          conversationId,
          userId: connection.userId,
          category: category || 'General',
          userMessage: message,
          timestamp: Date.now(),
          contactInfo: EscalationService.getContactInfo(),
        });

        // Update conversation status
        await dynamoDBService.updateConversation(conversationId, {
          status: 'escalated',
          escalationInfo: {
            ticketId,
            queuePosition,
            escalatedAt: Date.now(),
          },
        });

        // Create escalation message
        const escalationMessage = {
          messageId: uuidv4(),
          conversationId,
          content: `I understand you'd like to speak with a customer service representative. I've added you to our support queue.\n\n**Your Ticket Number:** ${ticketId}\n**Queue Position:** #${queuePosition}\n\nA representative will assist you shortly. Average wait time is approximately ${EscalationService.estimateWaitTime(queuePosition)} minutes.\n\n**Need immediate assistance?**\n📞 Phone: ${EscalationService.getContactInfo().phone}\n✉️ Email: ${EscalationService.getContactInfo().email}`,
          role: 'assistant',
          timestamp: Date.now(),
          metadata: {
            escalated: true,
            ticketId,
            queuePosition,
          },
        };

        await dynamoDBService.addMessageToConversation(conversationId, escalationMessage);

        // Send escalation response
        await wsService.sendMessage(connectionId, {
          type: 'escalated',
          message: escalationMessage,
          shouldEscalate: true,
          contactInfo: EscalationService.getContactInfo(),
          queueInfo: {
            ticketId,
            position: queuePosition,
            estimatedWait: EscalationService.estimateWaitTime(queuePosition),
          },
        });

        console.log('Escalation completed:', { ticketId, queuePosition });
        return { statusCode: 200, body: 'Escalated' };
      } catch (escalationError) {
        console.error('Error during escalation:', escalationError);
        // Continue with normal flow if escalation fails
      }
    }

    // Normal flow - call Bedrock
    console.log('Calling Bedrock agent...');
    const { response, confidence, sources } = await bedrockService.invokeAgent(
      message,
      conversationId
    );

    const assistantMessage = {
      messageId: uuidv4(),
      conversationId,
      content: response,
      role: 'assistant',
      timestamp: Date.now(),
      metadata: { confidence, sources },
    };

    await dynamoDBService.addMessageToConversation(conversationId, assistantMessage);

    // Check if should suggest escalation based on confidence
    const messageCount = conversation.messages.length + 2;
    const shouldSuggestEscalation = bedrockService.shouldEscalate(confidence, messageCount);

    await wsService.sendMessage(connectionId, {
      type: 'assistant_response',
      message: assistantMessage,
      shouldEscalate: shouldSuggestEscalation,
      contactInfo: shouldSuggestEscalation ? EscalationService.getContactInfo() : undefined,
    });

    console.log('Message processed successfully');
    return { statusCode: 200, body: 'Message sent' };

  } catch (error) {
    console.error('Error handling message:', error);

    try {
      await wsService.sendMessage(connectionId, {
        type: 'error',
        message: {
          messageId: uuidv4(),
          role: 'assistant',
          content: 'I encountered an error processing your message. Please try again or contact support.',
          timestamp: Date.now(),
        },
      });
    } catch (wsError) {
      console.error('Failed to send error message:', wsError);
    }

    return { statusCode: 500, body: 'Internal error' };
  }
};
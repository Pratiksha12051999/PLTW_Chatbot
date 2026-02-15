import { APIGatewayProxyResultV2 } from "aws-lambda";
import { DynamoDBService } from "../../services/dynamodb.service.js";
import { BedrockService } from "../../services/bedrock.service.js";
import { WebSocketService } from "../../services/websocket.service.js";
import { TranslateService } from "../../services/translate.service.js";
import { CategorizationService } from "../../services/categorization.service.js";
import { EscalationService } from "../../services/escalation.service.js";
import {
  Message,
  Conversation,
  ConversationCategory,
  WebSocketMessage,
  WebSocketMessageEvent,
} from "../../types/index.js";
import { v4 as uuidv4 } from "uuid";

const dynamoDBService = new DynamoDBService();
const bedrockService = new BedrockService();
const translateService = new TranslateService();
const categorizationService = new CategorizationService(dynamoDBService);

export const handler = async (
  event: WebSocketMessageEvent,
): Promise<APIGatewayProxyResultV2> => {
  const connectionId = event.requestContext.connectionId;
  const endpoint = `https://${event.requestContext.domainName}/${event.requestContext.stage}`;
  const wsService = new WebSocketService(endpoint);

  try {
    const body: WebSocketMessage = JSON.parse(event.body || "{}");
    const {
      message,
      conversationId: existingConversationId,
      action,
      category,
      language = "en",
    } = body;

    // ========= INPUT VALIDATION & SANITIZATION =========
    // Validate message length (max 5000 characters)
    if (message && message.length > 5000) {
      await wsService.sendMessage(connectionId, {
        type: "error",
        message: "Message too long. Maximum 5000 characters allowed.",
      });
      return { statusCode: 400, body: "Message too long" };
    }

    // Validate conversationId format (if provided)
    if (existingConversationId && !/^[a-f0-9-]{36}$/i.test(existingConversationId)) {
      await wsService.sendMessage(connectionId, {
        type: "error",
        message: "Invalid conversation ID format.",
      });
      return { statusCode: 400, body: "Invalid conversation ID" };
    }

    // Validate language parameter
    if (language && !["en", "es"].includes(language)) {
      await wsService.sendMessage(connectionId, {
        type: "error",
        message: "Invalid language. Supported: en, es.",
      });
      return { statusCode: 400, body: "Invalid language" };
    }

    // Sanitize message content (remove null bytes and control characters except newlines/tabs)
    const sanitizedMessage = message?.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '') || '';

    console.log("📨 ===== INCOMING MESSAGE =====");
    console.log("📨 Connection ID:", connectionId);
    console.log("📨 Action:", action);
    console.log("📨 Message length:", sanitizedMessage.length);
    console.log("📨 Conversation ID:", existingConversationId);
    console.log("📨 =============================");

    const connection = await dynamoDBService.getConnection(connectionId);
    if (!connection) {
      return { statusCode: 404, body: "Connection not found" };
    }

    let conversation: Conversation;
    const conversationId = existingConversationId || uuidv4();

    if (existingConversationId) {
      const existing = await dynamoDBService.getConversation(
        existingConversationId,
      );
      if (!existing) {
        return { statusCode: 404, body: "Conversation not found" };
      }
      conversation = existing;

      await dynamoDBService.updateConversation(existingConversationId, {
        lastActivityTime: Date.now(),
      });
    } else {
      conversation = {
        conversationId,
        userId: connection.userId,
        startTime: Date.now(),
        status: "active",
        messages: [],
        category: (category as ConversationCategory) || "general",
      };
      await dynamoDBService.saveConversation(conversation);

      const shouldCategorize =
        !category || category.toLowerCase() === "general";
      console.log(
        `[Categorization] Checking trigger condition - category: "${category}", shouldTrigger: ${shouldCategorize}`,
      );
      if (shouldCategorize) {
        categorizationService.categorizeConversationAsync(
          conversationId,
          sanitizedMessage,
        );
      }
    }

    // ========= ESCALATION CHECK =========
    console.log("🚨 ===== ESCALATION CHECK =====");
    console.log("🚨 Action received:", action);
    console.log("🚨 Message content:", message);

    const keywordEscalation = EscalationService.shouldEscalate(
      sanitizedMessage,
      action,
    );
    console.log("🚨 Keyword escalation triggered:", keywordEscalation);

    const shouldEscalateNow = action === "escalate" || keywordEscalation;
    console.log("🚨 Final shouldEscalateNow:", shouldEscalateNow);
    console.log("🚨 ==============================");

    if (shouldEscalateNow) {
      console.log("🎫 ===== ESCALATION TRIGGERED =====");
      console.log(
        "🎫 Reason:",
        action === "escalate" ? "EXPLICIT_ACTION" : "KEYWORD_DETECTION",
      );
      console.log("🎫 Conversation ID:", conversationId);
      console.log("🎫 User ID:", connection.userId);
      console.log("🎫 Language:", language); // Log the language
      console.log("🎫 Adding to escalation queue...");

      try {
        const escalationPayload = {
          conversationId,
          userId: connection.userId,
          category: (category as ConversationCategory) || "general",
          userMessage: sanitizedMessage,
          timestamp: Date.now(),
          contactInfo: EscalationService.getContactInfo(),
        };

        console.log(
          "🎫 Escalation payload:",
          JSON.stringify(escalationPayload, null, 2),
        );

        const { queuePosition, ticketId } =
          await EscalationService.addToQueue(escalationPayload);

        console.log("✅ ===== ESCALATION SUCCESS =====");
        console.log("✅ Ticket ID:", ticketId);
        console.log("✅ Queue Position:", queuePosition);
        console.log(
          "✅ Estimated Wait:",
          EscalationService.estimateWaitTime(queuePosition),
          "minutes",
        );
        console.log("✅ ================================");

        // Update conversation status with escalation info
        await dynamoDBService.updateConversation(conversationId, {
          status: "escalated",
          endTime: Date.now(),
          escalationReason:
            action === "escalate" ? "requested_agent" : "no_answer",
          escalationInfo: {
            ticketId,
            queuePosition,
            escalatedAt: Date.now(),
          },
        });

        console.log("✅ Conversation updated with escalation status");

        // Create escalation message with appropriate language
        const escalationMessage: Message = {
          messageId: uuidv4(),
          conversationId,
          content: EscalationService.getEscalationMessage(
            ticketId,
            queuePosition,
            language, // ← Pass the language parameter
          ),
          role: "assistant",
          timestamp: Date.now(),
          metadata: {
            escalated: true,
            ticketId,
            queuePosition,
          },
        };

        await dynamoDBService.addMessageToConversation(
          conversationId,
          escalationMessage,
        );
        console.log("✅ Escalation message saved to conversation");

        // Send escalation response
        await wsService.sendMessage(connectionId, {
          type: "escalated",
          message: escalationMessage,
          shouldEscalate: true,
          contactInfo: EscalationService.getContactInfo(),
          queueInfo: {
            ticketId,
            position: queuePosition,
            estimatedWait: EscalationService.estimateWaitTime(queuePosition),
          },
        });

        console.log("✅ Escalation response sent to client");
        console.log("🎫 ===== ESCALATION COMPLETE =====");
        return { statusCode: 200, body: "Escalated" };
      } catch (escalationError) {
        console.error("❌ ===== ESCALATION FAILED =====");
        console.error("❌ Error:", escalationError);
        console.error("❌ Error message:", (escalationError as Error).message);
        console.error("❌ Stack trace:", (escalationError as Error).stack);
        console.error("❌ ===============================");
        // Continue with normal flow if escalation fails
      }
    }

    const userMessage: Message = {
      messageId: uuidv4(),
      conversationId,
      content: sanitizedMessage,
      role: "user",
      timestamp: Date.now(),
    };
    await dynamoDBService.addMessageToConversation(conversationId, userMessage);

    await wsService.sendMessage(connectionId, {
      type: "message_received",
      message: userMessage,
    });

    // Translate user message to English if Spanish is selected
    let messageForBedrock = sanitizedMessage;
    if (language === "es") {
      messageForBedrock = await translateService.translateToEnglish(sanitizedMessage);
      console.log(`Translated user message to English: ${messageForBedrock}`);
    }

    const { response, confidence, sources } = await bedrockService.invokeAgent(
      messageForBedrock,
      conversationId,
    );

    // Translate response to Spanish if Spanish is selected
    let finalResponse = response;
    if (language === "es") {
      finalResponse = await translateService.translateToSpanish(response);
      console.log(`Translated response to Spanish: ${finalResponse}`);
    }

    const assistantMessage: Message = {
      messageId: uuidv4(),
      conversationId,
      content: finalResponse,
      role: "assistant",
      timestamp: Date.now(),
      metadata: { confidence, sources },
    };
    await dynamoDBService.addMessageToConversation(
      conversationId,
      assistantMessage,
    );

    const messageCount = conversation.messages.length + 2;
    const shouldEscalate = bedrockService.shouldEscalate(
      confidence,
      messageCount,
    );

    // Auto-escalate with 'no_answer' reason when confidence is very low
    if (confidence < 0.4 && conversation.status !== "escalated") {
      await dynamoDBService.updateConversation(conversationId, {
        status: "escalated",
        endTime: Date.now(),
        escalationReason: "no_answer",
      });
    }

    await wsService.sendMessage(connectionId, {
      type: "assistant_response",
      message: assistantMessage,
      shouldEscalate,
      contactInfo: shouldEscalate
        ? EscalationService.getContactInfo()
        : undefined,
    });

    return { statusCode: 200, body: "Message sent" };
  } catch (error) {
    console.error("Error handling message:", error);

    try {
      await wsService.sendMessage(connectionId, {
        type: "error",
        message: "Failed to process message",
      });
    } catch (wsError) {
      console.error("Failed to send error message:", wsError);
    }

    return { statusCode: 500, body: "Internal error" };
  }
};

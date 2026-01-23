import {
  SQSClient,
  SendMessageCommand,
  GetQueueAttributesCommand,
} from "@aws-sdk/client-sqs";

console.log("=== ESCALATION SERVICE MODULE LOADING ===");
console.log(
  "ESCALATION_QUEUE_URL:",
  process.env.ESCALATION_QUEUE_URL ? "✅ SET" : "❌ MISSING",
);
console.log("AWS_REGION:", process.env.AWS_REGION || "❌ MISSING");

const QUEUE_URL = process.env.ESCALATION_QUEUE_URL;

if (!QUEUE_URL) {
  console.error("❌ CRITICAL ERROR: Missing ESCALATION_QUEUE_URL");
  throw new Error(
    "Missing required environment variable: ESCALATION_QUEUE_URL",
  );
}

const sqsClient = new SQSClient({ region: process.env.AWS_REGION });

interface EscalationTicket {
  conversationId: string;
  userId: string;
  category: string;
  userMessage: string;
  timestamp: number;
  contactInfo: {
    phone: string;
    email: string;
  };
}

export class EscalationService {
  /**
   * Add user to escalation queue
   */
  static async addToQueue(
    ticket: EscalationTicket,
  ): Promise<{ queuePosition: number; ticketId: string }> {
    console.log("🔧 ===== ADD TO QUEUE START =====");
    console.log("🔧 Ticket:", JSON.stringify(ticket, null, 2));
    console.log("🔧 Queue URL:", QUEUE_URL);

    try {
      // Get current queue size
      console.log("🔧 Getting current queue size...");
      const queuePosition = await this.getQueueSize();
      console.log("🔧 Current queue size:", queuePosition);

      // Create unique ticket ID
      const ticketId = `TICKET-${Date.now()}-${ticket.userId.substring(0, 8)}`;
      console.log("🔧 Generated ticket ID:", ticketId);

      const messageBody = {
        ticketId,
        ...ticket,
        queuePosition: queuePosition + 1,
        addedAt: Date.now(),
      };

      console.log("🔧 SQS Message Body:", JSON.stringify(messageBody, null, 2));

      // Send message to SQS with FIFO
      const command = new SendMessageCommand({
        QueueUrl: QUEUE_URL,
        MessageBody: JSON.stringify(messageBody),
        MessageGroupId: "escalations",
        MessageDeduplicationId: `${ticket.conversationId}-${Date.now()}`,
        MessageAttributes: {
          conversationId: {
            DataType: "String",
            StringValue: ticket.conversationId,
          },
          category: {
            DataType: "String",
            StringValue: ticket.category,
          },
          priority: {
            DataType: "String",
            StringValue: "normal",
          },
        },
      });

      console.log("🔧 Sending message to SQS...");
      const result = await sqsClient.send(command);
      console.log("✅ SQS Message sent successfully");
      console.log("✅ Message ID:", result.MessageId);

      console.log(
        `✅ Added ticket ${ticketId} to queue at position ${queuePosition + 1}`,
      );
      console.log("🔧 ===== ADD TO QUEUE END =====");

      return {
        queuePosition: queuePosition + 1,
        ticketId,
      };
    } catch (error) {
      console.error("❌ ===== ADD TO QUEUE ERROR =====");
      console.error("❌ Error:", error);
      console.error("❌ Error name:", (error as Error).name);
      console.error("❌ Error message:", (error as Error).message);
      console.error("❌ Stack:", (error as Error).stack);
      console.error("❌ ================================");
      throw error;
    }
  }

  /**
   * Get current queue size
   */
  static async getQueueSize(): Promise<number> {
    console.log("📊 Getting queue size from:", QUEUE_URL);
    try {
      const command = new GetQueueAttributesCommand({
        QueueUrl: QUEUE_URL,
        AttributeNames: ["ApproximateNumberOfMessages"],
      });

      const response = await sqsClient.send(command);
      const count = response.Attributes?.ApproximateNumberOfMessages || "0";
      console.log("📊 Queue size:", count);

      return parseInt(count, 10);
    } catch (error) {
      console.error("❌ Error getting queue size:", error);
      return 0;
    }
  }

  /**
   * Check if message should trigger escalation (supports English and Spanish)
   */
  static shouldEscalate(userMessage: string, action?: string): boolean {
    console.log("🔍 ===== CHECKING ESCALATION KEYWORDS =====");
    console.log("🔍 User message:", userMessage);
    console.log("🔍 Action:", action);

    // Check if explicit escalation action
    if (action === "escalate") {
      console.log("✅ Explicit escalation action detected");
      return true;
    }

    // English keywords
    const englishKeywords = [
      "speak to agent",
      "talk to human",
      "customer service",
      "customer support",
      "need help",
      "talk to representative",
      "speak to someone",
      "real person",
      "human agent",
      "escalate",
      "manager",
      "supervisor",
      "speak with someone",
      "talk to someone",
      "connect me",
      "transfer me",
    ];

    // Spanish keywords
    const spanishKeywords = [
      "hablar con agente",
      "hablar con un agente",
      "hablar con humano",
      "hablar con persona",
      "servicio al cliente",
      "atención al cliente",
      "necesito ayuda",
      "hablar con representante",
      "hablar con alguien",
      "persona real",
      "agente humano",
      "escalar",
      "gerente",
      "supervisor",
      "conectarme",
      "transferirme",
      "quiero hablar",
      "necesito hablar",
      "hablar en español",
      "asistente humano",
      "operador",
    ];

    const allKeywords = [...englishKeywords, ...spanishKeywords];
    const messageLower = userMessage.toLowerCase();
    console.log("🔍 Message (lowercase):", messageLower);

    for (const keyword of allKeywords) {
      if (messageLower.includes(keyword)) {
        console.log(`✅ ESCALATION KEYWORD MATCH: "${keyword}"`);
        return true;
      }
    }

    console.log("❌ No escalation keywords found");
    console.log("🔍 ==========================================");
    return false;
  }

  /**
   * Get contact information
   */
  static getContactInfo() {
    return {
      phone: "877.335.7589",
      email: "solutioncenter@pltw.org",
    };
  }

  /**
   * Get escalation message in the appropriate language
   */
  static getEscalationMessage(
    ticketId: string,
    queuePosition: number,
    language: string = "en",
  ): string {
    const waitTime = this.estimateWaitTime(queuePosition);
    const contactInfo = this.getContactInfo();

    if (language === "es") {
      return `Entiendo que le gustaría hablar con un representante de servicio al cliente. Lo he agregado a nuestra cola de soporte.

**Su Número de Ticket:** ${ticketId}
**Posición en la Cola:** #${queuePosition}

Un representante lo atenderá en breve. El tiempo de espera promedio es de aproximadamente ${waitTime} minutos.

**¿Necesita asistencia inmediata?**
📞 Teléfono: ${contactInfo.phone}
✉️ Correo electrónico: ${contactInfo.email}`;
    }

    // Default: English
    return `I understand you'd like to speak with a customer service representative. I've added you to our support queue.

**Your Ticket Number:** ${ticketId}
**Queue Position:** #${queuePosition}

A representative will assist you shortly. Average wait time is approximately ${waitTime} minutes.

**Need immediate assistance?**
📞 Phone: ${contactInfo.phone}
✉️ Email: ${contactInfo.email}`;
  }

  /**
   * Estimate wait time based on queue position
   */
  static estimateWaitTime(position: number): number {
    return position * 5; // 5 minutes per person
  }
}

import { SQSClient, SendMessageCommand, GetQueueAttributesCommand } from '@aws-sdk/client-sqs';

const sqsClient = new SQSClient({ region: process.env.AWS_REGION });
const QUEUE_URL = process.env.ESCALATION_QUEUE_URL || '';

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
  static async addToQueue(ticket: EscalationTicket): Promise<{ queuePosition: number; ticketId: string }> {
    try {
      // Get current queue size
      const queuePosition = await this.getQueueSize();

      // Create unique ticket ID
      const ticketId = `TICKET-${Date.now()}-${ticket.userId.substring(0, 8)}`;

      // Send message to SQS with FIFO
      const command = new SendMessageCommand({
        QueueUrl: QUEUE_URL,
        MessageBody: JSON.stringify({
          ticketId,
          ...ticket,
          queuePosition: queuePosition + 1,
          addedAt: Date.now(),
        }),
        MessageGroupId: 'escalations',
        MessageDeduplicationId: `${ticket.conversationId}-${Date.now()}`,
        MessageAttributes: {
          conversationId: {
            DataType: 'String',
            StringValue: ticket.conversationId,
          },
          category: {
            DataType: 'String',
            StringValue: ticket.category,
          },
          priority: {
            DataType: 'String',
            StringValue: 'normal',
          },
        },
      });

      await sqsClient.send(command);

      console.log(`Added ticket ${ticketId} to queue at position ${queuePosition + 1}`);

      return {
        queuePosition: queuePosition + 1,
        ticketId,
      };
    } catch (error) {
      console.error('Error adding to escalation queue:', error);
      throw error;
    }
  }

  /**
   * Get current queue size
   */
  static async getQueueSize(): Promise<number> {
    try {
      const command = new GetQueueAttributesCommand({
        QueueUrl: QUEUE_URL,
        AttributeNames: ['ApproximateNumberOfMessages'],
      });

      const response = await sqsClient.send(command);
      const count = response.Attributes?.ApproximateNumberOfMessages || '0';

      return parseInt(count, 10);
    } catch (error) {
      console.error('Error getting queue size:', error);
      return 0;
    }
  }

  /**
   * Check if message should trigger escalation
   */
  static shouldEscalate(userMessage: string, action?: string): boolean {
    // Check if explicit escalation action
    if (action === 'escalate') {
      return true;
    }

    const escalationKeywords = [
      'speak to agent',
      'talk to human',
      'customer service',
      'customer support',
      'need help',
      'talk to representative',
      'speak to someone',
      'real person',
      'human agent',
      'escalate',
      'manager',
      'supervisor',
    ];

    const messageLower = userMessage.toLowerCase();

    return escalationKeywords.some(keyword =>
      messageLower.includes(keyword)
    );
  }

  /**
   * Get contact information
   */
  static getContactInfo() {
    return {
      phone: '877.335.7589',
      email: 'solutioncenter@pltw.org',
    };
  }

  /**
   * Estimate wait time based on queue position
   */
  static estimateWaitTime(position: number): number {
    return position * 5; // 5 minutes per person
  }
}
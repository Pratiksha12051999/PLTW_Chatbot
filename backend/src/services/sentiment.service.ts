import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { Conversation } from '../types/index.js';
import { DynamoDBService } from './dynamodb.service.js';

const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

export type SentimentResult = 'positive' | 'negative' | 'neutral';

/**
 * Configuration for Amazon Nova Pro model invocation for sentiment analysis.
 */
const NOVA_PRO_CONFIG = {
  modelId: process.env.NOVA_PRO_MODEL_ID || 'amazon.nova-pro-v1:0',
  maxTokens: 10,
  temperature: 0,
  timeout: 15000, // 15 second timeout for longer conversations
};

/**
 * Prompt template for sentiment analysis.
 * Analyzes the entire conversation to determine overall user sentiment.
 */
const SENTIMENT_PROMPT = `You are an expert sentiment analyzer for customer support conversations. Your task is to determine the overall sentiment of the USER based on the entire conversation.

CONVERSATION:
{conversation}

ANALYSIS CRITERIA:

POSITIVE - The user's sentiment is positive if:
• The user explicitly thanks the assistant or expresses gratitude
• The user indicates their question was answered satisfactorily
• The user uses positive language like "great", "helpful", "thanks", "perfect", "awesome"
• The user's tone becomes more relaxed or friendly as the conversation progresses
• The user indicates they got what they needed
• The conversation ends with the user seeming satisfied

NEGATIVE - The user's sentiment is negative if:
• The user expresses frustration, anger, or disappointment
• The user says the answer wasn't helpful or didn't solve their problem
• The user uses negative language like "useless", "unhelpful", "frustrated", "annoyed"
• The user requests to speak to a human agent due to dissatisfaction
• The user complains about the quality of responses
• The conversation ends with unresolved issues and user frustration

NEUTRAL - The user's sentiment is neutral if:
• The conversation is purely informational with no emotional indicators
• The user asks questions without expressing satisfaction or dissatisfaction
• The conversation is incomplete or abandoned without clear sentiment
• The user's responses are brief and factual without emotional content
• Cannot clearly determine positive or negative sentiment

IMPORTANT RULES:
1. Focus ONLY on the USER's messages and reactions, not the assistant's responses
2. Consider the ENTIRE conversation flow, not just individual messages
3. If the user gave explicit feedback (thumbs up/down), that takes precedence
4. When in doubt between positive and neutral, choose neutral
5. When in doubt between negative and neutral, choose neutral
6. A single negative comment in an otherwise positive conversation = neutral
7. Escalation requests alone don't mean negative - check the user's tone

YOUR ANSWER (one word only - positive, negative, or neutral):`;

export class SentimentService {
  private dynamoDBService: DynamoDBService;

  constructor(dynamoDBService?: DynamoDBService) {
    this.dynamoDBService = dynamoDBService || new DynamoDBService();
  }

  /**
   * Analyzes the sentiment of a conversation using Nova Pro.
   * Returns 'positive', 'negative', or 'neutral'.
   */
  async analyzeConversationSentiment(conversation: Conversation): Promise<SentimentResult> {
    const logContext = {
      conversationId: conversation.conversationId,
      messageCount: conversation.messages?.length ?? 0,
    };

    // If user already gave explicit feedback, use that
    if (conversation.satisfaction) {
      console.log('[Sentiment] Using explicit user feedback', {
        ...logContext,
        satisfaction: conversation.satisfaction,
      });
      return conversation.satisfaction as SentimentResult;
    }

    // Need at least one message to analyze
    if (!conversation.messages || conversation.messages.length === 0) {
      console.log('[Sentiment] No messages to analyze', logContext);
      return 'neutral';
    }

    console.log('[Sentiment] Analyzing conversation sentiment', logContext);

    try {
      const conversationText = this.formatConversationForAnalysis(conversation);
      const sentiment = await this.invokeNovaProForSentiment(conversationText);

      console.log('[Sentiment] Analysis successful', {
        ...logContext,
        sentiment,
      });

      return sentiment;
    } catch (error) {
      console.error('[Sentiment] Analysis failed', {
        ...logContext,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.name : 'Unknown',
      });
      return 'neutral';
    }
  }

  /**
   * Formats conversation messages for sentiment analysis.
   */
  private formatConversationForAnalysis(conversation: Conversation): string {
    return conversation.messages
      .map((msg) => {
        const role = msg.role === 'user' ? 'USER' : 'ASSISTANT';
        return `${role}: ${msg.content}`;
      })
      .join('\n\n');
  }

  /**
   * Invokes Nova Pro with the sentiment analysis prompt.
   */
  private async invokeNovaProForSentiment(conversationText: string): Promise<SentimentResult> {
    const prompt = SENTIMENT_PROMPT.replace('{conversation}', conversationText);

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      NOVA_PRO_CONFIG.timeout
    );

    try {
      const command = new InvokeModelCommand({
        modelId: NOVA_PRO_CONFIG.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: [{ text: prompt }],
            },
          ],
          inferenceConfig: {
            max_new_tokens: NOVA_PRO_CONFIG.maxTokens,
            temperature: NOVA_PRO_CONFIG.temperature,
          },
        }),
      });

      const response = await bedrockClient.send(command, {
        abortSignal: controller.signal,
      });

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      console.log('[Sentiment] Nova Pro raw response:', JSON.stringify(responseBody));

      let responseText = '';
      if (responseBody.output?.message?.content?.[0]?.text) {
        responseText = responseBody.output.message.content[0].text;
      } else if (typeof responseBody.output?.message?.content === 'string') {
        responseText = responseBody.output.message.content;
      }

      return this.parseSentiment(responseText);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Parses the model response to extract a valid sentiment.
   */
  private parseSentiment(response: string): SentimentResult {
    if (!response) {
      return 'neutral';
    }

    const normalized = response.trim().toLowerCase();

    if (normalized === 'positive') return 'positive';
    if (normalized === 'negative') return 'negative';
    if (normalized === 'neutral') return 'neutral';

    // Default to neutral if response is unexpected
    console.log('[Sentiment] Unexpected response, defaulting to neutral:', response);
    return 'neutral';
  }

  /**
   * Analyzes and updates sentiment for a conversation.
   * Called after conversation timeout (10 minutes of inactivity).
   */
  async analyzeAndUpdateSentiment(conversationId: string): Promise<SentimentResult> {
    const conversation = await this.dynamoDBService.getConversation(conversationId);

    if (!conversation) {
      console.log('[Sentiment] Conversation not found:', conversationId);
      return 'neutral';
    }

    const sentiment = await this.analyzeConversationSentiment(conversation);

    // Update conversation with sentiment if not already set by user feedback
    if (!conversation.satisfaction) {
      await this.dynamoDBService.updateConversation(conversationId, {
        sentiment,
        status: 'resolved',
        endTime: Date.now(),
      });

      console.log('[Sentiment] Updated conversation sentiment', {
        conversationId,
        sentiment,
      });
    }

    return sentiment;
  }
}

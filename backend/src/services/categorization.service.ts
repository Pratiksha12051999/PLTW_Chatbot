import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { ConversationCategory } from '../types/index.js';
import { DynamoDBService } from './dynamodb.service.js';
import {
  VALID_CATEGORIES,
  CLASSIFICATION_PROMPT,
  NOVA_PRO_CONFIG,
} from './categorization.constants.js';

const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

export class CategorizationService {
  private dynamoDBService: DynamoDBService;

  constructor(dynamoDBService?: DynamoDBService) {
    this.dynamoDBService = dynamoDBService || new DynamoDBService();
  }

  /**
   * Classifies a message into one of the predefined categories.
   * Returns the category name or "Others" if classification fails.
   */
  async classifyMessage(message: string, conversationId?: string): Promise<ConversationCategory> {
    const logContext = {
      conversationId: conversationId || 'unknown',
      messageLength: message?.length ?? 0,
    };

    // Handle empty or invalid messages
    if (!message || message.trim().length === 0) {
      console.log('[Categorization] Skipping classification for empty message', logContext);
      return 'Others';
    }

    console.log('[Categorization] Attempting classification', logContext);

    try {
      const response = await this.invokeNovaProWithTimeout(message);
      const category = this.parseCategory(response);

      console.log('[Categorization] Classification successful', {
        ...logContext,
        category,
      });

      return category;
    } catch (error) {
      console.error('[Categorization] Classification failed', {
        ...logContext,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.name : 'Unknown',
      });
      return 'Others';
    }
  }

  /**
   * Triggers background categorization for a conversation.
   * Fire-and-forget - does not block on completion.
   */
  categorizeConversationAsync(
    conversationId: string,
    firstMessage: string
  ): void {
    console.log('[Categorization] Starting background categorization', {
      conversationId,
      messageLength: firstMessage.length,
    });

    this.classifyAndUpdate(conversationId, firstMessage).catch((error) => {
      console.error('[Categorization] Background categorization failed', {
        conversationId,
        messageLength: firstMessage.length,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.name : 'Unknown',
      });
    });
  }

  /**
   * Internal method to classify and update the conversation.
   */
  private async classifyAndUpdate(
    conversationId: string,
    firstMessage: string
  ): Promise<void> {
    const category = await this.classifyMessage(firstMessage, conversationId);
    
    try {
      const updated = await this.dynamoDBService.updateCategoryIfMatch(
        conversationId,
        category,
        'general'
      );

      if (updated) {
        console.log('[Categorization] Category update successful', {
          conversationId,
          messageLength: firstMessage.length,
          category,
        });
      } else {
        console.log('[Categorization] Category update skipped (condition not met)', {
          conversationId,
          messageLength: firstMessage.length,
          category,
        });
      }
    } catch (error) {
      console.error('[Categorization] DynamoDB update failed', {
        conversationId,
        messageLength: firstMessage.length,
        category,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.name : 'Unknown',
      });
    }
  }

  /**
   * Invokes Nova Pro with a classification prompt and timeout.
   */
  private async invokeNovaProWithTimeout(message: string): Promise<string> {
    const prompt = CLASSIFICATION_PROMPT.replace('{message}', message);

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
              content: [{ type: 'text', text: prompt }],
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
      
      // Extract text from Nova Pro response format
      if (responseBody.output?.message?.content?.[0]?.text) {
        return responseBody.output.message.content[0].text;
      }
      
      return '';
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Parses the model response to extract a valid category.
   * Handles case-insensitive matching and defaults to "Others".
   */
  parseCategory(response: string | null | undefined): ConversationCategory {
    if (!response) {
      return 'Others';
    }
    
    const normalized = response.trim();
    if (!normalized) {
      return 'Others';
    }
    
    const matched = VALID_CATEGORIES.find(
      (cat) => cat.toLowerCase() === normalized.toLowerCase()
    );

    return matched || 'Others';
  }
}

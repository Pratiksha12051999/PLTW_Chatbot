import { ConversationCategory } from '../types';

/**
 * Valid categories for conversation classification.
 * Excludes 'general' as it's the default/uncategorized state.
 */
export const VALID_CATEGORIES: ConversationCategory[] = [
  'Implementation',
  'Rostering',
  'Training',
  'Payment',
  'Grants',
  'Others',
];

/**
 * Prompt template for Nova Pro classification.
 * The {message} placeholder will be replaced with the actual user message.
 */
export const CLASSIFICATION_PROMPT = `You are a conversation classifier for a PLTW (Project Lead The Way) educational support chatbot.

Classify the following user message into exactly ONE of these categories:
- Implementation: Questions about implementing PLTW programs in schools
- Rostering: Questions about student rosters, enrollment, or SIS integration
- Training: Questions about professional development, teacher training, or certifications
- Payment: Questions about fees, billing, invoices, or payment methods
- Grants: Questions about funding, grants, or financial assistance
- Others: Messages that don't fit any of the above categories

User message: "{message}"

Respond with ONLY the category name, nothing else.`;

/**
 * Configuration for Amazon Nova Pro model invocation.
 */
export const NOVA_PRO_CONFIG = {
  modelId: process.env.NOVA_PRO_MODEL_ID || 'amazon.nova-pro-v1:0',
  maxTokens: 50, // Category name only
  temperature: 0, // Deterministic output
  timeout: 10000, // 10 second timeout
};

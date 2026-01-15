import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';

const translateClient = new TranslateClient({ region: process.env.AWS_REGION });

export class TranslateService {
  /**
   * Translates text from one language to another using AWS Translate
   * @param text - The text to translate
   * @param sourceLanguage - Source language code (e.g., 'es', 'en', 'auto')
   * @param targetLanguage - Target language code (e.g., 'en', 'es')
   * @returns Translated text
   */
  async translateText(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<string> {
    // Skip translation if source and target are the same
    if (sourceLanguage === targetLanguage) {
      return text;
    }

    // Skip translation for empty text
    if (!text || text.trim().length === 0) {
      return text;
    }

    try {
      const command = new TranslateTextCommand({
        Text: text,
        SourceLanguageCode: sourceLanguage,
        TargetLanguageCode: targetLanguage,
      });

      const response = await translateClient.send(command);
      return response.TranslatedText || text;
    } catch (error) {
      console.error('Translation error:', error);
      // Return original text if translation fails
      return text;
    }
  }

  /**
   * Translates user message from Spanish to English for Bedrock processing
   */
  async translateToEnglish(text: string): Promise<string> {
    return this.translateText(text, 'es', 'en');
  }

  /**
   * Translates assistant response from English to Spanish for user display
   */
  async translateToSpanish(text: string): Promise<string> {
    return this.translateText(text, 'en', 'es');
  }
}

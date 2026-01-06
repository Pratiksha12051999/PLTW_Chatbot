import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
} from '@aws-sdk/client-bedrock-agent-runtime';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { FileAttachment } from '../types/index.js';
import mammoth from 'mammoth';

const agentClient = new BedrockAgentRuntimeClient({ region: process.env.AWS_REGION });
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
const s3Client = new S3Client({ region: process.env.AWS_REGION });

const AGENT_ID = process.env.BEDROCK_AGENT_ID || '';
const AGENT_ALIAS_ID = process.env.BEDROCK_AGENT_ALIAS_ID || '';
const UPLOADS_BUCKET = process.env.UPLOADS_BUCKET!;

// Amazon Titan model for text analysis
const TITAN_MODEL_ID = 'amazon.titan-text-express-v1';

// Check if Bedrock Agent is configured
const HAS_BEDROCK_AGENT = AGENT_ID && AGENT_ALIAS_ID;

// Supported media types
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
// PDFs and documents need text extraction
const DOCUMENT_TYPES_FOR_TEXT_EXTRACTION = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

export class BedrockService {
  /**
   * Invokes the Bedrock Agent for text-only queries
   * Falls back to Titan if no agent is configured
   */
  async invokeAgent(
    prompt: string,
    sessionId: string
  ): Promise<{ response: string; confidence: number; sources: string[] }> {
    // If no Bedrock Agent is configured, use Titan directly
    if (!HAS_BEDROCK_AGENT) {
      console.log('No Bedrock Agent configured, using Titan directly');
      return this.invokeTitan(prompt);
    }
    
    try {
      const command = new InvokeAgentCommand({
        agentId: AGENT_ID,
        agentAliasId: AGENT_ALIAS_ID,
        sessionId,
        inputText: prompt,
      });

      const response = await agentClient.send(command);
      let fullResponse = '';
      const sources: string[] = [];
      let confidence = 1.0;

      if (response.completion) {
        for await (const event of response.completion) {
          if (event.chunk?.bytes) {
            const text = new TextDecoder().decode(event.chunk.bytes);
            fullResponse += text;
          }

          if (event.trace?.trace?.orchestrationTrace) {
            const trace = event.trace.trace.orchestrationTrace;
            if (trace.observation?.knowledgeBaseLookupOutput?.retrievedReferences) {
              trace.observation.knowledgeBaseLookupOutput.retrievedReferences.forEach(
                (ref: any) => {
                  if (ref.location?.s3Location) {
                    sources.push(ref.location.s3Location.uri);
                  }
                }
              );
            }
          }
        }
      }

      if (fullResponse.length < 50) {
        confidence = 0.5;
      }

      const lowConfidencePatterns = [
        "I don't have",
        "I cannot find",
        "I'm not sure",
        'I apologize',
        'I do not have access',
      ];
      if (lowConfidencePatterns.some((pattern) => fullResponse.includes(pattern))) {
        confidence = 0.3;
      }

      return {
        response: fullResponse || 'I apologize, but I was unable to generate a response. Please contact our support team.',
        confidence,
        sources: [...new Set(sources)],
      };
    } catch (error) {
      console.error('Bedrock invocation error:', error);
      return {
        response: 'I encountered an error processing your request. Please try again or contact support.',
        confidence: 0,
        sources: [],
      };
    }
  }

  /**
   * Analyzes files using Amazon Titan text model
   * Extracts text from PDFs and Word docs, then sends to Titan
   */
  async analyzeWithAttachments(
    prompt: string,
    attachments: FileAttachment[]
  ): Promise<{ response: string; confidence: number; sources: string[] }> {
    console.log('=== analyzeWithAttachments START ===');
    console.log('Prompt:', prompt);
    console.log('Attachments count:', attachments.length);
    
    try {
      // Build the text prompt with file information - keep it concise for faster processing
      let fullPrompt = `You are Jordan, a PLTW support assistant. Analyze the uploaded file and answer the user's question concisely.

`;

      // Process each attachment - limit text extraction for faster processing
      const MAX_TEXT_LENGTH = 8000; // Reduced from 15000 for faster processing
      
      for (const attachment of attachments) {
        console.log(`Processing attachment: ${attachment.filename} (${attachment.contentType})`);
        
        const fileContent = await this.fetchFileFromS3(attachment.s3Key);
        console.log(`Fetched file content, size: ${fileContent.length} bytes`);

        if (attachment.contentType === 'text/plain') {
          console.log('Adding as TEXT content');
          const textContent = fileContent.toString('utf-8');
          const truncatedContent = textContent.length > MAX_TEXT_LENGTH 
            ? textContent.substring(0, MAX_TEXT_LENGTH) + '\n... [truncated]'
            : textContent;
          fullPrompt += `[${attachment.filename}]:\n${truncatedContent}\n\n`;
        } else if (SUPPORTED_IMAGE_TYPES.includes(attachment.contentType)) {
          console.log('Adding as IMAGE note (Titan does not support images)');
          fullPrompt += `[Image: ${attachment.filename}] - I cannot view images directly. Please describe what you see.\n\n`;
        } else if (attachment.contentType === 'application/pdf') {
          console.log('Extracting text from PDF');
          try {
            const pdfParse = (await import('pdf-parse')).default;
            const pdfData = await pdfParse(fileContent);
            const extractedText = pdfData.text;
            console.log(`Extracted ${extractedText.length} characters from PDF`);
            
            const truncatedContent = extractedText.length > MAX_TEXT_LENGTH 
              ? extractedText.substring(0, MAX_TEXT_LENGTH) + '\n... [truncated]'
              : extractedText;
            
            fullPrompt += `[${attachment.filename}]:\n${truncatedContent}\n\n`;
          } catch (pdfError) {
            console.error('PDF extraction error:', pdfError);
            fullPrompt += `[PDF: ${attachment.filename}] - Unable to extract text.\n\n`;
          }
        } else if (attachment.contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          console.log('Extracting text from Word document');
          try {
            const result = await mammoth.extractRawText({ buffer: fileContent });
            const extractedText = result.value;
            console.log(`Extracted ${extractedText.length} characters from Word doc`);
            
            const truncatedContent = extractedText.length > MAX_TEXT_LENGTH 
              ? extractedText.substring(0, MAX_TEXT_LENGTH) + '\n... [truncated]'
              : extractedText;
            
            fullPrompt += `[${attachment.filename}]:\n${truncatedContent}\n\n`;
          } catch (docError) {
            console.error('Word doc extraction error:', docError);
            fullPrompt += `[Word: ${attachment.filename}] - Unable to extract text.\n\n`;
          }
        } else if (attachment.contentType === 'application/msword') {
          fullPrompt += `[${attachment.filename}] - Old .doc format. Please save as .docx.\n\n`;
        } else {
          fullPrompt += `[${attachment.filename}] - Cannot analyze this file type.\n\n`;
        }
      }

      // Add the user's question
      fullPrompt += `Question: ${prompt || 'Summarize this file.'}`;

      console.log('Final prompt length:', fullPrompt.length);
      console.log('Sending request to Titan model');

      // Build the request for Titan - reduced max tokens for faster response
      const requestBody = {
        inputText: fullPrompt,
        textGenerationConfig: {
          maxTokenCount: 2048,
          temperature: 0.5,
          topP: 0.9,
        },
      };

      const command = new InvokeModelCommand({
        modelId: TITAN_MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody),
      });

      const response = await bedrockClient.send(command);
      console.log('Bedrock response received');
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      const fullResponse = responseBody.results?.[0]?.outputText || 
        'I was unable to analyze the attached file(s). Please try again.';
      console.log('Full response length:', fullResponse.length);

      let confidence = 0.9;
      if (fullResponse.length < 50) {
        confidence = 0.5;
      }

      return {
        response: fullResponse,
        confidence,
        sources: attachments.map(a => a.filename),
      };
    } catch (error: any) {
      console.error('=== Multimodal analysis error ===');
      console.error('Error name:', error?.name);
      console.error('Error message:', error?.message);
      console.error('Full error:', JSON.stringify(error, null, 2));
      return {
        response: 'I encountered an error analyzing the attached file(s). Please try again or contact support.',
        confidence: 0,
        sources: [],
      };
    }
  }


  /**
   * Fetches a file from S3
   */
  private async fetchFileFromS3(s3Key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: UPLOADS_BUCKET,
      Key: s3Key,
    });

    const response = await s3Client.send(command);
    const chunks: Uint8Array[] = [];
    
    if (response.Body) {
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
    }

    return Buffer.concat(chunks);
  }

  /**
   * Determines if attachments can be analyzed with multimodal
   */
  hasAnalyzableAttachments(attachments: FileAttachment[]): boolean {
    return attachments.some(
      (a) =>
        SUPPORTED_IMAGE_TYPES.includes(a.contentType) ||
        DOCUMENT_TYPES_FOR_TEXT_EXTRACTION.includes(a.contentType) ||
        a.contentType === 'text/plain'
    );
  }

  shouldEscalate(confidence: number, messageCount: number): boolean {
    return confidence < 0.4 || messageCount > 10;
  }

  /**
   * Invokes Titan directly for text queries (fallback when no agent is configured)
   */
  private async invokeTitan(
    prompt: string
  ): Promise<{ response: string; confidence: number; sources: string[] }> {
    try {
      const fullPrompt = `You are Jordan, a helpful PLTW (Project Lead The Way) support assistant.
You help educators with questions about implementation, training, rostering, assessments, payment, and grants.
Be concise but thorough in your responses.

User question: ${prompt}`;

      const requestBody = {
        inputText: fullPrompt,
        textGenerationConfig: {
          maxTokenCount: 4096,
          temperature: 0.7,
          topP: 0.9,
        },
      };

      const command = new InvokeModelCommand({
        modelId: TITAN_MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody),
      });

      const response = await bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      const fullResponse = responseBody.results?.[0]?.outputText || 
        'I apologize, but I was unable to generate a response. Please contact our support team.';

      let confidence = 0.8;
      if (fullResponse.length < 50) {
        confidence = 0.5;
      }

      const lowConfidencePatterns = [
        "I don't have",
        "I cannot find",
        "I'm not sure",
        'I apologize',
        'I do not have access',
      ];
      if (lowConfidencePatterns.some((pattern) => fullResponse.includes(pattern))) {
        confidence = 0.3;
      }

      return {
        response: fullResponse,
        confidence,
        sources: [],
      };
    } catch (error) {
      console.error('Titan invocation error:', error);
      return {
        response: 'I encountered an error processing your request. Please try again or contact support.',
        confidence: 0,
        sources: [],
      };
    }
  }
}

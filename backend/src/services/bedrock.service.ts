import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
} from '@aws-sdk/client-bedrock-agent-runtime';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { FileAttachment } from '../types/index.js';
import mammoth from 'mammoth';

const agentClient = new BedrockAgentRuntimeClient({ region: 'us-east-1' });
const s3Client = new S3Client({ region: 'us-east-1' });

const AGENT_ID = process.env.BEDROCK_AGENT_ID!;
const AGENT_ALIAS_ID = process.env.BEDROCK_AGENT_ALIAS_ID!;
const UPLOADS_BUCKET = process.env.UPLOADS_BUCKET!;

// Supported media types
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
// PDFs and documents need text extraction
const DOCUMENT_TYPES_FOR_TEXT_EXTRACTION = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

export class BedrockService {
  /**
   * Invokes the Bedrock Agent for text-only queries
   */
  async invokeAgent(
    prompt: string,
    sessionId: string
  ): Promise<{ response: string; confidence: number; sources: string[] }> {
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
   * Analyzes files by extracting text and passing to Bedrock Agent
   * Extracts text from PDFs and Word docs, then sends to the agent
   */
  async analyzeWithAttachments(
    prompt: string,
    attachments: FileAttachment[],
    sessionId: string
  ): Promise<{ response: string; confidence: number; sources: string[] }> {
    console.log('=== analyzeWithAttachments START ===');
    console.log('Prompt:', prompt);
    console.log('Attachments count:', attachments.length);
    
    try {
      // Build the prompt with extracted file content
      let fileContext = '';
      const MAX_TEXT_LENGTH = 10000;
      
      for (const attachment of attachments) {
        console.log(`Processing attachment: ${attachment.filename} (${attachment.contentType})`);
        
        const fileContent = await this.fetchFileFromS3(attachment.s3Key);
        console.log(`Fetched file content, size: ${fileContent.length} bytes`);

        if (attachment.contentType === 'text/plain') {
          console.log('Adding as TEXT content');
          const textContent = fileContent.toString('utf-8');
          const truncatedContent = textContent.length > MAX_TEXT_LENGTH 
            ? textContent.substring(0, MAX_TEXT_LENGTH) + '\n... [content truncated]'
            : textContent;
          fileContext += `[Content of ${attachment.filename}]:\n${truncatedContent}\n\n`;
        } else if (SUPPORTED_IMAGE_TYPES.includes(attachment.contentType)) {
          console.log('Adding as IMAGE note');
          fileContext += `[Image attached: ${attachment.filename}] - I cannot directly view images, but I can help answer questions about it if you describe what you see.\n\n`;
        } else if (attachment.contentType === 'application/pdf') {
          console.log('Extracting text from PDF');
          try {
            const pdfParse = (await import('pdf-parse')).default;
            const pdfData = await pdfParse(fileContent);
            const extractedText = pdfData.text;
            console.log(`Extracted ${extractedText.length} characters from PDF`);
            
            const truncatedContent = extractedText.length > MAX_TEXT_LENGTH 
              ? extractedText.substring(0, MAX_TEXT_LENGTH) + '\n... [content truncated due to length]'
              : extractedText;
            
            fileContext += `[Content extracted from ${attachment.filename}]:\n${truncatedContent}\n\n`;
          } catch (pdfError) {
            console.error('PDF extraction error:', pdfError);
            fileContext += `[PDF file: ${attachment.filename}] - Unable to extract text from this PDF.\n\n`;
          }
        } else if (attachment.contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          console.log('Extracting text from Word document');
          try {
            const result = await mammoth.extractRawText({ buffer: fileContent });
            const extractedText = result.value;
            console.log(`Extracted ${extractedText.length} characters from Word doc`);
            
            const truncatedContent = extractedText.length > MAX_TEXT_LENGTH 
              ? extractedText.substring(0, MAX_TEXT_LENGTH) + '\n... [content truncated due to length]'
              : extractedText;
            
            fileContext += `[Content extracted from ${attachment.filename}]:\n${truncatedContent}\n\n`;
          } catch (docError) {
            console.error('Word doc extraction error:', docError);
            fileContext += `[Word document: ${attachment.filename}] - Unable to extract text from this document.\n\n`;
          }
        } else if (attachment.contentType === 'application/msword') {
          fileContext += `[Word document: ${attachment.filename} (.doc format)] - This is an older .doc format. Please save as .docx for text extraction.\n\n`;
        } else {
          fileContext += `[File attached: ${attachment.filename} (${attachment.contentType})] - Content cannot be directly analyzed.\n\n`;
        }
      }

      // Combine file context with user's question for the agent
      const fullPrompt = `The user has uploaded the following file(s). Please analyze the content and answer their question.

${fileContext}
User question: ${prompt || 'Please analyze the attached file(s) and provide a summary.'}`;

      console.log('Final prompt length:', fullPrompt.length);
      console.log('Sending request to Bedrock Agent');

      // Use the Bedrock Agent for analysis
      const command = new InvokeAgentCommand({
        agentId: AGENT_ID,
        agentAliasId: AGENT_ALIAS_ID,
        sessionId,
        inputText: fullPrompt,
      });

      const response = await agentClient.send(command);
      let fullResponse = '';
      const sources: string[] = attachments.map(a => a.filename);

      if (response.completion) {
        for await (const event of response.completion) {
          if (event.chunk?.bytes) {
            const text = new TextDecoder().decode(event.chunk.bytes);
            fullResponse += text;
          }

          // Also capture any knowledge base sources
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

      console.log('Full response length:', fullResponse.length);

      let confidence = 0.9;
      if (fullResponse.length < 50) {
        confidence = 0.5;
      }

      return {
        response: fullResponse || 'I was unable to analyze the attached file(s). Please try again.',
        confidence,
        sources: [...new Set(sources)],
      };
    } catch (error: any) {
      console.error('=== File analysis error ===');
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
}

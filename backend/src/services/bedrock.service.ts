import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
} from '@aws-sdk/client-bedrock-agent-runtime';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { FileAttachment } from '../types/index.js';
import mammoth from 'mammoth';

const agentClient = new BedrockAgentRuntimeClient({ region: process.env.AWS_REGION });
const s3Client = new S3Client({ region: process.env.AWS_REGION });

const AGENT_ID = process.env.BEDROCK_AGENT_ID || '';
const AGENT_ALIAS_ID = process.env.BEDROCK_AGENT_ALIAS_ID || '';
const UPLOADS_BUCKET = process.env.UPLOADS_BUCKET!;

// Supported media types
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
// PDFs and documents need text extraction
const DOCUMENT_TYPES_FOR_TEXT_EXTRACTION = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

/**
 * Cleans the response by removing any unwanted prefixes the model might add
 */
function cleanResponse(response: string): string {
  // Remove common bot prefixes that models sometimes add
  const prefixPatterns = [
    /^(Bot|Jordan|Assistant|AI|Helper|Support):\s*/i,
    /^(Hello,?\s*)?(I'm Jordan\.?\s*)?/i,
  ];
  
  let cleaned = response.trim();
  for (const pattern of prefixPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  return cleaned.trim();
}

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
        // enableTrace: true, // Temporarily disabled - may need IAM permissions
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
                  // Extract S3 location URIs
                  if (ref.location?.s3Location?.uri) {
                    sources.push(ref.location.s3Location.uri);
                  }
                  // Extract web URLs (for web-crawled content)
                  if (ref.location?.webLocation?.url) {
                    sources.push(ref.location.webLocation.url);
                  }
                  // Extract confluence URLs
                  if (ref.location?.confluenceLocation?.url) {
                    sources.push(ref.location.confluenceLocation.url);
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

      // Clean any unwanted prefixes from the response
      const cleanedResponse = cleanResponse(fullResponse) || 
        'I apologize, but I was unable to generate a response. Please contact our support team.';

      return {
        response: cleanedResponse,
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
   * Analyzes files by extracting content, then passes to Bedrock Agent for knowledge base access
   * Step 1: Extract text from PDFs/Word docs
   * Step 2: Send extracted content + user question to Bedrock Agent
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
      // Step 1: Extract text content from all attachments
      const extractedContents: string[] = [];
      const MAX_TEXT_LENGTH = 8000;
      
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
          extractedContents.push(`[File: ${attachment.filename}]\n${truncatedContent}`);
        } else if (SUPPORTED_IMAGE_TYPES.includes(attachment.contentType)) {
          console.log('Image file - cannot extract text');
          extractedContents.push(`[Image: ${attachment.filename}] - Image content cannot be extracted as text.`);
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
            
            extractedContents.push(`[File: ${attachment.filename}]\n${truncatedContent}`);
          } catch (pdfError) {
            console.error('PDF extraction error:', pdfError);
            extractedContents.push(`[PDF: ${attachment.filename}] - Unable to extract text.`);
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
            
            extractedContents.push(`[File: ${attachment.filename}]\n${truncatedContent}`);
          } catch (docError) {
            console.error('Word doc extraction error:', docError);
            extractedContents.push(`[Word: ${attachment.filename}] - Unable to extract text.`);
          }
        } else if (attachment.contentType === 'application/msword') {
          extractedContents.push(`[${attachment.filename}] - Old .doc format not supported.`);
        } else {
          extractedContents.push(`[${attachment.filename}] - Unsupported file type.`);
        }
      }

      // Step 2: Build prompt with extracted content and send to Bedrock Agent
      const fileContext = extractedContents.join('\n\n---\n\n');
      const augmentedPrompt = `The user has uploaded the following file(s). Use this content along with your knowledge base to answer their question.

=== UPLOADED FILE CONTENT ===
${fileContext}
=== END FILE CONTENT ===

User's Question: ${prompt || 'Please summarize and analyze the uploaded file(s).'}`;

      console.log('Sending augmented prompt to Bedrock Agent');
      console.log('Augmented prompt length:', augmentedPrompt.length);

      // Use the Bedrock Agent which has access to the knowledge base
      const agentResult = await this.invokeAgent(augmentedPrompt, sessionId);
      
      // Add filenames to sources
      const allSources = [
        ...attachments.map(a => a.filename),
        ...agentResult.sources
      ];

      return {
        response: agentResult.response,
        confidence: agentResult.confidence,
        sources: [...new Set(allSources)],
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

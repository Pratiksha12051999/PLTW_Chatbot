import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";

const agentClient = new BedrockAgentRuntimeClient({
  region: process.env.AWS_REGION,
});

const AGENT_ID = process.env.BEDROCK_AGENT_ID || "";
const AGENT_ALIAS_ID = process.env.BEDROCK_AGENT_ALIAS_ID || "";

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
    cleaned = cleaned.replace(pattern, "");
  }

  return cleaned.trim();
}

export class BedrockService {
  /**
   * Invokes the Bedrock Agent for text-only queries
   * @param prompt - The user's question
   * @param sessionId - Session ID for conversation continuity
   */
  async invokeAgent(
    prompt: string,
    sessionId: string,
  ): Promise<{ response: string; confidence: number; sources: string[] }> {
    try {
      const command = new InvokeAgentCommand({
        agentId: AGENT_ID,
        agentAliasId: AGENT_ALIAS_ID,
        sessionId,
        inputText: prompt,
        enableTrace: true,
      });

      const response = await agentClient.send(command);
      let fullResponse = "";
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
            if (
              trace.observation?.knowledgeBaseLookupOutput?.retrievedReferences
            ) {
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
                },
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
        "I apologize",
        "I do not have access",
      ];
      if (
        lowConfidencePatterns.some((pattern) => fullResponse.includes(pattern))
      ) {
        confidence = 0.3;
      }

      // Clean any unwanted prefixes from the response
      const cleanedResponse =
        cleanResponse(fullResponse) ||
        "I apologize, but I was unable to generate a response. Please contact our support team.";

      return {
        response: cleanedResponse,
        confidence,
        sources: [...new Set(sources)],
      };
    } catch (error) {
      console.error("Bedrock invocation error:", error);
      return {
        response:
          "I encountered an error processing your request. Please try again or contact support.",
        confidence: 0,
        sources: [],
      };
    }
  }

  shouldEscalate(confidence: number, messageCount: number): boolean {
    return confidence < 0.4 || messageCount > 10;
  }
}

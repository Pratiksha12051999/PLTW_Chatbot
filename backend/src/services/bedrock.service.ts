import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
} from '@aws-sdk/client-bedrock-agent-runtime';

const client = new BedrockAgentRuntimeClient({ region: process.env.AWS_REGION });

const AGENT_ID = process.env.BEDROCK_AGENT_ID!;
const AGENT_ALIAS_ID = process.env.BEDROCK_AGENT_ALIAS_ID!;

export class BedrockService {
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

      const response = await client.send(command);
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

  shouldEscalate(confidence: number, messageCount: number): boolean {
    return confidence < 0.4 || messageCount > 10;
  }
}

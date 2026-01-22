export interface Message {
  messageId: string;
  conversationId: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: number;
  metadata?: {
    confidence?: number;
    sources?: string[];
  };
}

// Conversation category type for LLM-powered categorization
export type ConversationCategory =
  | 'Implementation'
  | 'Rostering'
  | 'Training'
  | 'Payment'
  | 'Grants'
  | 'Others'
  | 'general'; // Default for uncategorized

export interface Conversation {
  conversationId: string;
  userId: string;
  startTime: number;
  endTime?: number;
  lastActivityTime?: number;
  status: 'active' | 'resolved' | 'escalated';
  category?: ConversationCategory;
  messages: Message[];
  satisfaction?: 'positive' | 'negative';
  sentiment?: 'positive' | 'negative' | 'neutral';
  escalationReason?: 'no_answer' | 'user_not_satisfied' | 'requested_agent';
  comment?: string;
}

export interface Connection {
  connectionId: string;
  userId: string;
  conversationId?: string;
  connectedAt: number;
  lastActivity: number;
}

export interface AdminMetrics {
  totalConversations: number;
  escalationRate: number;
  overallSatisfaction: number;
  conversationVolume: Array<{ date: string; count: number }>;
  topCategories: Array<{ category: string; count: number }>;
  escalationReasons: {
    no_answer: number;
    user_not_satisfied: number;
    requested_agent: number;
  };
}

export interface WebSocketMessage {
  action: string;
  message?: string;
  conversationId?: string;
  category?: string;
  language?: 'en' | 'es';
}

export interface WebSocketResponse {
  type: 'message_received' | 'assistant_response' | 'error' | 'escalated';
  message?: Message | string;
  shouldEscalate?: boolean;
  contactInfo?: {
    phone: string;
    email: string;
  };
}

// WebSocket Event Types
export interface WebSocketConnectEvent {
  requestContext: {
    connectionId: string;
    eventType: 'CONNECT';
    routeKey: string;
    domainName: string;
    stage: string;
    connectedAt: number;
    requestTime: string;
    requestTimeEpoch: number;
    identity: {
      sourceIp: string;
      userAgent: string;
    };
  };
  queryStringParameters?: Record<string, string>;
  headers: Record<string, string>;
}

export interface WebSocketDisconnectEvent {
  requestContext: {
    connectionId: string;
    eventType: 'DISCONNECT';
    routeKey: string;
    domainName: string;
    stage: string;
    connectedAt: number;
    requestTime: string;
    requestTimeEpoch: number;
    disconnectStatusCode: number;
    disconnectReason: string;
  };
}

export interface WebSocketMessageEvent {
  requestContext: {
    connectionId: string;
    eventType: 'MESSAGE';
    routeKey: string;
    domainName: string;
    stage: string;
    connectedAt: number;
    requestTime: string;
    requestTimeEpoch: number;
  };
  body: string;
  isBase64Encoded: boolean;
}

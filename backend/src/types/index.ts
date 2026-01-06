// File Upload Types
export interface FileAttachment {
  fileId: string;
  conversationId: string;
  messageId?: string;
  filename: string;
  contentType: string;
  size: number;
  s3Key: string;
  uploadedAt: number;
  status: 'pending' | 'uploaded' | 'deleted';
  ttl?: number;
}

export interface PresignRequest {
  filename: string;
  contentType: string;
  size: number;
  conversationId?: string;
}

export interface PresignResponse {
  presignedUrl: string;
  fileId: string;
  s3Key: string;
  expiresIn: number;
}

export interface ConfirmRequest {
  fileId: string;
}

export interface ConfirmResponse {
  success: boolean;
  file: FileAttachment;
}

export interface DownloadResponse {
  presignedUrl: string;
  expiresIn: number;
}

export interface Message {
  messageId: string;
  conversationId: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: number;
  attachments?: FileAttachment[];
  metadata?: {
    confidence?: number;
    sources?: string[];
  };
}

export interface Conversation {
  conversationId: string;
  userId: string;
  startTime: number;
  endTime?: number;
  status: 'active' | 'resolved' | 'escalated';
  category?: string;
  messages: Message[];
  satisfaction?: 'positive' | 'negative';
  escalationReason?: 'no_answer' | 'user_not_satisfied' | 'requested_agent';
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
  fileIds?: string[];
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

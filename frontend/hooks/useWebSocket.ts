import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * File attachment interface matching backend FileAttachment type
 * Requirements: 5.1
 */
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
}

export interface Message {
  messageId: string;
  conversationId: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
  attachments?: FileAttachment[];
  metadata?: {
    confidence?: number;
    sources?: string[];
  };
}

interface WebSocketMessage {
  type: 'message_received' | 'assistant_response' | 'error' | 'escalated';
  message?: Message | string;
  shouldEscalate?: boolean;
  contactInfo?: {
    phone: string;
    email: string;
  };
}

export const useWebSocket = (url: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [shouldEscalate, setShouldEscalate] = useState(false);
  const [contactInfo, setContactInfo] = useState<{ phone: string; email: string } | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!url) {
      console.error('WebSocket URL is not configured');
      return;
    }

    const connect = () => {
      try {
        console.log('🔌 Connecting to WebSocket:', url);
        const ws = new WebSocket(url);

        ws.onopen = () => {
          console.log('✅ WebSocket connected');
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            console.log('📨 Raw WebSocket data:', event.data);
            const data: WebSocketMessage = JSON.parse(event.data);
            console.log('📨 Parsed WebSocket message:', JSON.stringify(data));
            console.log('📨 Message type:', data.type);

            switch (data.type) {
              case 'message_received':
                console.log('Processing message_received');
                if (typeof data.message === 'object' && data.message) {
                  const msg = data.message as Message;
                  // Ensure timestamp is valid
                  if (!msg.timestamp) {
                    msg.timestamp = Date.now();
                  }
                  console.log('Updating user message with server response:', msg);
                  // Replace the optimistic message with the real one from server
                  setMessages(prev => {
                    // Find and replace the temp message, or add if not found
                    const tempIndex = prev.findIndex(m => m.messageId.startsWith('temp-') && m.role === 'user');
                    if (tempIndex !== -1) {
                      const updated = [...prev];
                      updated[tempIndex] = msg;
                      return updated;
                    }
                    return [...prev, msg];
                  });
                  setConversationId(msg.conversationId);
                }
                // isTyping is already true from sendMessage, keep it true
                setIsTyping(true);
                break;

              case 'assistant_response':
                console.log('Processing assistant_response');
                setIsTyping(false);
                if (typeof data.message === 'object' && data.message) {
                  const msg = data.message as Message;
                  // Ensure timestamp is valid
                  if (!msg.timestamp) {
                    msg.timestamp = Date.now();
                  }
                  console.log('Adding assistant message:', msg);
                  setMessages(prev => [...prev, msg]);
                }
                if (data.shouldEscalate) {
                  setShouldEscalate(true);
                }
                break;

              case 'escalated':
                setIsTyping(false);
                setShouldEscalate(true);
                if (data.contactInfo) {
                  setContactInfo(data.contactInfo);
                }
                break;

              case 'error':
                setIsTyping(false);
                console.error('WebSocket error message:', data.message);
                break;
                
              default:
                console.warn('Unknown message type:', data.type);
            }
          } catch (parseError) {
            console.error('Failed to parse WebSocket message:', parseError, event.data);
          }
        };

        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          setIsConnected(false);
        };

        ws.onclose = () => {
          console.log('🔌 WebSocket disconnected, reconnecting in 3s...');
          setIsConnected(false);

          // Reconnect after 3 seconds
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect();
          }, 3000);
        };

        wsRef.current = ws;
      } catch (error) {
        console.error('Failed to connect:', error);
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [url]);

  const sendMessage = useCallback((content: string, category: string = 'General', fileIds?: string[]) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Immediately show typing indicator to prevent blank screen
      setIsTyping(true);
      
      // Add optimistic user message immediately for instant feedback
      const optimisticMessage: Message = {
        messageId: `temp-${Date.now()}`,
        conversationId: conversationId || 'pending',
        content,
        role: 'user',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, optimisticMessage]);
      
      const payload: {
        action: string;
        message: string;
        conversationId: string | null;
        category: string;
        fileIds?: string[];
      } = {
        action: 'sendMessage',
        message: content,
        conversationId,
        category
      };
      
      // Include fileIds if provided (Requirement 4.6)
      if (fileIds && fileIds.length > 0) {
        payload.fileIds = fileIds;
      }
      
      wsRef.current.send(JSON.stringify(payload));
    } else {
      console.error('WebSocket is not connected');
    }
  }, [conversationId]);

  const escalate = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && conversationId) {
      wsRef.current.send(JSON.stringify({
        action: 'escalate',
        conversationId
      }));
    }
  }, [conversationId]);

  /**
   * Reset the chat state to start a new conversation
   */
  const resetChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setIsTyping(false);
    setShouldEscalate(false);
    setContactInfo(null);
  }, []);

  return {
    isConnected,
    messages,
    isTyping,
    shouldEscalate,
    contactInfo,
    conversationId,
    sendMessage,
    escalate,
    resetChat
  };
};
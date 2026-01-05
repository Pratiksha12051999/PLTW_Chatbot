import { useState, useEffect, useCallback, useRef } from 'react';

export interface Message {
  messageId: string;
  conversationId: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
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
  const reconnectTimeoutRef = useRef<number>();

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
          const data: WebSocketMessage = JSON.parse(event.data);

          switch (data.type) {
            case 'message_received':
              if (typeof data.message === 'object') {
                setMessages(prev => [...prev, data.message as Message]);
                setConversationId((data.message as Message).conversationId);
              }
              setIsTyping(true);
              break;

            case 'assistant_response':
              setIsTyping(false);
              if (typeof data.message === 'object') {
                setMessages(prev => [...prev, data.message as Message]);
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
              console.error('WebSocket error:', data.message);
              break;
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

  const sendMessage = useCallback((content: string, category: string = 'General') => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'sendMessage',
        message: content,
        conversationId,
        category
      }));
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

  return {
    isConnected,
    messages,
    isTyping,
    shouldEscalate,
    contactInfo,
    conversationId,
    sendMessage,
    escalate
  };
};
import { useEffect, useRef, useState, useCallback } from "react";

export interface Message {
  messageId: string;
  conversationId: string;
  content: string;
  role: "user" | "assistant";
  timestamp: number;
  metadata?: {
    confidence?: number;
    sources?: any;
    escalated?: boolean;
    ticketId?: string;
    queuePosition?: number;
  };
  attachments?: FileAttachment[];
}

export interface FileAttachment {
  fileId: string;
  filename: string;
  contentType: string;
  size: number;
  uploadedAt: number;
}

export interface QueueInfo {
  ticketId: string;
  position: number;
  estimatedWait: number;
}

interface ContactInfo {
  phone: string;
  email: string;
}

export const useWebSocket = (url: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [shouldEscalate, setShouldEscalate] = useState(false);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);

  // ✅ FIX: Generate conversationId immediately instead of null
  const [conversationId, setConversationId] = useState<string>(() => {
    return `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  });

  const [queueInfo, setQueueInfo] = useState<QueueInfo | null>(null);
  const [isEscalated, setIsEscalated] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    console.log("🔌 Connecting to WebSocket:", url);

    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log("✅ WebSocket connected");
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
    };

    ws.onclose = () => {
      console.log("❌ WebSocket disconnected");
      setIsConnected(false);

      // Auto-reconnect with exponential backoff
      if (reconnectAttemptsRef.current < 5) {
        const delay = Math.min(
          1000 * Math.pow(2, reconnectAttemptsRef.current),
          30000,
        );
        console.log(`🔄 Reconnecting in ${delay}ms...`);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, delay);
      } else {
        console.error("❌ Max reconnection attempts reached");
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📨 WebSocket message received:", data.type);

        switch (data.type) {
          case "message_received":
            if (data.message) {
              setMessages((prev) => {
                const exists = prev.some(
                  (m) => m.messageId === data.message.messageId,
                );
                if (exists) return prev;
                return [...prev, data.message];
              });
              // Note: We don't update conversationId from backend anymore since we generate it upfront
            }
            break;

          case "assistant_response":
            setIsTyping(false);
            if (data.message) {
              setMessages((prev) => {
                const exists = prev.some(
                  (m) => m.messageId === data.message.messageId,
                );
                if (exists) return prev;
                return [...prev, data.message];
              });
            }
            if (data.shouldEscalate) {
              setShouldEscalate(true);
              if (data.contactInfo) {
                setContactInfo(data.contactInfo);
              }
            }
            break;

          case "escalated":
            console.log("🆘 Escalation confirmed");
            setIsTyping(false);
            setIsEscalated(true);
            setShouldEscalate(true);

            if (data.message) {
              setMessages((prev) => {
                const exists = prev.some(
                  (m) => m.messageId === data.message.messageId,
                );
                if (exists) return prev;
                return [...prev, data.message];
              });
            }

            if (data.contactInfo) {
              setContactInfo(data.contactInfo);
            }

            if (data.queueInfo) {
              setQueueInfo(data.queueInfo);
              console.log("Queue info received:", data.queueInfo);
            }
            break;

          case "error":
            setIsTyping(false);
            if (data.message) {
              setMessages((prev) => [...prev, data.message]);
            }
            break;

          default:
            console.warn("Unknown message type:", data.type);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    wsRef.current = ws;
  }, [url]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback(
    (
      content: string,
      category: string = "General",
      fileIds?: string[],
      language: string = "en",
    ) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.error("WebSocket is not connected");
        return;
      }

      setIsTyping(true);

      const messageData = {
        action: "sendMessage",
        message: content,
        conversationId, // ✅ Now always has a valid UUID
        category,
        fileIds,
        language,
      };

      console.log("📤 Sending message:", messageData);
      wsRef.current.send(JSON.stringify(messageData));
    },
    [conversationId],
  );

  const escalateToAgent = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error("WebSocket is not connected");
      return;
    }

    console.log("🆘 Requesting escalation...");
    setIsTyping(true);

    const escalationData = {
      action: "escalate",
      message: "I need to speak with a human agent",
      conversationId,
      category: "Escalation",
    };

    wsRef.current.send(JSON.stringify(escalationData));
  }, [conversationId]);

  const resetChat = useCallback(() => {
    setMessages([]);

    // ✅ FIX: Generate NEW conversation ID instead of setting to null
    setConversationId(
      `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    );

    setShouldEscalate(false);
    setContactInfo(null);
    setIsTyping(false);
    setQueueInfo(null);
    setIsEscalated(false);
  }, []);

  return {
    isConnected,
    messages,
    isTyping,
    shouldEscalate,
    contactInfo,
    conversationId,
    queueInfo,
    isEscalated,
    sendMessage,
    escalateToAgent,
    resetChat,
  };
};

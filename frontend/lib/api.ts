import { fetchAuthSession } from "aws-amplify/auth";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

/**
 * Gets the current user's JWT token for authenticated API calls
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() || null;
  } catch (error) {
    console.error("Failed to get auth token:", error);
    return null;
  }
}

/**
 * Creates headers with optional Authorization token
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = token;
  }
  return headers;
}

export interface MetricsResponse {
  totalConversations: number;
  escalationRate: number;
  overallSatisfaction: number;
  conversationVolume: Array<{
    date: string;
    count: number;
  }>;
  topCategories: Array<{
    category: string;
    count: number;
  }>;
  escalationReasons: {
    no_answer: number;
    user_not_satisfied: number;
    requested_agent: number;
  };
}

export interface Conversation {
  conversationId: string;
  category: string;
  startTime: number;
  endTime?: number;
  lastActivityTime?: number;
  status: "active" | "resolved" | "escalated";
  userId: string;
  satisfaction?: "positive" | "negative";
  sentiment?: "positive" | "negative" | "neutral";
  escalationReason?: "no_answer" | "user_not_satisfied" | "requested_agent";
  comment?: string;
  messages: Array<{
    messageId: string;
    role: "user" | "assistant";
    content: string;
    timestamp: number;
  }>;
}

export interface FeedbackRequest {
  conversationId: string;
  satisfaction: "positive" | "negative";
  comment?: string;
}

export const adminAPI = {
  // Get metrics for a specific time period (requires authentication)
  getMetrics: async (days: number = 7): Promise<MetricsResponse> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/admin/metrics?days=${days}`, {
      //                                                               ^^^^^ FIXED: was "day", should be "days"
      method: "GET",
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Unauthorized - please log in");
      }
      throw new Error("Failed to fetch metrics");
    }

    return response.json();
  },

  // Get conversations by category (requires authentication)
  getConversations: async (
    category?: string,
  ): Promise<{ conversations: Conversation[] }> => {
    const url = category
      ? `${API_BASE_URL}/admin/conversations?category=${encodeURIComponent(category)}`
      : `${API_BASE_URL}/admin/conversations`;

    const headers = await getAuthHeaders();
    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Unauthorized - please log in");
      }
      throw new Error("Failed to fetch conversations");
    }

    return response.json();
  },

  // Submit feedback (public endpoint)
  submitFeedback: async (
    feedback: FeedbackRequest,
  ): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(feedback),
    });

    if (!response.ok) {
      throw new Error("Failed to submit feedback");
    }

    return response.json();
  },
};

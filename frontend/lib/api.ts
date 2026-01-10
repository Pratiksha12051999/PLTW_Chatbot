const API_BASE_URL = process.env.NEXT_PUBLIC_REST_API_URL || '';

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
  status: 'active' | 'resolved' | 'escalated';
  userId: string;
  satisfaction?: 'positive' | 'negative';
  escalationReason?: 'no_answer' | 'user_not_satisfied' | 'requested_agent';
  messages: Array<{
    messageId: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    attachments?: Array<{
      fileId: string;
      filename: string;
      contentType: string;
      size: number;
    }>;
  }>;
}

export interface FeedbackRequest {
  conversationId: string;
  satisfaction: 'positive' | 'negative';
  comment?: string;
}

export const adminAPI = {
  // Get metrics for a specific time period
  getMetrics: async (days: number = 7): Promise<MetricsResponse> => {
    const response = await fetch(`${API_BASE_URL}/admin/metrics?day=${days}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch metrics');
    }

    return response.json();
  },

  // Get conversations by category
  getConversations: async (category?: string): Promise<{ conversations: Conversation[] }> => {
    const url = category
      ? `${API_BASE_URL}/admin/conversations?category=${encodeURIComponent(category)}`
      : `${API_BASE_URL}/admin/conversations`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch conversations');
    }

    return response.json();
  },

  // Submit feedback
  submitFeedback: async (feedback: FeedbackRequest): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feedback),
    });

    if (!response.ok) {
      throw new Error('Failed to submit feedback');
    }

    return response.json();
  },
};
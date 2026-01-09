'use client';

import { useEffect, useCallback } from 'react';
import { X, Paperclip } from 'lucide-react';
import { Conversation } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

interface ConversationDetailModalProps {
  conversation: Conversation | null;
  isOpen: boolean;
  onClose: () => void;
}

// Clean text by removing content in square brackets
const cleanText = (text: string): string => {
  return text.replace(/\s*\[[\w\d]+\]/g, '').trim();
};

// Format inline text (handle **bold** within text)
const formatInlineText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={idx}>{part}</span>;
  });
};

// Format message content to display better
const formatMessageContent = (content: string) => {
  const cleanedContent = cleanText(content);
  const parts = cleanedContent.split(/\n\n|\n/);

  return parts.map((part, index) => {
    const trimmed = part.trim();
    if (!trimmed) return null;

    if (/^\d+\./.test(trimmed)) {
      return (
        <div key={index} className="mb-2 pl-1">
          <div className="flex gap-2">
            <span className="font-semibold min-w-[24px]">
              {trimmed.match(/^\d+\./)?.[0]}
            </span>
            <span className="flex-1">{formatInlineText(trimmed.replace(/^\d+\.\s*/, ''))}</span>
          </div>
        </div>
      );
    }

    if (/^[-•*]/.test(trimmed)) {
      return (
        <div key={index} className="mb-1 pl-1">
          <div className="flex gap-2">
            <span className="min-w-[16px]">•</span>
            <span className="flex-1">{formatInlineText(trimmed.replace(/^[-•*]\s*/, ''))}</span>
          </div>
        </div>
      );
    }

    if (/^\*\*.*\*\*$/.test(trimmed)) {
      return (
        <div key={index} className="font-semibold mb-2 mt-2">
          {trimmed.replace(/\*\*/g, '')}
        </div>
      );
    }

    return (
      <p key={index} className="mb-2 leading-relaxed">
        {formatInlineText(trimmed)}
      </p>
    );
  });
};

// Format file size for display
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// Calculate duration between two timestamps
const formatDuration = (startTime: number, endTime?: number): string => {
  if (!endTime) return 'Ongoing';
  const durationMs = endTime - startTime;
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
};

// Get escalation badge color
const getEscalationBadgeStyle = (reason: string): string => {
  switch (reason) {
    case 'user_not_satisfied':
      return 'bg-red-100 text-red-800';
    case 'no_answer':
      return 'bg-orange-100 text-orange-800';
    case 'requested_agent':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Get escalation reason display text
const getEscalationReasonText = (reason: string): string => {
  switch (reason) {
    case 'user_not_satisfied':
      return 'User Not Satisfied';
    case 'no_answer':
      return 'No Answer';
    case 'requested_agent':
      return 'Requested Agent';
    default:
      return reason;
  }
};

// Get status badge style
const getStatusBadgeStyle = (status: string): string => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'resolved':
      return 'bg-blue-100 text-blue-800';
    case 'escalated':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function ConversationDetailModal({
  conversation,
  isOpen,
  onClose,
}: ConversationDetailModalProps) {
  // Handle Escape key to close modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !conversation) return null;

  const sortedMessages = [...conversation.messages].sort(
    (a, b) => a.timestamp - b.timestamp
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-semibold text-gray-900">
                Conversation Details
              </h2>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeStyle(
                  conversation.status
                )}`}
              >
                {conversation.status.charAt(0).toUpperCase() +
                  conversation.status.slice(1)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Metadata Section */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-wrap gap-6">
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wider">
                Category
              </span>
              <p className="text-sm font-medium text-gray-900">
                {conversation.category || 'Uncategorized'}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wider">
                Started
              </span>
              <p className="text-sm font-medium text-gray-900">
                {new Date(conversation.startTime).toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wider">
                Duration
              </span>
              <p className="text-sm font-medium text-gray-900">
                {formatDuration(conversation.startTime, conversation.endTime)}
              </p>
            </div>
            {conversation.satisfaction && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">
                  Satisfaction
                </span>
                <p
                  className={`text-sm font-medium ${
                    conversation.satisfaction === 'positive'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {conversation.satisfaction === 'positive'
                    ? 'Positive'
                    : 'Negative'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Messages Section */}
        <div className="flex-1 overflow-y-auto p-6">
          {sortedMessages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No messages in this conversation
            </div>
          ) : (
            <div className="space-y-4">
              {sortedMessages.map((message, index) => (
                <div
                  key={message.messageId || index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.role === 'user'
                        ? 'bg-blue-900 text-white'
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}
                  >
                    <div className="text-sm">
                      {message.role === 'user' ? (
                        <p>{message.content}</p>
                      ) : (
                        <div className="space-y-1">
                          {formatMessageContent(message.content)}
                        </div>
                      )}
                    </div>

                    {/* Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-xs text-gray-500 mb-2">
                          Attachments:
                        </div>
                        {message.attachments.map((attachment, idx) => (
                          <div
                            key={attachment.fileId || idx}
                            className="flex items-center gap-2 text-xs"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span>{attachment.filename}</span>
                            <span className="text-gray-400">
                              ({formatFileSize(attachment.size)})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div
                      className={`text-xs mt-2 ${
                        message.role === 'user'
                          ? 'text-blue-200'
                          : 'text-gray-400'
                      }`}
                    >
                      {formatDistanceToNow(new Date(message.timestamp), {
                        addSuffix: true,
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

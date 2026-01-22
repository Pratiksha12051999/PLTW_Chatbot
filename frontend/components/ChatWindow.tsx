'use client';

import React, { useState, useRef } from 'react';
import { Send, Paperclip, User, RefreshCw, X, CheckCircle, AlertCircle, Loader2, Download, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useWebSocket, FileAttachment } from '@/hooks/useWebSocket';
import { useFileUpload, UploadingFile } from '@/hooks/useFileUpload';
import { getDownloadUrl } from '@/lib/uploadApi';
import { adminAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import CitationDisplay from './CitationDisplay';

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'wss://q76me9fvqa.execute-api.us-east-1.amazonaws.com/prod';

// Clean text by removing content in square brackets
const cleanText = (text: string): string => {
  return text.replace(/\s*\[[\w\d]+\]/g, '').trim();
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
        <div key={index} className="mb-3 pl-1">
          <div className="flex gap-3">
            <span className="font-semibold text-blue-900 min-w-[30px]">
              {trimmed.match(/^\d+\./)?.[0]}
            </span>
            <span className="flex-1">{formatInlineText(trimmed.replace(/^\d+\.\s*/, ''))}</span>
          </div>
        </div>
      );
    }

    if (/^[-•*]/.test(trimmed)) {
      return (
        <div key={index} className="mb-2 pl-1">
          <div className="flex gap-3">
            <span className="text-blue-900 min-w-[16px]">•</span>
            <span className="flex-1">{formatInlineText(trimmed.replace(/^[-•*]\s*/, ''))}</span>
          </div>
        </div>
      );
    }

    if (/^\*\*.*\*\*$/.test(trimmed)) {
      return (
        <div key={index} className="font-semibold text-gray-900 mb-2 mt-3 text-base">
          {trimmed.replace(/\*\*/g, '')}
        </div>
      );
    }

    return (
      <p key={index} className="mb-3 leading-relaxed">
        {formatInlineText(trimmed)}
      </p>
    );
  });
};

// Format inline text (handle **bold**, URLs, and markdown links within text)
const formatInlineText = (text: string): React.ReactNode => {
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const urlRegex = /(https?:\/\/[^\s<>"\]]+)/g;
  const boldRegex = /(\*\*.*?\*\*)/g;

  const links: { placeholder: string; text: string; url: string }[] = [];
  let processedText = text.replace(markdownLinkRegex, (match, linkText, url) => {
    const placeholder = `__MDLINK_${links.length}__`;
    links.push({ placeholder, text: linkText, url });
    return placeholder;
  });

  const plainUrls: { placeholder: string; url: string }[] = [];
  processedText = processedText.replace(urlRegex, (match) => {
    if (match.includes('__MDLINK_')) return match;
    const placeholder = `__URL_${plainUrls.length}__`;
    plainUrls.push({ placeholder, url: match });
    return placeholder;
  });

  const parts = processedText.split(boldRegex);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const innerText = part.slice(2, -2);
      return (
        <strong key={idx} className="font-semibold text-gray-900">
          {renderWithLinks(innerText, links, plainUrls, `bold-${idx}`)}
        </strong>
      );
    }
    return <span key={idx}>{renderWithLinks(part, links, plainUrls, `span-${idx}`)}</span>;
  });
};

const renderWithLinks = (
  text: string,
  mdLinks: { placeholder: string; text: string; url: string }[],
  plainUrls: { placeholder: string; url: string }[],
  keyPrefix: string
): React.ReactNode => {
  const hasPlaceholders = mdLinks.some(l => text.includes(l.placeholder)) ||
    plainUrls.some(u => text.includes(u.placeholder));

  if (!hasPlaceholders) {
    return text;
  }

  const allPlaceholders = [
    ...mdLinks.map(l => l.placeholder),
    ...plainUrls.map(u => u.placeholder)
  ];
  const placeholderRegex = new RegExp(`(${allPlaceholders.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');

  const segments = text.split(placeholderRegex);

  return segments.map((segment, segIdx) => {
    const mdLink = mdLinks.find(l => l.placeholder === segment);
    if (mdLink) {
      return (
        <a
          key={`${keyPrefix}-md-${segIdx}`}
          href={mdLink.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline hover:no-underline transition-colors break-all"
        >
          {mdLink.text}
          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      );
    }

    const plainUrl = plainUrls.find(u => u.placeholder === segment);
    if (plainUrl) {
      let displayText = plainUrl.url;
      try {
        const urlObj = new URL(plainUrl.url);
        const domain = urlObj.hostname.replace('www.', '');
        const path = urlObj.pathname !== '/' ? urlObj.pathname : '';
        displayText = domain + path;
        if (displayText.length > 40) {
          displayText = domain + (path.length > 15 ? path.substring(0, 12) + '...' : path);
        }
      } catch {
        if (displayText.length > 40) {
          displayText = displayText.substring(0, 37) + '...';
        }
      }

      return (
        <span key={`${keyPrefix}-url-${segIdx}`} className="inline-block my-1">
          <a
            href={plainUrl.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 text-sm rounded-md hover:bg-blue-100 transition-colors max-w-full"
            title={plainUrl.url}
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="truncate">{displayText}</span>
            <svg className="w-3 h-3 flex-shrink-0 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </span>
      );
    }

    return segment;
  });
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const getFileIcon = (contentType: string) => {
  if (contentType.startsWith('image/')) return '🖼️';
  if (contentType === 'application/pdf') return '📄';
  if (contentType.includes('word') || contentType.includes('document')) return '📝';
  if (contentType === 'text/plain') return '📃';
  return '📎';
};

interface AttachmentLinkProps {
  attachment: FileAttachment;
  isUserMessage: boolean;
}

const AttachmentLink = ({ attachment, isUserMessage }: AttachmentLinkProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await getDownloadUrl(attachment.fileId);
      window.open(response.presignedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Failed to get download URL:', err);
      setError('Failed to download');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${isUserMessage
          ? 'bg-blue-800 hover:bg-blue-700 text-white'
          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        } ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
      title={`Download ${attachment.filename}`}
    >
      <span className="text-base">{getFileIcon(attachment.contentType)}</span>
      <div className="flex flex-col items-start min-w-0">
        <span className="truncate max-w-[150px] font-medium">
          {attachment.filename}
        </span>
        <span className={`text-xs ${isUserMessage ? 'text-blue-200' : 'text-gray-500'}`}>
          {formatFileSize(attachment.size)}
        </span>
      </div>
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
      ) : (
        <Download className={`w-4 h-4 flex-shrink-0 ${isUserMessage ? 'text-blue-200' : 'text-gray-400'}`} />
      )}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </button>
  );
};

interface MessageAttachmentsProps {
  attachments: FileAttachment[];
  isUserMessage: boolean;
}

const MessageAttachments = ({ attachments, isUserMessage }: MessageAttachmentsProps) => {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {attachments.map((attachment) => (
        <AttachmentLink
          key={attachment.fileId}
          attachment={attachment}
          isUserMessage={isUserMessage}
        />
      ))}
    </div>
  );
};

export default function ChatWindow() {
  const [inputMessage, setInputMessage] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'positive' | 'negative'>>({});
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const { language, setLanguage, translations } = useLanguage();

  const currentTranslations = translations[language];
  const topicKeys = Object.keys(currentTranslations.topics) as Array<keyof typeof currentTranslations.topics>;
  const popularTopics = topicKeys.map(key => currentTranslations.topics[key]);

  const {
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
  } = useWebSocket(WEBSOCKET_URL);

  const {
    uploadingFiles,
    isUploading,
    uploadFiles,
    removeFile,
    retryUpload,
    getUploadedFileIds,
    clearFiles,
  } = useFileUpload();

  const { login, isAuthenticated } = useAuth();

  const handleSendMessage = async (content?: string, category: string = 'General') => {
    const messageToSend = content || inputMessage.trim();
    console.log('handleSendMessage called:', { messageToSend, category, uploadingFilesLength: uploadingFiles.length, isUploading });

    if (!messageToSend && uploadingFiles.length === 0) {
      console.log('No message to send');
      return;
    }

    if (isUploading) {
      console.log('Files still uploading, not sending');
      return;
    }

    const fileIds = getUploadedFileIds();
    console.log('Sending message with fileIds:', fileIds);

    sendMessage(messageToSend, category, fileIds.length > 0 ? fileIds : undefined, language);
    setInputMessage('');
    setShowWelcome(false);

    clearFiles();
  };

  const handleQuickQuestion = (question: string, category: string) => {
    handleSendMessage(question, category);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      uploadFiles(files, conversationId || undefined);
      e.target.value = '';
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFeedback = async (messageId: string, satisfaction: 'positive' | 'negative') => {
    if (!conversationId || feedbackGiven[messageId]) return;

    try {
      await adminAPI.submitFeedback({
        conversationId,
        satisfaction,
      });
      setFeedbackGiven(prev => ({ ...prev, [messageId]: satisfaction }));
      console.log(`Feedback submitted: ${satisfaction} for message ${messageId}`);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const resetToHome = () => {
    setShowWelcome(true);
    setInputMessage('');
    clearFiles();
    resetChat();
    setFeedbackGiven({});
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    console.log('Attempting login...');

    try {
      const result = await login(email, password);
      console.log('Login result:', result);

      if (result.isSignedIn) {
        console.log('Login successful! Redirecting...');
        setShowAdminLogin(false);
        router.push('/admin');
      } else if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        setLoginError('You need to change your password. Please contact support.');
      } else {
        setLoginError('Unexpected login state. Please try again.');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setLoginError(error.message || 'Login failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAdminClick = () => {
    if (isAuthenticated) {
      router.push('/admin');
    } else {
      setShowAdminLogin(true);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <button
          onClick={resetToHome}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-12 h-12 relative">
            <Image
              src="/pltw-logo.svg"
              alt="PLTW Logo"
              fill
              className="object-contain"
            />
          </div>
          <div className="text-left">
            <h1 className="text-xl font-semibold text-gray-900">Jordan</h1>
            <p className="text-sm text-gray-600">PLTW Support Assistant</p>
          </div>
        </button>

        {/* Language Toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setLanguage('en')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${language === 'en'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
              }`}
            title="English"
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('es')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${language === 'es'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
              }`}
            title="Español"
          >
            ES
          </button>
        </div>
      </header>

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Admin Login</h2>

            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
                  {loginError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-gray-900"
                  placeholder="admin@pltw.org"
                  required
                  disabled={isLoggingIn}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-gray-900"
                  placeholder="••••••••"
                  required
                  disabled={isLoggingIn}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdminLogin(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isLoggingIn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50"
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? 'Logging in...' : 'Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clear Chat Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Clear Conversation?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to clear this conversation? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowClearConfirm(false);
                  resetToHome();
                }}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Clear Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        {showWelcome ? (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <div className="w-24 h-24 relative mx-auto mb-6">
                <Image
                  src="/pltw-logo.svg"
                  alt="PLTW Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-3">
                {currentTranslations.welcomeTitle}
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {currentTranslations.welcomeSubtitle}
              </p>
            </div>

            <div>
              <h3 className="text-center text-gray-700 font-medium mb-8 text-lg">
                {currentTranslations.popularTopics}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {popularTopics.map((topic, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl">{topic.icon}</span>
                      <h4 className="font-semibold text-gray-900 text-lg">{topic.title}</h4>
                    </div>
                    <div className="space-y-2">
                      {topic.questions.map((question, qIdx) => (
                        <button
                          key={qIdx}
                          onClick={() => handleQuickQuestion(question, topic.title)}
                          className="w-full text-left text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 hover:text-blue-900 px-3 py-2 rounded-lg transition-all"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Queue Status Display */}
            {isEscalated && queueInfo && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-2xl font-bold">#{queueInfo.position}</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-900 text-xl">You're in Queue!</h4>
                    <p className="text-sm text-blue-700">Ticket: {queueInfo.ticketId}</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-blue-800">
                  <div className="flex items-center justify-between py-2 border-b border-blue-200">
                    <span className="font-medium">Queue Position:</span>
                    <span className="text-lg font-bold">#{queueInfo.position}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-blue-200">
                    <span className="font-medium">Estimated Wait:</span>
                    <span className="text-lg font-bold">~{queueInfo.estimatedWait} minutes</span>
                  </div>

                  <div className="mt-4 pt-4 border-t border-blue-200 bg-white rounded-lg p-4">
                    <p className="font-semibold mb-3 text-blue-900">Need immediate assistance?</p>
                    <div className="space-y-2">
                      <a
                        href="tel:877-335-7589"
                        className="flex items-center gap-2 text-blue-700 hover:text-blue-900 transition-colors"
                      >
                        <span>📞</span>
                        <span>877.335.7589</span>
                      </a>
                      <a
                        href="mailto:solutioncenter@pltw.org"
                        className="flex items-center gap-2 text-blue-700 hover:text-blue-900 transition-colors"
                      >
                        <span>✉️</span>
                        <span>solutioncenter@pltw.org</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, idx) => (
              <div
                key={msg.messageId || idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-5 py-4 ${msg.role === 'user'
                      ? 'bg-blue-900 text-white'
                      : 'bg-white text-gray-900 shadow-sm border border-gray-200'
                    }`}
                >
                  <div className="text-base leading-relaxed">
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="space-y-1">
                        {formatMessageContent(msg.content)}
                      </div>
                    )}
                  </div>

                  {msg.role === 'assistant' && msg.metadata?.sources && (
                    <CitationDisplay sources={msg.metadata.sources} />
                  )}

                  {msg.attachments && msg.attachments.length > 0 && (
                    <MessageAttachments
                      attachments={msg.attachments}
                      isUserMessage={msg.role === 'user'}
                    />
                  )}

                  <div className={`flex items-center justify-between mt-2`}>
                    <span className={`text-xs ${msg.role === 'user' ? 'opacity-80' : 'opacity-60'}`}>
                      {msg.timestamp ? formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true }) : 'just now'}
                    </span>

                    {msg.role === 'assistant' && (
                      <div className="flex gap-1 ml-3">
                        <button
                          onClick={() => handleFeedback(msg.messageId, 'positive')}
                          disabled={!!feedbackGiven[msg.messageId]}
                          className={`p-1.5 rounded-lg transition-colors ${feedbackGiven[msg.messageId] === 'positive'
                              ? 'bg-green-100 text-green-600'
                              : feedbackGiven[msg.messageId]
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                            }`}
                          title="Helpful"
                        >
                          <ThumbsUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleFeedback(msg.messageId, 'negative')}
                          disabled={!!feedbackGiven[msg.messageId]}
                          className={`p-1.5 rounded-lg transition-colors ${feedbackGiven[msg.messageId] === 'negative'
                              ? 'bg-red-100 text-red-600'
                              : feedbackGiven[msg.messageId]
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                            }`}
                          title="Not helpful"
                        >
                          <ThumbsDown className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-200">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}

            {/* Escalation Suggestion Banner */}
            {shouldEscalate && !isEscalated && contactInfo && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-5">
                <h4 className="font-semibold text-yellow-900 mb-2 text-lg">Need Additional Help?</h4>
                <p className="text-sm text-yellow-800 mb-4">
                  For more complex questions, you can talk to our support team or contact us directly:
                </p>
                <div className="space-y-3">
                  <button
                    onClick={escalateToAgent}
                    className="w-full px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors"
                  >
                    🆘 Connect with Human Agent
                  </button>
                  <div className="text-sm space-y-1">
                    <p className="text-yellow-900 font-medium">
                      📞 Phone: <a href={`tel:${contactInfo.phone}`} className="underline hover:text-yellow-700">{contactInfo.phone}</a>
                    </p>
                    <p className="text-yellow-900 font-medium">
                      ✉️ Email: <a href={`mailto:${contactInfo.email}`} className="underline hover:text-yellow-700">{contactInfo.email}</a>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white border-t px-6 py-5 shadow-lg">
        <div className="max-w-4xl mx-auto">
          {/* Uploading Files Display */}
          {uploadingFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {uploadingFiles.map((uploadFile: UploadingFile) => (
                <div
                  key={uploadFile.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${uploadFile.status === 'error'
                      ? 'bg-red-50 border border-red-200'
                      : uploadFile.status === 'uploaded'
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-gray-100'
                    }`}
                >
                  {uploadFile.status === 'pending' && (
                    <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                  )}
                  {uploadFile.status === 'uploading' && (
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  )}
                  {uploadFile.status === 'uploaded' && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  {uploadFile.status === 'error' && (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}

                  <div className="flex flex-col">
                    <span className={`${uploadFile.status === 'error' ? 'text-red-700' : 'text-gray-700'
                      }`}>
                      {uploadFile.file.name}
                    </span>
                    {uploadFile.status === 'uploading' && (
                      <div className="w-24 h-1 bg-gray-200 rounded-full mt-1">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${uploadFile.progress}%` }}
                        />
                      </div>
                    )}
                    {uploadFile.status === 'error' && uploadFile.error && (
                      <span className="text-xs text-red-600">{uploadFile.error}</span>
                    )}
                  </div>

                  {uploadFile.status === 'error' && (
                    <button
                      onClick={() => retryUpload(uploadFile.id, conversationId || undefined)}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
                      title="Retry upload"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => removeFile(uploadFile.id)}
                    className={`p-1 rounded transition-colors ${uploadFile.status === 'error'
                        ? 'text-red-500 hover:text-red-700 hover:bg-red-100'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                      }`}
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              multiple
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.webp"
            />
            <button
              onClick={handleAttachClick}
              className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Attach files"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder="Ask a question..."
              className="flex-1 px-4 py-3.5 text-base text-gray-900 placeholder-gray-400 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent"
              disabled={!isConnected}
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={(!inputMessage.trim() && uploadingFiles.length === 0) || !isConnected || isUploading}
              className="p-3.5 bg-blue-900 text-white rounded-xl hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
              title={isUploading ? 'Wait for uploads to complete' : 'Send message'}
            >
              <Send className="w-5 h-5" />
            </button>

            {!showWelcome && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors text-sm font-medium"
                title="Clear conversation"
              >
                Clear Chat
              </button>
            )}
          </div>

          {!isConnected && (
            <p className="text-sm text-red-600 mt-2 font-medium">Connecting to chat...</p>
          )}
        </div>
      </div>
    </div>
  );
}
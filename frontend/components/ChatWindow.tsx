'use client';

import { useState, useRef } from 'react';
import { Send, Paperclip, User } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import { useRouter } from 'next/navigation'; // Add this import


const WEBSOCKET_URL = 'wss://14xyazd8ue.execute-api.us-east-1.amazonaws.com/prod';

const popularTopics = [
  {
    title: 'Implementation',
    icon: '📚',
    questions: [
      'How do I implement PLTW in my school?',
      'What support is available during implementation?'
    ]
  },
  {
    title: 'Rostering',
    icon: '👥',
    questions: [
      'How do I upload student rosters?',
      'Can I integrate with my Student Information System?'
    ]
  },
  {
    title: 'Training',
    icon: '🎓',
    questions: [
      'What professional development is available?',
      'Is training available online or in-person?'
    ]
  },
  {
    title: 'Payment',
    icon: '💳',
    questions: [
      'What are the program fees?',
      'What payment options are available?'
    ]
  },
  {
    title: 'Grants',
    icon: '🏆',
    questions: [
      'What grants are available for PLTW?',
      'Can PLTW help with grant applications?'
    ]
  }
];

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

// Format inline text (handle **bold** within text)
const formatInlineText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-gray-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={idx}>{part}</span>;
  });
};

export default function ChatWindow() {
  const [inputMessage, setInputMessage] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false); // Add this
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter(); // Add this

  const {
    isConnected,
    messages,
    isTyping,
    shouldEscalate,
    contactInfo,
    sendMessage,
  } = useWebSocket(WEBSOCKET_URL);

  const { login, logout, isAuthenticated } = useAuth();

  const handleSendMessage = async (content?: string) => {
    const messageToSend = content || inputMessage.trim();
    if (!messageToSend && attachedFiles.length === 0) return;

    if (attachedFiles.length > 0) {
      console.log('Files to upload:', attachedFiles);
      // TODO: Implement S3 upload
    }

    sendMessage(messageToSend, 'General');
    setInputMessage('');
    setShowWelcome(false);
    setAttachedFiles([]);
  };

  const handleQuickQuestion = (question: string) => {
    handleSendMessage(question);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAttachedFiles(Array.from(e.target.files));
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resetToHome = () => {
    setShowWelcome(true);
    setInputMessage('');
    setAttachedFiles([]);
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

        // Use Next.js router for navigation
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

  // Check if already authenticated
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

        {/* Admin Login Button */}
        <button
          onClick={handleAdminClick}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <User className="w-5 h-5" />
          <span className="text-sm font-medium">
            {isAuthenticated ? 'Admin Dashboard' : 'Admin Login'}
          </span>
        </button>
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
      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        {showWelcome && messages.length === 0 ? (
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
                Hello! I&apos;m Jordan
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                I&apos;m happy to help educators with questions about implementation, training, rostering, assessments, payment, and grants.
              </p>
            </div>

            <div>
              <h3 className="text-center text-gray-700 font-medium mb-8 text-lg">
                Popular topics and FAQs:
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
                          onClick={() => handleQuickQuestion(question)}
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
            {messages.map((msg, idx) => (
              <div
                key={msg.messageId || idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-5 py-4 ${
                    msg.role === 'user'
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
                  <span className={`text-xs mt-2 block ${msg.role === 'user' ? 'opacity-80' : 'opacity-60'}`}>
                    {formatDistanceToNow(msg.timestamp, { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}

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

            {shouldEscalate && contactInfo && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-5">
                <h4 className="font-semibold text-yellow-900 mb-2 text-lg">Need Additional Help?</h4>
                <p className="text-sm text-yellow-800 mb-4">
                  For more complex questions, please contact our Solution Center:
                </p>
                <div className="space-y-2 text-sm">
                  <p className="text-yellow-900 font-medium">
                    📞 Phone: <a href={`tel:${contactInfo.phone}`} className="underline hover:text-yellow-700">{contactInfo.phone}</a>
                  </p>
                  <p className="text-yellow-900 font-medium">
                    ✉️ Email: <a href={`mailto:${contactInfo.email}`} className="underline hover:text-yellow-700">{contactInfo.email}</a>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white border-t px-6 py-5 shadow-lg">
        <div className="max-w-4xl mx-auto">
          {attachedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg text-sm"
                >
                  <span className="text-gray-700">{file.name}</span>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-gray-500 hover:text-red-600 font-bold"
                  >
                    ×
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
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
            />
            <button
              onClick={handleAttachClick}
              className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask a question..."
              className="flex-1 px-4 py-3.5 text-base text-gray-900 placeholder-gray-400 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent"
              disabled={!isConnected}
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={(!inputMessage.trim() && attachedFiles.length === 0) || !isConnected}
              className="p-3.5 bg-blue-900 text-white rounded-xl hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          {!isConnected && (
            <p className="text-sm text-red-600 mt-2 font-medium">Connecting to chat...</p>
          )}
        </div>
      </div>
    </div>
  );
}
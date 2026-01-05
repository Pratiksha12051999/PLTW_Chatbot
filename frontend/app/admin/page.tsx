'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { MessageSquare, AlertTriangle, ThumbsUp, TrendingUp, TrendingDown } from 'lucide-react';
import { adminAPI, MetricsResponse, Conversation } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

export default function AdminDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<number>(7);
  const [currentTab, setCurrentTab] = useState('Admin');
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedPeriod]);

  const loadData = async () => {
      setIsLoading(true);
      setError(null);

      console.log(`📊 Loading metrics for ${selectedPeriod} days...`);

      try {
        const [metricsData, conversationsData] = await Promise.all([
          adminAPI.getMetrics(selectedPeriod),
          adminAPI.getConversations(),
        ]);

        console.log('✅ Metrics loaded:', metricsData);
        console.log('✅ Conversations loaded:', conversationsData.conversations?.length || 0, 'conversations');

        setMetrics(metricsData);
        setConversations(conversationsData.conversations || []);
      } catch (err) {
        console.error('❌ Error loading data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

  const maxVolume = metrics
    ? Math.max(...metrics.conversationVolume.map(d => d.count), 1)
    : 1;

  const periodDaysMap: { [key: string]: number } = {
    'Last 7 Days': 7,
    'Last 30 Days': 30,
    'Last 3 Months': 90,
    'All Time': 365,
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-red-600">{error || 'Failed to load data'}</div>
      </div>
    );
  }

  const totalEscalations =
    metrics.escalationReasons.no_answer +
    metrics.escalationReasons.user_not_satisfied +
    metrics.escalationReasons.requested_agent;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 relative">
                  <Image
                    src="/pltw-logo.svg"
                    alt="PLTW Logo"
                    fill
                    className="object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Jordan</h1>
                  <p className="text-sm text-gray-600">PLTW Support Assistant</p>
                </div>
              </div>

              {/* Tabs */}
              <nav className="flex gap-1">
                <button
                  onClick={() => window.location.href = '/'}
                  className="px-4 py-2 rounded-lg font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Chatbot
                </button>
                <button
                  onClick={() => setCurrentTab('Admin')}
                  className="px-4 py-2 rounded-lg font-medium bg-gray-100 text-gray-900 transition-colors"
                >
                  Admin
                </button>
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Title and Period Selector */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h2>
            <p className="text-gray-600">Monitor chatbot performance and user interactions</p>
          </div>

          <div className="flex gap-2">
            {Object.entries(periodDaysMap).map(([label, days]) => (
              <button
                key={label}
                onClick={() => setSelectedPeriod(days)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedPeriod === days
                    ? 'bg-blue-900 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Conversations */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div className="text-sm font-medium text-gray-600">Total Conversations</div>
              <MessageSquare className="w-8 h-8 text-blue-500" />
            </div>
            <div className="text-4xl font-bold text-gray-900 mb-2">{metrics.totalConversations}</div>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <span>Last {selectedPeriod} days</span>
            </div>
          </div>

          {/* Escalation Rate */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div className="text-sm font-medium text-gray-600">Escalation Rate</div>
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
            <div className="text-4xl font-bold text-gray-900 mb-2">{metrics.escalationRate.toFixed(1)}%</div>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <span>{totalEscalations} escalations</span>
            </div>
          </div>

          {/* Overall Satisfaction */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div className="text-sm font-medium text-gray-600">Overall Satisfaction</div>
              <ThumbsUp className="w-8 h-8 text-green-500" />
            </div>
            <div className="text-4xl font-bold text-gray-900 mb-2">{metrics.overallSatisfaction.toFixed(1)}%</div>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <span>Based on user feedback</span>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Conversation Volume Chart */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Conversation Volume Over Time</h3>
            {metrics.conversationVolume.length > 0 ? (
              <div className="h-64 flex items-end justify-between gap-2">
                {metrics.conversationVolume.map((item, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-blue-600 rounded-t-lg relative" style={{ height: `${(item.count / maxVolume) * 100}%`, minHeight: item.count > 0 ? '20px' : '0' }}>
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-600">
                        {item.count}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No conversation data available
              </div>
            )}
          </div>

          {/* Escalation Reasons Donut */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Escalation Reasons</h3>
            <div className="flex items-center justify-center h-64">
              {totalEscalations > 0 ? (
                <div className="relative w-48 h-48">
                  <svg viewBox="0 0 100 100" className="transform -rotate-90">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#1e3a8a"
                      strokeWidth="20"
                      strokeDasharray={`${(metrics.escalationReasons.no_answer / totalEscalations) * 251} 251`}
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="20"
                      strokeDasharray={`${(metrics.escalationReasons.user_not_satisfied / totalEscalations) * 251} 251`}
                      strokeDashoffset={`-${(metrics.escalationReasons.no_answer / totalEscalations) * 251}`}
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#93c5fd"
                      strokeWidth="20"
                      strokeDasharray={`${(metrics.escalationReasons.requested_agent / totalEscalations) * 251} 251`}
                      strokeDashoffset={`-${((metrics.escalationReasons.no_answer + metrics.escalationReasons.user_not_satisfied) / totalEscalations) * 251}`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{metrics.escalationRate.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500">No escalations</div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full bg-blue-900"></div>
                </div>
                <div className="text-xs text-gray-600">No answer</div>
                <div className="text-sm font-medium text-gray-900">{metrics.escalationReasons.no_answer}</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                </div>
                <div className="text-xs text-gray-600">Not satisfied</div>
                <div className="text-sm font-medium text-gray-900">{metrics.escalationReasons.user_not_satisfied}</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full bg-blue-300"></div>
                </div>
                <div className="text-xs text-gray-600">Requested agent</div>
                <div className="text-sm font-medium text-gray-900">{metrics.escalationReasons.requested_agent}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Question Categories */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Question Categories</h3>
            {metrics.topCategories.length > 0 ? (
              <div className="space-y-4">
                {metrics.topCategories.map((category, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="w-32 text-sm text-gray-600 text-right">{category.category}</div>
                    <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-lg"
                        style={{ width: `${(category.count / metrics.topCategories[0].count) * 100}%` }}
                      ></div>
                    </div>
                    <div className="w-12 text-sm font-medium text-gray-900">{category.count}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">No category data available</div>
            )}
          </div>

          {/* User Satisfaction Donut - Placeholder */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">User Satisfaction</h3>
            <div className="flex items-center justify-center h-64">
              <div className="relative w-48 h-48">
                <svg viewBox="0 0 100 100" className="transform -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="20" strokeDasharray={`${metrics.overallSatisfaction * 2.51} 251`} />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#ef4444" strokeWidth="20" strokeDasharray={`${(100 - metrics.overallSatisfaction) * 2.51} 251`} strokeDashoffset={`-${metrics.overallSatisfaction * 2.51}`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">{metrics.overallSatisfaction.toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-600">Positive</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm text-gray-600">Negative</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Conversations Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Conversations</h3>
          </div>
          {conversations.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Topic Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date / Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {conversations.slice(0, 10).map((conv, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {conv.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        conv.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {conv.status === 'active' ? 'Resolved by bot' : 'Escalated'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(conv.startTime)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-500">No conversations available</div>
          )}
        </div>
      </main>
    </div>
  );
}
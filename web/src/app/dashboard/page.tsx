'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { Eye, RefreshCw, MessageSquare, Users, Brain, BarChart3 } from 'lucide-react';

interface ChatSession {
  _id: string;
  session_id: string;
  room_name: string;
  room_type: 'individual' | 'group';
  status: 'active' | 'closed' | 'summarizing';
  start_time: string;
  end_time?: string;
  message_count: number;
  has_summary: boolean;
}

interface SessionsResponse {
  sessions: ChatSession[];
  pagination: {
    page: number;
    total: number;
    pages: number;
  };
}

export default function DashboardPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('all');
  const [stats, setStats] = useState({
    totalSessions: 0,
    activeSessions: 0,
    totalSummaries: 0,
    avgMessagesPerSession: 0
  });

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);

      // Fetch real sessions from backend
      const response = await fetch(`/api/trpc/sessions.list?batch=1&input={"0":{"json":{${filter !== 'all' ? `"status":"${filter}",` : ''}"limit":50}}}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.status}`);
      }

      const data = await response.json();
      const sessionData = data[0]?.result?.data;

      if (sessionData && sessionData.sessions) {
        setSessions(sessionData.sessions);
        setStats({
          totalSessions: sessionData.pagination?.total || sessionData.sessions.length,
          activeSessions: sessionData.sessions.filter((s: ChatSession) => s.status === 'active').length,
          totalSummaries: sessionData.sessions.filter((s: ChatSession) => s.has_summary).length,
          avgMessagesPerSession: sessionData.sessions.length > 0 ?
            Math.round(sessionData.sessions.reduce((acc: number, s: ChatSession) => acc + s.message_count, 0) / sessionData.sessions.length) : 0
        });
      } else {
        // No sessions found
        setSessions([]);
        setStats({
          totalSessions: 0,
          activeSessions: 0,
          totalSummaries: 0,
          avgMessagesPerSession: 0
        });
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError(`Failed to load sessions: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setSessions([]);
      setStats({
        totalSessions: 0,
        activeSessions: 0,
        totalSummaries: 0,
        avgMessagesPerSession: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [filter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'closed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'summarizing':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return '🟢';
      case 'closed':
        return '✅';
      case 'summarizing':
        return '🤖';
      default:
        return '⚪';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading chat sessions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-red-600 mb-4">Error: {error}</p>
            <Button onClick={fetchSessions}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Chat Summarizer Dashboard</h1>
          <p className="text-gray-600">AI-powered LINE chat analysis and summarization</p>
        </div>
        <Button onClick={fetchSessions}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <MessageSquare className="w-4 h-4 mr-2" />
              Total Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Active Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeSessions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Brain className="w-4 h-4 mr-2" />
              AI Summaries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalSummaries}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <BarChart3 className="w-4 h-4 mr-2" />
              Avg Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.avgMessagesPerSession}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg w-fit">
        {[
          { key: 'all', label: 'All Sessions' },
          { key: 'active', label: 'Active' },
          { key: 'closed', label: 'Completed' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filter === 'all' ? 'All Chat Sessions' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Sessions`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No chat sessions found.
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.session_id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">
                        {getStatusIcon(session.status)}
                      </span>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {session.session_id}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {session.room_name} ({session.room_type}) •
                          {session.message_count} messages •
                          {formatRelativeTime(session.start_time)}
                          {session.has_summary && ' • ✨ Summarized'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(session.status)}`}>
                      {session.status}
                    </span>

                    <Link href={`/dashboard/sessions/${session.session_id}`}>
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <h3 className="font-medium text-gray-900 mb-1">Active Rooms</h3>
            <p className="text-sm text-gray-500">View all active chat rooms</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <Brain className="w-8 h-8 mx-auto mb-2 text-purple-600" />
            <h3 className="font-medium text-gray-900 mb-1">AI Analytics</h3>
            <p className="text-sm text-gray-500">View conversation insights</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <h3 className="font-medium text-gray-900 mb-1">Reports</h3>
            <p className="text-sm text-gray-500">Generate summary reports</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
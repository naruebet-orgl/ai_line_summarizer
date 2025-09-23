'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatRelativeTime, getStatusColor } from '@/lib/utils';
import { MessageSquare, Clock, Eye, RefreshCw, Activity, Brain } from 'lucide-react';

interface Session {
  _id: string;
  session_id: string;
  room_name: string;
  room_type: 'group' | 'user';
  status: 'active' | 'closed' | 'summarizing';
  start_time: string;
  end_time?: string;
  message_count: number;
  has_summary: boolean;
  participants?: string[];
  last_activity?: string;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('active');
  const [stats, setStats] = useState({
    totalSessions: 0,
    activeSessions: 0,
    totalMessages: 0,
    avgMessagesPerSession: 0
  });

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all sessions from backend and filter for individual sessions
      const response = await fetch(`/api/trpc/sessions.list?batch=1&input={"0":{"json":{"limit":50}}}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.status}`);
      }

      const data = await response.json();
      const sessionData = data[0]?.result?.data;

      if (sessionData && sessionData.sessions) {
        // Filter for individual sessions only (non-group)
        const individualSessions = sessionData.sessions.filter((s: any) =>
          s.room_type === 'user' || s.room_id?.type === 'user' || (!s.room_type && !s.room_id?.type)
        );

        // Filter by status if needed
        const filteredSessions = filter === 'all' ? individualSessions :
          individualSessions.filter((s: Session) => s.status === filter);

        setSessions(filteredSessions);
        setStats({
          totalSessions: individualSessions.length,
          activeSessions: individualSessions.filter((s: Session) => s.status === 'active').length,
          totalMessages: individualSessions.reduce((acc: number, s: Session) => acc + s.message_count, 0),
          avgMessagesPerSession: individualSessions.length > 0 ?
            Math.round(individualSessions.reduce((acc: number, s: Session) => acc + s.message_count, 0) / individualSessions.length) : 0
        });
      } else {
        // No sessions found
        setSessions([]);
        setStats({
          totalSessions: 0,
          activeSessions: 0,
          totalMessages: 0,
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
        totalMessages: 0,
        avgMessagesPerSession: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [filter]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Activity className="w-4 h-4 text-green-600" />;
      case 'closed':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'summarizing':
        return <Brain className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-normal text-gray-900">Individual Sessions</h1>
            <p className="text-gray-600">AI-powered individual conversation analytics</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="ml-2">Loading sessions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-normal text-gray-900">Individual Sessions</h1>
            <p className="text-gray-600">AI-powered individual conversation analytics</p>
          </div>
        </div>
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-normal text-gray-900">Individual Sessions</h1>
          <p className="text-gray-600">AI-powered individual conversation analytics</p>
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
            <CardTitle className="text-sm font-normal text-gray-600 flex items-center">
              <MessageSquare className="w-4 h-4 mr-2" />
              Total Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-normal">{stats.totalSessions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-gray-600 flex items-center">
              <Activity className="w-4 h-4 mr-2" />
              Active Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-normal text-green-600">{stats.activeSessions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-gray-600 flex items-center">
              <MessageSquare className="w-4 h-4 mr-2" />
              Total Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-normal text-blue-600">{stats.totalMessages}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-gray-600 flex items-center">
              <MessageSquare className="w-4 h-4 mr-2" />
              Avg Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-normal text-purple-600">{stats.avgMessagesPerSession}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex space-x-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All Sessions
        </Button>
        <Button
          variant={filter === 'active' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('active')}
        >
          Active
        </Button>
        <Button
          variant={filter === 'closed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('closed')}
        >
          Completed
        </Button>
      </div>

      {/* Sessions Grid */}
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-base font-normal text-gray-900 mb-2">No individual sessions found</h3>
              <p className="text-gray-500 mb-4">
                Start conversations with your LINE bot to see individual sessions here.
              </p>
              <Button variant="outline" onClick={fetchSessions}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => (
            <Card key={session.session_id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-normal truncate pr-2">
                    {session.room_name}
                  </CardTitle>
                  <Badge className={`${getStatusColor(session.status)} flex items-center space-x-1`}>
                    {getStatusIcon(session.status)}
                    <span className="text-xs">{session.status}</span>
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Session Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Session ID</span>
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                      {session.session_id.substring(0, 8)}...
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Messages</span>
                    <span className="font-normal text-blue-600">{session.message_count}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Started</span>
                    <span className="text-gray-700">{formatRelativeTime(session.start_time)}</span>
                  </div>

                  {session.has_summary && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">AI Summary</span>
                      <span className="flex items-center text-green-600">
                        <Brain className="w-3 h-3 mr-1" />
                        Ready
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <div className="pt-2 border-t">
                  <Link href={`/dashboard/sessions/${session.session_id}`} className="w-full">
                    <Button variant="outline" size="sm" className="w-full">
                      <Eye className="w-4 h-4 mr-2" />
                      View Session
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
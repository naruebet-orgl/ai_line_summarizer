'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatRelativeTime, getStatusColor, getStatusIcon } from '@/lib/utils';
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
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('active');
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

      // Fetch all sessions from backend (no server-side filtering)
      const inputObj = {
        limit: 50
      };

      console.log('🔍 Fetching sessions with filter:', filter, 'inputObj:', inputObj);

      const response = await fetch(`/api/trpc/sessions.list?batch=1&input=${encodeURIComponent(JSON.stringify({"0":{"json":inputObj}}))}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.status}`);
      }

      const data = await response.json();
      const sessionData = data[0]?.result?.data;

      if (sessionData && sessionData.sessions) {
        console.log('📊 Received sessions:', sessionData.sessions.map(s => ({ id: s.session_id, status: s.status })));
        console.log('🔍 Filter applied:', filter, 'Received count:', sessionData.sessions.length);

        // Apply client-side filtering
        const allSessions = sessionData.sessions;
        const filteredSessions = filter === 'all' ? allSessions :
          allSessions.filter((s: ChatSession) => s.status === filter);

        console.log('🔍 Filtered sessions count:', filteredSessions.length);

        setSessions(filteredSessions);
        setStats({
          totalSessions: allSessions.length,
          activeSessions: allSessions.filter((s: ChatSession) => s.status === 'active').length,
          totalSummaries: allSessions.filter((s: ChatSession) => s.has_summary).length,
          avgMessagesPerSession: allSessions.length > 0 ?
            Math.round(allSessions.reduce((acc: number, s: ChatSession) => acc + s.message_count, 0) / allSessions.length) : 0
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
      <Card className="border-gray-300">
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-gray-300">
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

        <Card className="border-gray-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-gray-600 flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Active Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-normal text-green-600">{stats.activeSessions}</div>
          </CardContent>
        </Card>


        <Card className="border-gray-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-gray-600 flex items-center">
              <BarChart3 className="w-4 h-4 mr-2" />
              Avg Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-normal text-purple-600">{stats.avgMessagesPerSession}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(value) => setFilter(value as any)} className="w-fit">
        <TabsList>
          <TabsTrigger value="all">All Sessions</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="closed">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Sessions List */}
      <Card className="border-gray-300">
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
                        <h3 className="font-normal text-gray-900">
                          {session.room_name || 'Unknown Room'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {session.session_id} • ({session.room_type}) •
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

    </div>
  );
}
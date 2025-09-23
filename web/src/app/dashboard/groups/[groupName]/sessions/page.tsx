'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Eye, RefreshCw, MessageSquare, Clock, Brain, Activity } from 'lucide-react';
import { formatRelativeTime, getStatusColor, getStatusIcon } from '@/lib/utils';

interface GroupSession {
  _id: string;
  session_id: string;
  room_name: string;
  room_type: 'group';
  status: 'active' | 'closed' | 'summarizing';
  start_time: string;
  end_time?: string;
  message_count: number;
  has_summary: boolean;
  participants?: string[];
}

export default function GroupSessionsPage() {
  const params = useParams();
  const groupName = decodeURIComponent(params.groupName as string);
  const [sessions, setSessions] = useState<GroupSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroupSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all sessions and filter by group name
      const response = await fetch(`/api/trpc/sessions.list?batch=1&input={"0":{"json":{"limit":100}}}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.status}`);
      }

      const data = await response.json();
      const sessionData = data[0]?.result?.data;

      if (sessionData && sessionData.sessions) {
        // Filter sessions for this specific group
        const groupSessions = sessionData.sessions.filter((s: any) =>
          s.room_name === groupName && (s.room_type === 'group' || s.room_id?.type === 'group')
        );

        // Sort by start time (newest first)
        groupSessions.sort((a: any, b: any) =>
          new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
        );

        setSessions(groupSessions);
      } else {
        setSessions([]);
      }
    } catch (err) {
      console.error('Error fetching group sessions:', err);
      setError(`Failed to load sessions: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupSessions();
  }, [groupName]);

  if (loading) {
    return (
      <div className="space-y-6">
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
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">Error: {error}</p>
              <Button onClick={fetchGroupSessions}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = {
    totalSessions: sessions.length,
    activeSessions: sessions.filter(s => s.status === 'active').length,
    totalMessages: sessions.reduce((acc, s) => acc + s.message_count, 0),
    sessionsWithSummary: sessions.filter(s => s.has_summary).length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-normal text-gray-900">{groupName}</h1>
          <p className="text-gray-600">Group chat sessions and analytics</p>
        </div>
        <Button onClick={fetchGroupSessions}>
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
              <Brain className="w-4 h-4 mr-2" />
              AI Summaries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-normal text-purple-600">{stats.sessionsWithSummary}</div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No sessions found for this group.
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
                          Session {session.session_id.substring(13)}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {session.message_count} messages •
                          {formatRelativeTime(session.start_time)}
                          {session.has_summary && ' • ✨ Summarized'}
                          {session.end_time && ` • Ended ${formatRelativeTime(session.end_time)}`}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Badge className={getStatusColor(session.status)}>
                      {session.status}
                    </Badge>

                    <Link href={`/dashboard/sessions/${session.session_id}`}>
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4 mr-2" />
                        View Session
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
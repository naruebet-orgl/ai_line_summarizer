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
  const lineRoomId = params.lineRoomId as string;
  const [sessions, setSessions] = useState<GroupSession[]>([]);
  const [groupName, setGroupName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const sessionsPerPage = 20;

  const fetchGroupSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Filter sessions on backend by line_room_id with pagination
      // Backend indexes sessions by line_room_id for fast queries
      const response = await fetch(
        `/api/trpc/sessions.list?batch=1&input=${encodeURIComponent(
          JSON.stringify({
            "0": {
              json: {
                line_room_id: lineRoomId,  // Server-side filter by LINE room ID
                page: page,
                limit: sessionsPerPage  // Paginate for better performance
              }
            }
          })
        )}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.status}`);
      }

      const data = await response.json();
      const sessionData = data[0]?.result?.data;

      if (sessionData && sessionData.sessions) {
        const pagination = sessionData.pagination || {};

        console.log(`✅ Fetched ${sessionData.sessions.length} sessions (page ${page} of ${pagination.pages || 1})`);
        console.log(`📊 Total sessions for this group: ${pagination.total || sessionData.sessions.length}`);
        console.log('Sample sessions:', sessionData.sessions.slice(0, 3).map((s: any) => ({
          session_id: s.session_id,
          room_name: s.room_name,
          message_count: s.message_count
        })));

        // Update pagination info
        setTotalSessions(pagination.total || sessionData.sessions.length);
        setTotalPages(pagination.pages || 1);

        // Backend already filtered by line_room_id, no client-side filtering needed
        const groupSessions = sessionData.sessions;

        // Sort by start time (newest first)
        groupSessions.sort((a: any, b: any) =>
          new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
        );

        // Extract group name from first session
        if (groupSessions.length > 0) {
          setGroupName(groupSessions[0].room_name || 'Unknown Group');
        } else {
          // Fallback: fetch group info from rooms endpoint when no sessions exist
          try {
            console.log('🔄 Fetching room info from rooms.getAiGroups...');
            const roomResponse = await fetch(`/api/trpc/rooms.getAiGroups?batch=1&input={"0":{"json":{}}}`);
            const roomData = await roomResponse.json();

            console.log('Room API response:', roomData);
            console.log('roomData[0]?.result?.data:', roomData[0]?.result?.data);

            const responseData = roomData[0]?.result?.data;
            if (!responseData) {
              console.error('❌ No data in response');
              setGroupName('Unknown Group');
              return;
            }

            const groupsData = responseData.groups;
            if (!Array.isArray(groupsData)) {
              console.error('❌ groups is not an array:', typeof groupsData, groupsData);
              setGroupName('Unknown Group');
              return;
            }

            console.log(`Found ${groupsData.length} groups, searching for line_group_id: ${lineRoomId}`);
            const room = groupsData.find((g: any) => g.line_group_id === lineRoomId);

            if (room) {
              console.log(`✓ Found room:`, room);
              setGroupName(room.group_name || 'Unknown Group');
            } else {
              console.log(`❌ No room found with line_group_id: ${lineRoomId}`);
              setGroupName('Unknown Group');
            }
          } catch (roomErr) {
            console.error('❌ Failed to fetch room info:', roomErr);
            setGroupName('Unknown Group');
          }
        }

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
  }, [lineRoomId, page]);

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
    totalSessions: totalSessions,  // Use total from pagination, not just current page
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

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Page {page} of {totalPages} ({totalSessions} total sessions)
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
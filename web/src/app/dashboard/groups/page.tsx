'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatDate, formatRelativeTime, getStatusColor } from '@/lib/utils';
import { Users, MessageSquare, Clock, Eye, RefreshCw, Activity, Brain } from 'lucide-react';

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
  last_activity?: string;
}

interface GroupsResponse {
  groups: GroupSession[];
  stats: {
    totalGroups: number;
    activeGroups: number;
    totalMessages: number;
    avgMessagesPerGroup: number;
  };
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('active');
  const [stats, setStats] = useState({
    totalGroups: 0,
    activeGroups: 0,
    totalMessages: 0,
    avgMessagesPerGroup: 0
  });

  const fetchGroups = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all sessions from backend and filter for groups
      const response = await fetch(`/api/trpc/sessions.list?batch=1&input={"0":{"json":{"limit":50}}}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch groups: ${response.status}`);
      }

      const data = await response.json();
      const sessionData = data[0]?.result?.data;

      if (sessionData && sessionData.sessions) {
        // Filter for group sessions only
        const groupSessions = sessionData.sessions.filter((s: any) =>
          s.room_type === 'group' || s.room_id?.type === 'group'
        );

        // Filter by status if needed
        const filteredGroups = filter === 'all' ? groupSessions :
          groupSessions.filter((s: GroupSession) => s.status === filter);

        setGroups(filteredGroups);
        setStats({
          totalGroups: groupSessions.length,
          activeGroups: groupSessions.filter((s: GroupSession) => s.status === 'active').length,
          totalMessages: groupSessions.reduce((acc: number, s: GroupSession) => acc + s.message_count, 0),
          avgMessagesPerGroup: groupSessions.length > 0 ?
            Math.round(groupSessions.reduce((acc: number, s: GroupSession) => acc + s.message_count, 0) / groupSessions.length) : 0
        });
      } else {
        // No groups found
        setGroups([]);
        setStats({
          totalGroups: 0,
          activeGroups: 0,
          totalMessages: 0,
          avgMessagesPerGroup: 0
        });
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
      setError(`Failed to load groups: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setGroups([]);
      setStats({
        totalGroups: 0,
        activeGroups: 0,
        totalMessages: 0,
        avgMessagesPerGroup: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
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
            <h1 className="text-2xl font-normal text-gray-900">Group Chats</h1>
            <p className="text-gray-600">AI-powered group conversation analytics</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="ml-2">Loading group chats...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-normal text-gray-900">Group Chats</h1>
            <p className="text-gray-600">AI-powered group conversation analytics</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">Error: {error}</p>
              <Button onClick={fetchGroups}>
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
          <h1 className="text-2xl font-normal text-gray-900">Group Chats</h1>
          <p className="text-gray-600">AI-powered group conversation analytics</p>
        </div>
        <Button onClick={fetchGroups}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-gray-600 flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Total Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-normal">{stats.totalGroups}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-gray-600 flex items-center">
              <Activity className="w-4 h-4 mr-2" />
              Active Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-normal text-green-600">{stats.activeGroups}</div>
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
            <div className="text-xl font-normal text-purple-600">{stats.avgMessagesPerGroup}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(value) => setFilter(value as any)} className="w-fit">
        <TabsList>
          <TabsTrigger value="all">All Groups</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="closed">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Groups Grid */}
      {groups.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-base font-normal text-gray-900 mb-2">No group chats found</h3>
              <p className="text-gray-500 mb-4">
                Add your LINE bot to group chats to start tracking conversations.
              </p>
              <Button variant="outline" onClick={fetchGroups}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <Card key={group.session_id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-normal truncate pr-2">
                    {group.room_name}
                  </CardTitle>
                  <Badge className={`${getStatusColor(group.status)} flex items-center space-x-1`}>
                    {getStatusIcon(group.status)}
                    <span className="text-xs">{group.status}</span>
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Session Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Session ID</span>
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                      {group.session_id.substring(0, 8)}...
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Messages</span>
                    <span className="font-normal text-blue-600">{group.message_count}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Started</span>
                    <span className="text-gray-700">{formatRelativeTime(group.start_time)}</span>
                  </div>

                  {group.has_summary && (
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
                  <Link href={`/dashboard/sessions/${group.session_id}`} className="w-full">
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
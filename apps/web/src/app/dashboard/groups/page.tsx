'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatDate, formatRelativeTime, getStatusColor } from '@/lib/utils';
import { Users, MessageSquare, Clock, Eye, RefreshCw, Activity, Brain, Search, ArrowUpDown } from 'lucide-react';

interface GroupSession {
  _id: string;
  session_id: string;
  room_name: string;
  line_room_id: string;
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
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'active' | 'messages'>('active');
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

      // Fetch ALL AI groups using dedicated endpoint (no pagination)
      const response = await fetch(`/api/trpc/rooms.getAiGroups?batch=1&input={"0":{"json":{}}}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch groups: ${response.status}`);
      }

      const data = await response.json();
      const result = data[0]?.result?.data;

      if (result && result.groups) {
        // Map groups to group sessions format
        const allGroupRooms = result.groups.map((group: any) => {
          // Determine status based on last activity (within 24h = active)
          const lastActivity = group.last_activity ? new Date(group.last_activity) : null;
          const isRecent = lastActivity && (Date.now() - lastActivity.getTime()) < 24 * 60 * 60 * 1000;

          return {
            _id: group.room_id,
            session_id: group.room_id,
            room_name: group.group_name,
            line_room_id: group.line_group_id,
            room_type: 'group' as const,
            status: isRecent ? 'active' as const : 'closed' as const,
            start_time: group.created_at || group.last_activity || new Date().toISOString(),
            message_count: group.statistics?.total_messages || 0,
            has_summary: (group.statistics?.total_summaries || 0) > 0,
            last_activity: group.last_activity
          };
        });

        setGroups(allGroupRooms);
        setStats({
          totalGroups: allGroupRooms.length,
          activeGroups: allGroupRooms.filter((g: GroupSession) => g.status === 'active').length,
          totalMessages: allGroupRooms.reduce((acc: number, g: GroupSession) => acc + g.message_count, 0),
          avgMessagesPerGroup: allGroupRooms.length > 0 ?
            Math.round(allGroupRooms.reduce((acc: number, g: GroupSession) => acc + g.message_count, 0) / allGroupRooms.length) : 0
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
  }, []);

  // Filter, search, and sort groups
  const filteredAndSortedGroups = React.useMemo(() => {
    let filtered = groups;

    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(g => g.status === filter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(g =>
        g.room_name.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.room_name.localeCompare(b.room_name);
        case 'name-desc':
          return b.room_name.localeCompare(a.room_name);
        case 'active':
          // Active first, then by last activity
          if (a.status !== b.status) {
            return a.status === 'active' ? -1 : 1;
          }
          const aTime = a.last_activity ? new Date(a.last_activity).getTime() : 0;
          const bTime = b.last_activity ? new Date(b.last_activity).getTime() : 0;
          return bTime - aTime;
        case 'messages':
          return b.message_count - a.message_count;
        default:
          return 0;
      }
    });

    return sorted;
  }, [groups, filter, searchQuery, sortBy]);


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
            <div className="text-xl font-normal text-green-600">{stats.totalMessages}</div>
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
            <div className="text-xl font-normal text-green-600">{stats.avgMessagesPerGroup}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-gray-600" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border rounded-md text-sm bg-white"
          >
            <option value="active">Active First</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="messages">Most Messages</option>
          </select>
        </div>

        {/* Filter Buttons */}
        <div className="flex space-x-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
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
            Closed
          </Button>
        </div>
      </div>

      {/* Groups Grid */}
      {filteredAndSortedGroups.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-base font-normal text-gray-900 mb-2">
                {groups.length === 0 ? 'No group chats found' : 'No groups match your filters'}
              </h3>
              <p className="text-gray-500 mb-4">
                {groups.length === 0
                  ? 'Add your LINE bot to group chats to start tracking conversations.'
                  : 'Try adjusting your search or filter criteria.'}
              </p>
              {groups.length === 0 && (
                <Button variant="outline" onClick={fetchGroups}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div>
          <div className="mb-4 text-sm text-gray-600">
            Showing {filteredAndSortedGroups.length} of {stats.totalGroups} groups
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedGroups.map((group) => (
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
                    <span className="font-normal text-green-600">{group.message_count}</span>
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
                  <Link href={`/dashboard/groups/${group.line_room_id}/sessions`} className="w-full">
                    <Button variant="outline" size="sm" className="w-full">
                      <Eye className="w-4 h-4 mr-2" />
                      View Group Sessions
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        </div>
      )}
    </div>
  );
}
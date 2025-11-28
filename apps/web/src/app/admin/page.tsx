'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Building2,
  Users,
  MessageSquare,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  RefreshCw,
  Loader2,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  ScrollText
} from 'lucide-react';

/**
 * Platform statistics interface
 * @interface PlatformStats
 */
interface PlatformStats {
  organizations: {
    total: number;
    active: number;
    suspended: number;
    trial: number;
  };
  users: {
    total: number;
    active: number;
    new_this_month: number;
  };
  sessions: {
    total: number;
    active: number;
    today: number;
  };
  summaries: {
    total: number;
    today: number;
  };
  messages: {
    total: number;
    today: number;
  };
}

/**
 * Recent activity item interface
 * @interface ActivityItem
 */
interface ActivityItem {
  id: string;
  action: string;
  description: string;
  user_name: string;
  organization_name?: string;
  timestamp: string;
  status: 'success' | 'failure' | 'warning';
}

/**
 * Admin Dashboard Page
 * @description Platform overview with statistics and recent activity
 */
export default function AdminDashboardPage() {
  const [stats, set_stats] = useState<PlatformStats | null>(null);
  const [recent_activity, set_recent_activity] = useState<ActivityItem[]>([]);
  const [loading, set_loading] = useState(true);
  const [error_message, set_error_message] = useState<string | null>(null);

  useEffect(() => {
    fetch_dashboard_data();
  }, []);

  /**
   * Fetch dashboard statistics and activity
   * @description Calls platform admin API endpoints
   */
  const fetch_dashboard_data = async () => {
    try {
      set_loading(true);
      set_error_message(null);

      // Fetch platform stats
      const stats_response = await fetch('/api/trpc/platform.getStats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({})
      });

      if (stats_response.ok) {
        const stats_data = await stats_response.json();
        if (stats_data.result?.data) {
          set_stats(stats_data.result.data);
        }
      }

      // Fetch recent audit logs
      const audit_response = await fetch('/api/trpc/platform.getAuditLogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ limit: 10 })
      });

      if (audit_response.ok) {
        const audit_data = await audit_response.json();
        if (audit_data.result?.data?.logs) {
          set_recent_activity(audit_data.result.data.logs.map((log: any) => ({
            id: log._id,
            action: log.action,
            description: log.description || log.action,
            user_name: log.user?.name || 'System',
            organization_name: log.organization?.name,
            timestamp: log.created_at,
            status: log.status || 'success'
          })));
        }
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      set_error_message('Failed to load dashboard data');
    } finally {
      set_loading(false);
    }
  };

  /**
   * Get status icon based on status
   * @param status - Status string
   * @returns Icon component
   */
  const get_status_icon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failure':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  /**
   * Format timestamp to relative time
   * @param timestamp - ISO timestamp string
   * @returns Formatted relative time string
   */
  const format_relative_time = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff_ms = now.getTime() - date.getTime();
    const diff_mins = Math.floor(diff_ms / 60000);
    const diff_hours = Math.floor(diff_ms / 3600000);
    const diff_days = Math.floor(diff_ms / 86400000);

    if (diff_mins < 1) return 'Just now';
    if (diff_mins < 60) return `${diff_mins}m ago`;
    if (diff_hours < 24) return `${diff_hours}h ago`;
    if (diff_days < 7) return `${diff_days}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Platform Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of all platform activity and statistics</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetch_dashboard_data}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Error Message */}
      {error_message && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error_message}</AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Organizations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Organizations</CardTitle>
            <Building2 className="w-5 h-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.organizations.total || 0}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-green-600">
                {stats?.organizations.active || 0} active
              </Badge>
              {(stats?.organizations.suspended || 0) > 0 && (
                <Badge variant="outline" className="text-red-600">
                  {stats?.organizations.suspended} suspended
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Users</CardTitle>
            <Users className="w-5 h-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.users.total || 0}</div>
            <div className="flex items-center gap-1 mt-2 text-sm">
              {(stats?.users.new_this_month || 0) > 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-green-600">+{stats?.users.new_this_month} this month</span>
                </>
              ) : (
                <span className="text-gray-500">{stats?.users.active || 0} active</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sessions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Chat Sessions</CardTitle>
            <MessageSquare className="w-5 h-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.sessions.total || 0}</div>
            <div className="flex items-center gap-2 mt-2 text-sm">
              <Badge variant="outline" className="text-purple-600">
                {stats?.sessions.active || 0} active
              </Badge>
              <span className="text-gray-500">{stats?.sessions.today || 0} today</span>
            </div>
          </CardContent>
        </Card>

        {/* Summaries */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">AI Summaries</CardTitle>
            <FileText className="w-5 h-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.summaries.total || 0}</div>
            <div className="flex items-center gap-1 mt-2 text-sm">
              <Activity className="w-4 h-4 text-orange-500" />
              <span className="text-gray-500">{stats?.summaries.today || 0} generated today</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Organization Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Organization Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Active</span>
                </div>
                <span className="font-semibold">{stats?.organizations.active || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>Trial</span>
                </div>
                <span className="font-semibold">{stats?.organizations.trial || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Suspended</span>
                </div>
                <span className="font-semibold">{stats?.organizations.suspended || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest platform events</CardDescription>
          </CardHeader>
          <CardContent>
            {recent_activity.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Activity className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recent_activity.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg">
                    {get_status_icon(item.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.user_name}
                        {item.organization_name && ` • ${item.organization_name}`}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {format_relative_time(item.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <a href="/admin/organizations">
                <Building2 className="w-4 h-4 mr-2" />
                Manage Organizations
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/admin/users">
                <Users className="w-4 h-4 mr-2" />
                Manage Users
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/admin/audit">
                <ScrollText className="w-4 h-4 mr-2" />
                View Audit Logs
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

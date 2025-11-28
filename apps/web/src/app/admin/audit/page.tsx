'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import {
  ScrollText,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  User,
  Building2,
  Calendar,
  Filter,
  Download,
  Clock,
  Activity
} from 'lucide-react';

/**
 * Audit log entry interface
 * @interface AuditLogEntry
 */
interface AuditLogEntry {
  _id: string;
  action: string;
  category: string;
  description: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  organization?: {
    _id: string;
    name: string;
  };
  resource_type?: string;
  resource_id?: string;
  status: 'success' | 'failure' | 'error';
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

/**
 * Platform Audit Logs Page
 * @description Admin view of all platform audit logs
 */
export default function AuditLogsPage() {
  const [logs, set_logs] = useState<AuditLogEntry[]>([]);
  const [loading, set_loading] = useState(true);
  const [error_message, set_error_message] = useState<string | null>(null);
  const [search_query, set_search_query] = useState('');
  const [category_filter, set_category_filter] = useState<string>('all');
  const [status_filter, set_status_filter] = useState<string>('all');
  const [page, set_page] = useState(1);
  const [total_pages, set_total_pages] = useState(1);
  const limit = 50;

  useEffect(() => {
    fetch_logs();
  }, [page, category_filter, status_filter]);

  /**
   * Fetch audit logs
   * @description Calls platform.getAuditLogs tRPC endpoint
   */
  const fetch_logs = async () => {
    try {
      set_loading(true);
      set_error_message(null);

      const params: Record<string, any> = {
        page,
        limit
      };

      if (category_filter !== 'all') {
        params.category = category_filter;
      }

      if (status_filter !== 'all') {
        params.status = status_filter;
      }

      const response = await fetch('/api/trpc/platform.getAuditLogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(params)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.result?.data) {
          set_logs(data.result.data.logs || []);
          set_total_pages(data.result.data.pagination?.pages || 1);
        }
      } else {
        set_error_message('Failed to load audit logs');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      set_error_message('Failed to load audit logs');
    } finally {
      set_loading(false);
    }
  };

  /**
   * Get status icon
   * @param status - Log status
   * @returns Icon component
   */
  const get_status_icon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failure':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  /**
   * Get category badge
   * @param category - Log category
   * @returns Badge component
   */
  const get_category_badge = (category: string) => {
    const colors: Record<string, string> = {
      auth: 'bg-blue-100 text-blue-800',
      user: 'bg-purple-100 text-purple-800',
      organization: 'bg-green-100 text-green-800',
      session: 'bg-yellow-100 text-yellow-800',
      summary: 'bg-orange-100 text-orange-800',
      room: 'bg-cyan-100 text-cyan-800',
      member: 'bg-pink-100 text-pink-800',
      settings: 'bg-gray-100 text-gray-800',
    };

    return (
      <Badge className={colors[category] || 'bg-gray-100 text-gray-800'}>
        {category}
      </Badge>
    );
  };

  /**
   * Format timestamp
   * @param timestamp - ISO timestamp
   * @returns Formatted date and time
   */
  const format_timestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
    };
  };

  /**
   * Export logs as CSV
   * @description Downloads filtered logs as CSV
   */
  const export_logs = () => {
    const csv_rows = [
      ['Timestamp', 'Action', 'Category', 'User', 'Organization', 'Status', 'Description'],
      ...logs.map(log => [
        new Date(log.created_at).toISOString(),
        log.action,
        log.category,
        log.user?.email || 'System',
        log.organization?.name || '-',
        log.status,
        log.description || ''
      ])
    ];

    const csv_content = csv_rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv_content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter logs by search query (client-side for already loaded logs)
  const filtered_logs = logs.filter(log => {
    if (search_query === '') return true;
    const query = search_query.toLowerCase();
    return (
      log.action.toLowerCase().includes(query) ||
      log.description?.toLowerCase().includes(query) ||
      log.user?.email.toLowerCase().includes(query) ||
      log.organization?.name?.toLowerCase().includes(query)
    );
  });

  // Stats
  const stats = {
    total: logs.length,
    success: logs.filter(l => l.status === 'success').length,
    failure: logs.filter(l => l.status === 'failure').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Audit Logs</h1>
          <p className="text-gray-500 mt-1">Platform-wide activity and security logs</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={export_logs}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetch_logs}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Logs</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{stats.success}</p>
              <p className="text-sm text-gray-500">Successful</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{stats.failure}</p>
              <p className="text-sm text-gray-500">Failed</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Error Message */}
      {error_message && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error_message}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search logs..."
                value={search_query}
                onChange={(e) => set_search_query(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              className="h-10 px-3 border rounded-md text-sm"
              value={category_filter}
              onChange={(e) => {
                set_category_filter(e.target.value);
                set_page(1);
              }}
            >
              <option value="all">All Categories</option>
              <option value="auth">Authentication</option>
              <option value="user">User</option>
              <option value="organization">Organization</option>
              <option value="session">Session</option>
              <option value="summary">Summary</option>
              <option value="room">Room</option>
              <option value="member">Member</option>
              <option value="settings">Settings</option>
            </select>
            <select
              className="h-10 px-3 border rounded-md text-sm"
              value={status_filter}
              onChange={(e) => {
                set_status_filter(e.target.value);
                set_page(1);
              }}
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
              <option value="error">Error</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="w-5 h-5" />
            Activity Log
          </CardTitle>
          <CardDescription>
            Showing {filtered_logs.length} logs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : filtered_logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ScrollText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No audit logs found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered_logs.map((log) => {
                const { date, time } = format_timestamp(log.created_at);
                return (
                  <div
                    key={log._id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="mt-1">
                      {get_status_icon(log.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{log.action}</span>
                        {get_category_badge(log.category)}
                        {log.resource_type && (
                          <Badge variant="outline">{log.resource_type}</Badge>
                        )}
                      </div>
                      {log.description && (
                        <p className="text-sm text-gray-600 mt-1">{log.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {log.user?.name || 'System'}
                          {log.user?.email && ` (${log.user.email})`}
                        </span>
                        {log.organization && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {log.organization.name}
                          </span>
                        )}
                        {log.ip_address && (
                          <span>IP: {log.ip_address}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-500 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {date}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        {time}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {total_pages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => set_page(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-500">
                Page {page} of {total_pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => set_page(p => Math.min(total_pages, p + 1))}
                disabled={page === total_pages || loading}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

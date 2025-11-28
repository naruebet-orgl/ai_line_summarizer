'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import {
  Users,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Shield,
  User,
  Mail,
  Calendar,
  Building2,
  Ban,
  Play,
  Eye,
  Crown
} from 'lucide-react';

/**
 * Platform user interface
 * @interface PlatformUser
 */
interface PlatformUser {
  _id: string;
  name: string;
  email: string;
  platform_role: 'user' | 'support' | 'super_admin';
  status: 'active' | 'inactive' | 'suspended' | 'pending_verification';
  created_at: string;
  last_login_at?: string;
  organizations?: {
    organization_id: string;
    organization_name?: string;
    role: string;
  }[];
}

/**
 * Platform Users Page
 * @description Admin view of all platform users
 */
export default function UsersPage() {
  const [users, set_users] = useState<PlatformUser[]>([]);
  const [loading, set_loading] = useState(true);
  const [processing, set_processing] = useState<string | null>(null);
  const [error_message, set_error_message] = useState<string | null>(null);
  const [success_message, set_success_message] = useState<string | null>(null);
  const [search_query, set_search_query] = useState('');
  const [status_filter, set_status_filter] = useState<string>('all');
  const [role_filter, set_role_filter] = useState<string>('all');

  useEffect(() => {
    fetch_users();
  }, []);

  /**
   * Fetch all users
   * @description Calls platform.listUsers tRPC endpoint
   */
  const fetch_users = async () => {
    try {
      set_loading(true);
      set_error_message(null);

      const response = await fetch('/api/trpc/platform.listUsers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ limit: 100 })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.result?.data?.users) {
          set_users(data.result.data.users);
        }
      } else {
        set_error_message('Failed to load users');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      set_error_message('Failed to load users');
    } finally {
      set_loading(false);
    }
  };

  /**
   * Ban a user
   * @param user_id - User ID to ban
   * @param user_name - User name for confirmation
   */
  const ban_user = async (user_id: string, user_name: string) => {
    if (!confirm(`Are you sure you want to ban "${user_name}"? They will lose access to all organizations.`)) {
      return;
    }

    try {
      set_processing(user_id);
      set_error_message(null);

      const response = await fetch('/api/trpc/platform.banUser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ user_id, reason: 'Admin action' })
      });

      const data = await response.json();

      if (response.ok && data.result?.data?.success) {
        set_success_message(`User "${user_name}" has been banned`);
        fetch_users();
      } else {
        set_error_message(data.result?.data?.error || 'Failed to ban user');
      }
    } catch (error) {
      console.error('Ban error:', error);
      set_error_message('Failed to ban user');
    } finally {
      set_processing(null);
    }
  };

  /**
   * Unban a user
   * @param user_id - User ID to unban
   * @param user_name - User name for confirmation
   */
  const unban_user = async (user_id: string, user_name: string) => {
    try {
      set_processing(user_id);
      set_error_message(null);

      const response = await fetch('/api/trpc/platform.unbanUser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ user_id })
      });

      const data = await response.json();

      if (response.ok && data.result?.data?.success) {
        set_success_message(`User "${user_name}" has been unbanned`);
        fetch_users();
      } else {
        set_error_message(data.result?.data?.error || 'Failed to unban user');
      }
    } catch (error) {
      console.error('Unban error:', error);
      set_error_message('Failed to unban user');
    } finally {
      set_processing(null);
    }
  };

  /**
   * Get status badge
   * @param status - User status
   * @returns Badge component
   */
  const get_status_badge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'suspended':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Suspended</Badge>;
      case 'pending_verification':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  /**
   * Get platform role badge
   * @param role - Platform role
   * @returns Badge component
   */
  const get_role_badge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Badge className="bg-red-100 text-red-800"><Shield className="w-3 h-3 mr-1" />Super Admin</Badge>;
      case 'support':
        return <Badge className="bg-blue-100 text-blue-800"><User className="w-3 h-3 mr-1" />Support</Badge>;
      default:
        return <Badge variant="outline"><User className="w-3 h-3 mr-1" />User</Badge>;
    }
  };

  // Filter users
  const filtered_users = users.filter(user => {
    const matches_search = search_query === '' ||
      user.name.toLowerCase().includes(search_query.toLowerCase()) ||
      user.email.toLowerCase().includes(search_query.toLowerCase());

    const matches_status = status_filter === 'all' || user.status === status_filter;
    const matches_role = role_filter === 'all' || user.platform_role === role_filter;

    return matches_search && matches_status && matches_role;
  });

  // Stats
  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    suspended: users.filter(u => u.status === 'suspended').length,
    admins: users.filter(u => u.platform_role === 'super_admin').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Platform Users</h1>
          <p className="text-gray-500 mt-1">Manage all users across the platform</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetch_users}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Users</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{stats.admins}</p>
              <p className="text-sm text-gray-500">Super Admins</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{stats.suspended}</p>
              <p className="text-sm text-gray-500">Suspended</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Messages */}
      {success_message && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">{success_message}</AlertDescription>
        </Alert>
      )}

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
                placeholder="Search by name or email..."
                value={search_query}
                onChange={(e) => set_search_query(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              className="h-10 px-3 border rounded-md text-sm"
              value={status_filter}
              onChange={(e) => set_status_filter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending_verification">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              className="h-10 px-3 border rounded-md text-sm"
              value={role_filter}
              onChange={(e) => set_role_filter(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="support">Support</option>
              <option value="user">User</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Users ({filtered_users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : filtered_users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No users found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered_users.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-xl font-semibold text-gray-600">
                        {user.name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{user.name}</h4>
                        {get_status_badge(user.status)}
                        {get_role_badge(user.platform_role)}
                      </div>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </p>
                      {user.organizations && user.organizations.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {user.organizations.length} organization{user.organizations.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 mr-2">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>

                    <Link href={`/admin/users/${user._id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>

                    {user.platform_role !== 'super_admin' && (
                      <>
                        {user.status === 'active' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => ban_user(user._id, user.name)}
                            disabled={processing === user._id}
                          >
                            {processing === user._id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Ban className="w-4 h-4" />
                            )}
                          </Button>
                        ) : user.status === 'suspended' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => unban_user(user._id, user.name)}
                            disabled={processing === user._id}
                          >
                            {processing === user._id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                        ) : null}
                      </>
                    )}
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

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import {
  Building2,
  Users,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  MoreVertical,
  Eye,
  Ban,
  Play,
  Trash2,
  Calendar,
  Crown,
  ExternalLink
} from 'lucide-react';

/**
 * Organization interface for admin view
 * @interface Organization
 */
interface Organization {
  _id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'trial' | 'cancelled';
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  owner?: {
    name: string;
    email: string;
  };
  member_count: number;
  created_at: string;
  usage?: {
    current_groups: number;
    messages_this_month: number;
  };
}

/**
 * Organizations List Page
 * @description Platform admin view of all organizations
 */
export default function OrganizationsPage() {
  const [organizations, set_organizations] = useState<Organization[]>([]);
  const [loading, set_loading] = useState(true);
  const [processing, set_processing] = useState<string | null>(null);
  const [error_message, set_error_message] = useState<string | null>(null);
  const [success_message, set_success_message] = useState<string | null>(null);
  const [search_query, set_search_query] = useState('');
  const [status_filter, set_status_filter] = useState<string>('all');

  useEffect(() => {
    fetch_organizations();
  }, []);

  /**
   * Fetch all organizations
   * @description Calls platform.listOrganizations tRPC endpoint
   */
  const fetch_organizations = async () => {
    try {
      set_loading(true);
      set_error_message(null);

      const response = await fetch('/api/trpc/platform.listOrganizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ limit: 100 })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.result?.data?.organizations) {
          set_organizations(data.result.data.organizations);
        }
      } else {
        set_error_message('Failed to load organizations');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      set_error_message('Failed to load organizations');
    } finally {
      set_loading(false);
    }
  };

  /**
   * Suspend an organization
   * @param org_id - Organization ID to suspend
   * @param org_name - Organization name for confirmation
   */
  const suspend_organization = async (org_id: string, org_name: string) => {
    if (!confirm(`Are you sure you want to suspend "${org_name}"? This will disable access for all members.`)) {
      return;
    }

    try {
      set_processing(org_id);
      set_error_message(null);

      const response = await fetch('/api/trpc/platform.suspendOrganization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ organization_id: org_id, reason: 'Admin action' })
      });

      const data = await response.json();

      if (response.ok && data.result?.data?.success) {
        set_success_message(`Organization "${org_name}" has been suspended`);
        fetch_organizations();
      } else {
        set_error_message(data.result?.data?.error || 'Failed to suspend organization');
      }
    } catch (error) {
      console.error('Suspend error:', error);
      set_error_message('Failed to suspend organization');
    } finally {
      set_processing(null);
    }
  };

  /**
   * Activate an organization
   * @param org_id - Organization ID to activate
   * @param org_name - Organization name for confirmation
   */
  const activate_organization = async (org_id: string, org_name: string) => {
    try {
      set_processing(org_id);
      set_error_message(null);

      const response = await fetch('/api/trpc/platform.activateOrganization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ organization_id: org_id })
      });

      const data = await response.json();

      if (response.ok && data.result?.data?.success) {
        set_success_message(`Organization "${org_name}" has been activated`);
        fetch_organizations();
      } else {
        set_error_message(data.result?.data?.error || 'Failed to activate organization');
      }
    } catch (error) {
      console.error('Activate error:', error);
      set_error_message('Failed to activate organization');
    } finally {
      set_processing(null);
    }
  };

  /**
   * Get status badge variant
   * @param status - Organization status
   * @returns Badge variant string
   */
  const get_status_badge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'suspended':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Suspended</Badge>;
      case 'trial':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertCircle className="w-3 h-3 mr-1" />Trial</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-800">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  /**
   * Get plan badge
   * @param plan - Organization plan
   * @returns Badge component
   */
  const get_plan_badge = (plan: string) => {
    switch (plan) {
      case 'enterprise':
        return <Badge className="bg-purple-100 text-purple-800"><Crown className="w-3 h-3 mr-1" />Enterprise</Badge>;
      case 'professional':
        return <Badge className="bg-blue-100 text-blue-800">Professional</Badge>;
      case 'starter':
        return <Badge className="bg-cyan-100 text-cyan-800">Starter</Badge>;
      case 'free':
      default:
        return <Badge variant="outline">Free</Badge>;
    }
  };

  // Filter organizations
  const filtered_organizations = organizations.filter(org => {
    const matches_search = search_query === '' ||
      org.name.toLowerCase().includes(search_query.toLowerCase()) ||
      org.slug.toLowerCase().includes(search_query.toLowerCase()) ||
      org.owner?.email.toLowerCase().includes(search_query.toLowerCase());

    const matches_status = status_filter === 'all' || org.status === status_filter;

    return matches_search && matches_status;
  });

  // Stats
  const stats = {
    total: organizations.length,
    active: organizations.filter(o => o.status === 'active').length,
    suspended: organizations.filter(o => o.status === 'suspended').length,
    trial: organizations.filter(o => o.status === 'trial').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Organizations</h1>
          <p className="text-gray-500 mt-1">Manage all organizations on the platform</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetch_organizations}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-gray-500">Total</p>
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
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold">{stats.trial}</p>
              <p className="text-sm text-gray-500">Trial</p>
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
                placeholder="Search by name, slug, or owner email..."
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
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Organizations List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Organizations ({filtered_organizations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : filtered_organizations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No organizations found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered_organizations.map((org) => (
                <div
                  key={org._id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-gray-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{org.name}</h4>
                        {get_status_badge(org.status)}
                        {get_plan_badge(org.plan)}
                      </div>
                      <p className="text-sm text-gray-500">
                        {org.slug} • {org.member_count || 0} members
                      </p>
                      {org.owner && (
                        <p className="text-xs text-gray-400 mt-1">
                          Owner: {org.owner.name} ({org.owner.email})
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 mr-2">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {new Date(org.created_at).toLocaleDateString()}
                    </span>

                    <Link href={`/admin/organizations/${org._id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>

                    {org.status === 'active' || org.status === 'trial' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => suspend_organization(org._id, org.name)}
                        disabled={processing === org._id}
                      >
                        {processing === org._id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Ban className="w-4 h-4" />
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => activate_organization(org._id, org.name)}
                        disabled={processing === org._id}
                      >
                        {processing === org._id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
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

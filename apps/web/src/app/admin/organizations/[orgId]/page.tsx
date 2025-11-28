'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Building2,
  Users,
  ArrowLeft,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Crown,
  Shield,
  User,
  Eye,
  Calendar,
  Mail,
  MessageSquare,
  FileText,
  Settings,
  Ban,
  Play,
  Edit
} from 'lucide-react';

/**
 * Organization detail interface
 * @interface OrganizationDetail
 */
interface OrganizationDetail {
  _id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'trial' | 'cancelled';
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  created_at: string;
  updated_at?: string;
  limits?: {
    max_users: number;
    max_line_accounts: number;
    max_groups: number;
    max_messages_per_month: number;
  };
  usage?: {
    current_users: number;
    current_line_accounts: number;
    current_groups: number;
    messages_this_month: number;
  };
  members?: Member[];
  stats?: {
    total_sessions: number;
    total_summaries: number;
    total_messages: number;
  };
}

/**
 * Member interface
 * @interface Member
 */
interface Member {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  role: 'org_owner' | 'org_admin' | 'org_member' | 'org_viewer';
  status: 'active' | 'pending' | 'suspended';
  joined_at: string;
}

/**
 * Organization Detail Page
 * @description Admin view of a single organization
 */
export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const org_id = params.orgId as string;

  const [organization, set_organization] = useState<OrganizationDetail | null>(null);
  const [loading, set_loading] = useState(true);
  const [processing, set_processing] = useState(false);
  const [error_message, set_error_message] = useState<string | null>(null);
  const [success_message, set_success_message] = useState<string | null>(null);
  const [editing_plan, set_editing_plan] = useState(false);
  const [new_plan, set_new_plan] = useState('');

  useEffect(() => {
    if (org_id) {
      fetch_organization();
    }
  }, [org_id]);

  /**
   * Fetch organization details
   * @description Calls platform.getOrganization tRPC endpoint
   */
  const fetch_organization = async () => {
    try {
      set_loading(true);
      set_error_message(null);

      const response = await fetch('/api/trpc/platform.getOrganization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ organization_id: org_id })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.result?.data?.organization) {
          set_organization(data.result.data.organization);
          set_new_plan(data.result.data.organization.plan);
        }
      } else {
        set_error_message('Failed to load organization');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      set_error_message('Failed to load organization');
    } finally {
      set_loading(false);
    }
  };

  /**
   * Update organization plan
   * @description Calls platform.updateOrganizationPlan endpoint
   */
  const update_plan = async () => {
    if (!new_plan || new_plan === organization?.plan) {
      set_editing_plan(false);
      return;
    }

    try {
      set_processing(true);
      set_error_message(null);

      const response = await fetch('/api/trpc/platform.updateOrganizationPlan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          organization_id: org_id,
          plan: new_plan
        })
      });

      const data = await response.json();

      if (response.ok && data.result?.data?.success) {
        set_success_message('Plan updated successfully');
        set_editing_plan(false);
        fetch_organization();
      } else {
        set_error_message(data.result?.data?.error || 'Failed to update plan');
      }
    } catch (error) {
      console.error('Update error:', error);
      set_error_message('Failed to update plan');
    } finally {
      set_processing(false);
    }
  };

  /**
   * Suspend or activate organization
   * @param action - 'suspend' or 'activate'
   */
  const toggle_status = async (action: 'suspend' | 'activate') => {
    const confirm_message = action === 'suspend'
      ? `Are you sure you want to suspend "${organization?.name}"?`
      : `Are you sure you want to activate "${organization?.name}"?`;

    if (!confirm(confirm_message)) return;

    try {
      set_processing(true);
      set_error_message(null);

      const endpoint = action === 'suspend'
        ? '/api/trpc/platform.suspendOrganization'
        : '/api/trpc/platform.activateOrganization';

      const body = action === 'suspend'
        ? { organization_id: org_id, reason: 'Admin action' }
        : { organization_id: org_id };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (response.ok && data.result?.data?.success) {
        set_success_message(`Organization ${action}d successfully`);
        fetch_organization();
      } else {
        set_error_message(data.result?.data?.error || `Failed to ${action} organization`);
      }
    } catch (error) {
      console.error('Toggle status error:', error);
      set_error_message(`Failed to ${action} organization`);
    } finally {
      set_processing(false);
    }
  };

  /**
   * Get role icon
   * @param role - Member role
   * @returns Icon component
   */
  const get_role_icon = (role: string) => {
    switch (role) {
      case 'org_owner':
        return <Crown className="w-4 h-4 text-yellow-600" />;
      case 'org_admin':
        return <Shield className="w-4 h-4 text-blue-600" />;
      case 'org_member':
        return <User className="w-4 h-4 text-gray-600" />;
      case 'org_viewer':
        return <Eye className="w-4 h-4 text-gray-400" />;
      default:
        return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  /**
   * Get status badge
   * @param status - Organization status
   * @returns Badge component
   */
  const get_status_badge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'suspended':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Suspended</Badge>;
      case 'trial':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertCircle className="w-3 h-3 mr-1" />Trial</Badge>;
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
      default:
        return <Badge variant="outline">Free</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-500">Organization not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/admin/organizations')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Organizations
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/organizations">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-900">{organization.name}</h1>
              {get_status_badge(organization.status)}
              {get_plan_badge(organization.plan)}
            </div>
            <p className="text-gray-500 mt-1">{organization.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetch_organization}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {organization.status === 'active' || organization.status === 'trial' ? (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => toggle_status('suspend')}
              disabled={processing}
            >
              <Ban className="w-4 h-4 mr-2" />
              Suspend
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="text-green-600 border-green-200 hover:bg-green-50"
              onClick={() => toggle_status('activate')}
              disabled={processing}
            >
              <Play className="w-4 h-4 mr-2" />
              Activate
            </Button>
          )}
        </div>
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

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{organization.usage?.current_users || 0}</p>
              <p className="text-sm text-gray-500">Members</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">{organization.stats?.total_sessions || 0}</p>
              <p className="text-sm text-gray-500">Sessions</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{organization.stats?.total_summaries || 0}</p>
              <p className="text-sm text-gray-500">Summaries</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{organization.usage?.current_groups || 0}</p>
              <p className="text-sm text-gray-500">Groups</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Organization Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Organization Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-500">Slug</span>
              <span className="font-medium">{organization.slug}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-500">Status</span>
              {get_status_badge(organization.status)}
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-500">Plan</span>
              {editing_plan ? (
                <div className="flex items-center gap-2">
                  <select
                    className="h-8 px-2 border rounded text-sm"
                    value={new_plan}
                    onChange={(e) => set_new_plan(e.target.value)}
                  >
                    <option value="free">Free</option>
                    <option value="starter">Starter</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                  <Button size="sm" onClick={update_plan} disabled={processing}>
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => set_editing_plan(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {get_plan_badge(organization.plan)}
                  <Button size="sm" variant="ghost" onClick={() => set_editing_plan(true)}>
                    <Edit className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-500">Created</span>
              <span className="font-medium">
                <Calendar className="w-4 h-4 inline mr-1" />
                {new Date(organization.created_at).toLocaleDateString()}
              </span>
            </div>
            {organization.updated_at && (
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-500">Last Updated</span>
                <span className="font-medium">
                  {new Date(organization.updated_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage & Limits */}
        <Card>
          <CardHeader>
            <CardTitle>Usage & Limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Users</span>
                <span>
                  {organization.usage?.current_users || 0} / {organization.limits?.max_users || '∞'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{
                    width: `${Math.min(
                      ((organization.usage?.current_users || 0) / (organization.limits?.max_users || 1)) * 100,
                      100
                    )}%`
                  }}
                ></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Groups</span>
                <span>
                  {organization.usage?.current_groups || 0} / {organization.limits?.max_groups || '∞'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{
                    width: `${Math.min(
                      ((organization.usage?.current_groups || 0) / (organization.limits?.max_groups || 1)) * 100,
                      100
                    )}%`
                  }}
                ></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Messages (this month)</span>
                <span>
                  {organization.usage?.messages_this_month || 0} / {organization.limits?.max_messages_per_month || '∞'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full"
                  style={{
                    width: `${Math.min(
                      ((organization.usage?.messages_this_month || 0) / (organization.limits?.max_messages_per_month || 1)) * 100,
                      100
                    )}%`
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Members ({organization.members?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!organization.members || organization.members.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No members found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {organization.members.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-lg font-semibold text-gray-600">
                        {member.user?.name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{member.user?.name || 'Unknown'}</h4>
                        {get_role_icon(member.role)}
                      </div>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {member.user?.email || 'No email'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {member.role.replace('org_', '')}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      Joined {new Date(member.joined_at).toLocaleDateString()}
                    </span>
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

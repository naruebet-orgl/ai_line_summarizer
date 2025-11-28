'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Building2,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Calendar,
  Users,
  MessageSquare,
  FileText,
  Crown,
  Edit3,
  X,
  Copy,
  Check,
  RefreshCw,
  QrCode,
  Ticket,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface OrganizationProfile {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'trial';
  settings: {
    max_members: number;
    max_rooms: number;
    ai_summaries_enabled: boolean;
    custom_branding: boolean;
  };
  owner: {
    _id: string;
    name: string;
    email: string;
  };
  member_count: number;
  room_count: number;
  created_at: string;
  trial_ends_at?: string;
}


/**
 * Organization Profile Page
 * @description Settings page for viewing and editing organization profile with both codes
 */
export default function OrganizationProfilePage() {
  const { user, organization, is_org_admin } = useAuth();
  const [profile, set_profile] = useState<OrganizationProfile | null>(null);
  const [loading, set_loading] = useState(true);
  const [saving, set_saving] = useState(false);
  const [error_message, set_error_message] = useState<string | null>(null);
  const [success_message, set_success_message] = useState<string | null>(null);
  const [is_editing, set_is_editing] = useState(false);

  // Editable fields
  const [edit_name, set_edit_name] = useState('');
  const [edit_description, set_edit_description] = useState('');

  // Codes state
  const [bot_activation_code, set_bot_activation_code] = useState<string | null>(null);
  const [member_invite_code, set_member_invite_code] = useState<string | null>(null);
  const [copied_bot, set_copied_bot] = useState(false);
  const [copied_invite, set_copied_invite] = useState(false);
  const [regenerating_bot, set_regenerating_bot] = useState(false);
  const [regenerating_invite, set_regenerating_invite] = useState(false);

  useEffect(() => {
    if (organization?.id) {
      fetch_organization_profile();
      fetch_bot_activation_code();
      fetch_member_invite_code();
    }
  }, [organization?.id]);

  /**
   * Fetch organization profile
   */
  const fetch_organization_profile = async () => {
    if (!organization?.id) {
      set_loading(false);
      return;
    }

    try {
      set_loading(true);
      set_error_message(null);

      const response = await fetch(`/api/organizations/${organization.id}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.organization) {
          const org = data.organization;
          set_profile({
            _id: org._id || org.id,
            name: org.name,
            slug: org.slug,
            description: org.description,
            plan: org.plan || 'free',
            status: org.status || 'active',
            settings: {
              max_members: org.limits?.max_members || 10,
              max_rooms: org.limits?.max_rooms || 20,
              ai_summaries_enabled: org.limits?.ai_summaries_enabled ?? true,
              custom_branding: org.limits?.custom_branding ?? false
            },
            owner: org.owner || { _id: '', name: 'Unknown', email: '' },
            member_count: org.member_count || 0,
            room_count: org.room_count || 0,
            created_at: org.created_at,
            trial_ends_at: org.trial_ends_at
          });
          set_edit_name(org.name || '');
          set_edit_description(org.description || '');
        }
      } else {
        set_error_message('Failed to load organization profile');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      set_error_message('Failed to load organization profile');
    } finally {
      set_loading(false);
    }
  };

  /**
   * Fetch bot activation code
   */
  const fetch_bot_activation_code = async () => {
    if (!organization?.id) return;

    try {
      const response = await fetch(`/api/organizations/${organization.id}/activation-code`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          set_bot_activation_code(data.activation_code);
        }
      }
    } catch (error) {
      console.error('Error fetching activation code:', error);
    }
  };

  /**
   * Fetch member invite code
   */
  const fetch_member_invite_code = async () => {
    if (!organization?.id) return;

    try {
      const response = await fetch(`/api/organizations/${organization.id}/member-invite-code`, {
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        set_member_invite_code(data.member_invite_code);
      } else if (data.error_code === 'DATABASE_QUOTA_EXCEEDED') {
        set_error_message('Database storage full. Please contact support to generate invite code.');
      }
    } catch (error) {
      console.error('Error fetching member invite code:', error);
    }
  };

  /**
   * Regenerate member invite code
   */
  const regenerate_invite_code = async () => {
    if (!organization?.id) return;

    try {
      set_regenerating_invite(true);
      const response = await fetch(`/api/organizations/${organization.id}/member-invite-code/regenerate`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          set_member_invite_code(data.member_invite_code);
          set_success_message('Member invite code regenerated successfully');
          setTimeout(() => set_success_message(null), 3000);
        }
      }
    } catch (error) {
      console.error('Error regenerating invite code:', error);
    } finally {
      set_regenerating_invite(false);
    }
  };

  /**
   * Regenerate bot activation code
   */
  const regenerate_bot_code = async () => {
    if (!organization?.id) return;

    try {
      set_regenerating_bot(true);
      const response = await fetch(`/api/organizations/${organization.id}/activation-code`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          set_bot_activation_code(data.activation_code);
        }
      }
    } catch (error) {
      console.error('Error regenerating code:', error);
    } finally {
      set_regenerating_bot(false);
    }
  };

  /**
   * Copy to clipboard
   */
  const copy_to_clipboard = async (text: string, type: 'bot' | 'invite') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'bot') {
        set_copied_bot(true);
        setTimeout(() => set_copied_bot(false), 2000);
      } else {
        set_copied_invite(true);
        setTimeout(() => set_copied_invite(false), 2000);
      }
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  /**
   * Save organization profile changes
   */
  const save_profile = async () => {
    if (!organization?.id) return;

    try {
      set_saving(true);
      set_error_message(null);
      set_success_message(null);

      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: edit_name.trim(),
          description: edit_description.trim()
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          if (profile) {
            set_profile({
              ...profile,
              name: edit_name.trim(),
              description: edit_description.trim()
            });
          }
          set_is_editing(false);
          set_success_message('Organization profile updated successfully');
          setTimeout(() => set_success_message(null), 3000);
        }
      } else {
        const error_data = await response.json().catch(() => ({}));
        set_error_message(error_data.error || 'Failed to save changes');
      }
    } catch (error) {
      console.error('Save error:', error);
      set_error_message('Failed to save changes');
    } finally {
      set_saving(false);
    }
  };

  const cancel_editing = () => {
    set_edit_name(profile?.name || '');
    set_edit_description(profile?.description || '');
    set_is_editing(false);
  };

  const get_plan_badge = (plan: string) => {
    const colors: Record<string, string> = {
      free: 'bg-gray-100 text-gray-800',
      starter: 'bg-blue-100 text-blue-800',
      professional: 'bg-purple-100 text-purple-800',
      enterprise: 'bg-amber-100 text-amber-800'
    };
    return colors[plan] || colors.free;
  };

  const get_status_badge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800',
      trial: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || colors.active;
  };

  const format_date = (date_string: string) => {
    return new Date(date_string).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const can_edit = () => {
    if (!user || !profile) return false;
    return profile.owner?._id === user.id || is_org_admin();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error_message || 'No organization found. Please join or create an organization.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Organization Profile</h1>
          <p className="text-gray-500 mt-1">Manage your organization settings and codes</p>
        </div>
        {can_edit() && !is_editing && (
          <Button variant="outline" onClick={() => set_is_editing(true)}>
            <Edit3 className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>

      {/* Success/Error Messages */}
      {success_message && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success_message}</AlertDescription>
        </Alert>
      )}
      {error_message && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error_message}</AlertDescription>
        </Alert>
      )}

      {/* Quick Setup Codes Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Bot Activation Code */}
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-base text-gray-900">
              <QrCode className="w-5 h-5 mr-2 text-green-600" />
              Bot Activation Code
            </CardTitle>
            <CardDescription>
              Paste in LINE group to connect it to your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <code className="text-xl font-mono font-bold text-gray-900 tracking-wider">
                  {bot_activation_code || '---'}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => bot_activation_code && copy_to_clipboard(bot_activation_code, 'bot')}
                  disabled={!bot_activation_code}
                  className="border-gray-300"
                >
                  {copied_bot ? (
                    <><Check className="w-4 h-4 mr-1 text-green-600" /> Copied</>
                  ) : (
                    <><Copy className="w-4 h-4 mr-1 text-gray-500" /> Copy</>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Member Invite Code */}
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-base text-gray-900">
              <Ticket className="w-5 h-5 mr-2 text-purple-600" />
              Member Invite Code
            </CardTitle>
            <CardDescription>
              Share with team members - they'll need owner approval to join
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <code className="text-xl font-mono font-bold text-gray-900 tracking-wider">
                  {member_invite_code || '---'}
                </code>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => member_invite_code && copy_to_clipboard(member_invite_code, 'invite')}
                    disabled={!member_invite_code}
                    className="border-gray-300"
                  >
                    {copied_invite ? (
                      <><Check className="w-4 h-4 mr-1 text-green-600" /> Copied</>
                    ) : (
                      <><Copy className="w-4 h-4 mr-1 text-gray-500" /> Copy</>
                    )}
                  </Button>
                  {can_edit() && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={regenerate_invite_code}
                      disabled={regenerating_invite}
                      className="border-gray-300"
                      title="Regenerate code"
                    >
                      <RefreshCw className={`w-4 h-4 ${regenerating_invite ? 'animate-spin' : ''}`} />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Members who use this code will appear in Join Requests for approval
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Organization Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <CardTitle>{profile.name}</CardTitle>
                <CardDescription>/{profile.slug}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={get_status_badge(profile.status)}>{profile.status}</Badge>
              <Badge className={get_plan_badge(profile.plan)}>
                <Crown className="w-3 h-3 mr-1" />
                {profile.plan}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {is_editing ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  value={edit_name}
                  onChange={(e) => set_edit_name(e.target.value)}
                  placeholder="Enter organization name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="org-description">Description</Label>
                <textarea
                  id="org-description"
                  value={edit_description}
                  onChange={(e) => set_edit_description(e.target.value)}
                  placeholder="Enter organization description"
                  className="mt-1 w-full h-24 px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button onClick={save_profile} disabled={saving || !edit_name.trim()}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
                <Button variant="outline" onClick={cancel_editing} disabled={saving}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {profile.description && <p className="text-gray-600">{profile.description}</p>}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>Created {format_date(profile.created_at)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{profile.member_count}</p>
                <p className="text-sm text-gray-500">Members (max: {profile.settings.max_members})</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{profile.room_count}</p>
                <p className="text-sm text-gray-500">Rooms (max: {profile.settings.max_rooms})</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {profile.settings.ai_summaries_enabled ? 'Enabled' : 'Disabled'}
                </p>
                <p className="text-sm text-gray-500">AI Summaries</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Owner Info */}
      {profile.owner && profile.owner.name && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Organization Owner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">
                  {profile.owner.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium">{profile.owner.name}</p>
                <p className="text-sm text-gray-500">{profile.owner.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Features */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Plan Features</CardTitle>
          <CardDescription>
            Current plan: <span className="capitalize font-medium">{profile.plan}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Up to {profile.settings.max_members} team members</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Up to {profile.settings.max_rooms} LINE rooms</span>
            </div>
            <div className="flex items-center gap-2">
              {profile.settings.ai_summaries_enabled ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <X className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-sm">AI-powered summaries</span>
            </div>
            <div className="flex items-center gap-2">
              {profile.settings.custom_branding ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <X className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-sm">Custom branding</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

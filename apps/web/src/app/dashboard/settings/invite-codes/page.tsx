'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/auth';
import {
  Ticket, Plus, Copy, Trash2, CheckCircle, AlertCircle, Loader2,
  Clock, Users, RefreshCw
} from 'lucide-react';

interface InviteCode {
  id: string;
  code: string;
  name?: string;
  default_role: string;
  status: 'active' | 'disabled' | 'expired';
  auto_approve: boolean;
  usage: {
    max_uses: number | null;
    current_uses: number;
    remaining: number | null;
  };
  expires_at: string | null;
  is_expired: boolean;
  created_by?: {
    name: string;
    email: string;
  };
  created_at: string;
}

export default function InviteCodesPage() {
  const { organization } = useAuth();
  const [invite_codes, set_invite_codes] = useState<InviteCode[]>([]);
  const [loading, set_loading] = useState(true);
  const [creating, set_creating] = useState(false);
  const [show_create_form, set_show_create_form] = useState(false);
  const [error_message, set_error_message] = useState<string | null>(null);
  const [success_message, set_success_message] = useState<string | null>(null);
  const [copied_code, set_copied_code] = useState<string | null>(null);

  // Create form state
  const [form_name, set_form_name] = useState('');
  const [form_role, set_form_role] = useState('org_member');
  const [form_max_uses, set_form_max_uses] = useState('');
  const [form_expires_days, set_form_expires_days] = useState('');
  const [form_auto_approve, set_form_auto_approve] = useState(false);

  useEffect(() => {
    if (organization?.id) {
      fetch_invite_codes();
    }
  }, [organization?.id]);

  const fetch_invite_codes = async () => {
    if (!organization?.id) return;

    try {
      set_loading(true);
      const response = await fetch(`/api/organizations/${organization.id}/invite-codes`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        set_invite_codes(data.invite_codes || []);
      } else {
        const data = await response.json();
        set_error_message(data.error || 'Failed to load invite codes');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      set_error_message('Failed to load invite codes');
    } finally {
      set_loading(false);
    }
  };

  const create_invite_code = async () => {
    if (!organization?.id) return;

    try {
      set_creating(true);
      set_error_message(null);

      const response = await fetch(`/api/organizations/${organization.id}/invite-codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form_name.trim() || undefined,
          default_role: form_role,
          max_uses: form_max_uses ? parseInt(form_max_uses) : null,
          expires_in_days: form_expires_days ? parseInt(form_expires_days) : null,
          auto_approve: form_auto_approve
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        set_success_message(`Invite code created: ${data.invite_code.code}`);
        reset_form();
        fetch_invite_codes();
      } else {
        set_error_message(data.error || 'Failed to create invite code');
      }
    } catch (error) {
      console.error('Create error:', error);
      set_error_message('Failed to create invite code');
    } finally {
      set_creating(false);
    }
  };

  const disable_invite_code = async (code_id: string) => {
    if (!organization?.id) return;
    if (!confirm('Are you sure you want to disable this invite code?')) return;

    try {
      const response = await fetch(`/api/organizations/${organization.id}/invite-codes/${code_id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        set_success_message('Invite code disabled');
        fetch_invite_codes();
      } else {
        const data = await response.json();
        set_error_message(data.error || 'Failed to disable invite code');
      }
    } catch (error) {
      console.error('Disable error:', error);
      set_error_message('Failed to disable invite code');
    }
  };

  const copy_code = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      set_copied_code(code);
      setTimeout(() => set_copied_code(null), 2000);
    } catch (error) {
      console.error('Copy error:', error);
    }
  };

  const reset_form = () => {
    set_form_name('');
    set_form_role('org_member');
    set_form_max_uses('');
    set_form_expires_days('');
    set_form_auto_approve(false);
    set_show_create_form(false);
  };

  const get_status_badge = (code: InviteCode) => {
    if (code.status === 'disabled') {
      return <Badge variant="outline" className="bg-gray-50 text-gray-600">Disabled</Badge>;
    }
    if (code.is_expired || code.status === 'expired') {
      return <Badge variant="outline" className="bg-red-50 text-red-600">Expired</Badge>;
    }
    if (code.usage.max_uses !== null && code.usage.remaining === 0) {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-600">Exhausted</Badge>;
    }
    return <Badge variant="outline" className="bg-green-50 text-green-600">Active</Badge>;
  };

  const get_role_display = (role: string) => {
    switch (role) {
      case 'org_admin': return 'Admin';
      case 'org_member': return 'Member';
      case 'org_viewer': return 'Viewer';
      default: return role;
    }
  };

  if (!organization) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Invite Codes</h1>
          <p className="text-gray-500 mt-1">Generate codes to invite people to join your organization</p>
        </div>
        <Button onClick={() => set_show_create_form(!show_create_form)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Code
        </Button>
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

      {/* Create Form */}
      {show_create_form && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Invite Code</CardTitle>
            <CardDescription>Configure the invite code settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Code Name (optional)</Label>
                <Input
                  id="name"
                  placeholder="e.g., Marketing Team"
                  value={form_name}
                  onChange={(e) => set_form_name(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="role">Default Role</Label>
                <select
                  id="role"
                  className="w-full h-10 px-3 border rounded-md"
                  value={form_role}
                  onChange={(e) => set_form_role(e.target.value)}
                >
                  <option value="org_member">Member</option>
                  <option value="org_admin">Admin</option>
                  <option value="org_viewer">Viewer (Read-only)</option>
                </select>
              </div>
              <div>
                <Label htmlFor="max_uses">Max Uses (leave empty for unlimited)</Label>
                <Input
                  id="max_uses"
                  type="number"
                  placeholder="e.g., 10"
                  min="1"
                  value={form_max_uses}
                  onChange={(e) => set_form_max_uses(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="expires">Expires In (days, leave empty for never)</Label>
                <Input
                  id="expires"
                  type="number"
                  placeholder="e.g., 30"
                  min="1"
                  value={form_expires_days}
                  onChange={(e) => set_form_expires_days(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="auto_approve"
                checked={form_auto_approve}
                onChange={(e) => set_form_auto_approve(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="auto_approve" className="font-normal">
                Auto-approve (users join instantly without admin approval)
              </Label>
            </div>
            <div className="flex gap-3">
              <Button onClick={create_invite_code} disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Invite Code'
                )}
              </Button>
              <Button variant="outline" onClick={reset_form}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Codes List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5" />
              Active Invite Codes
            </CardTitle>
            <CardDescription>
              {invite_codes.length} invite code{invite_codes.length !== 1 ? 's' : ''} total
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={fetch_invite_codes}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : invite_codes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Ticket className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No invite codes yet</p>
              <p className="text-sm">Create your first invite code to start inviting people</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invite_codes.map((code) => (
                <div
                  key={code.id}
                  className={`p-4 border rounded-lg ${code.status !== 'active' || code.is_expired ? 'bg-gray-50 opacity-75' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <code className="text-lg font-mono font-bold tracking-wider bg-gray-100 px-3 py-1 rounded">
                          {code.code}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copy_code(code.code)}
                          className="h-8"
                        >
                          {copied_code === code.code ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        {get_status_badge(code)}
                        {code.auto_approve && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-600">
                            Auto-approve
                          </Badge>
                        )}
                      </div>
                      {code.name && (
                        <p className="text-sm font-medium text-gray-700 mt-2">{code.name}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Role: {get_role_display(code.default_role)}
                        </span>
                        <span className="flex items-center gap-1">
                          Uses: {code.usage.current_uses}
                          {code.usage.max_uses !== null && ` / ${code.usage.max_uses}`}
                        </span>
                        {code.expires_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Expires: {new Date(code.expires_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {code.status === 'active' && !code.is_expired && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => disable_invite_code(code.id)}
                      >
                        <Trash2 className="w-4 h-4" />
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

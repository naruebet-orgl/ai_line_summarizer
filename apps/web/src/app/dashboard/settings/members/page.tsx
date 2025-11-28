'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/auth';
import {
  Users, Crown, Shield, User, Eye, CheckCircle, AlertCircle, Loader2,
  RefreshCw, Mail, Calendar, MoreVertical, UserMinus, Info
} from 'lucide-react';

/**
 * Role Permissions Tooltip Component
 * Uses portal to render outside overflow containers
 */
function RolePermissionsTooltip() {
  const [show_tooltip, set_show_tooltip] = useState(false);
  const [position, set_position] = useState({ top: 0, left: 0 });
  const button_ref = useRef<HTMLButtonElement>(null);

  const handle_mouse_enter = () => {
    if (button_ref.current) {
      const rect = button_ref.current.getBoundingClientRect();
      set_position({
        top: rect.bottom + 8,
        left: rect.left
      });
      set_show_tooltip(true);
    }
  };

  const handle_mouse_leave = () => {
    set_show_tooltip(false);
  };

  return (
    <>
      <button
        ref={button_ref}
        className="text-gray-400 hover:text-gray-600 transition-colors p-1"
        type="button"
        onMouseEnter={handle_mouse_enter}
        onMouseLeave={handle_mouse_leave}
      >
        <Info className="w-5 h-5" />
      </button>

      {show_tooltip && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed z-[99999] animate-in fade-in duration-150"
          style={{ top: position.top, left: position.left }}
          onMouseEnter={() => set_show_tooltip(true)}
          onMouseLeave={() => set_show_tooltip(false)}
        >
          <div className="bg-gray-900 text-white text-sm rounded-lg shadow-xl p-3 w-64">
            <p className="font-semibold mb-2">Role Permissions</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Crown className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                <span><strong>Owner:</strong> Full access, billing</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <span><strong>Admin:</strong> Manage members</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                <span><strong>Member:</strong> View & interact</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span><strong>Viewer:</strong> Read-only</span>
              </div>
            </div>
            {/* Arrow pointing up */}
            <div className="absolute left-4 -top-1 w-2 h-2 bg-gray-900 rotate-45"></div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

interface Member {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  role: 'org_owner' | 'org_admin' | 'org_member' | 'org_viewer';
  status: 'active' | 'inactive' | 'suspended';
  joined_at: string;
  invited_by?: {
    name: string;
    email: string;
  };
}

export default function MembersPage() {
  const { organization, user: current_user } = useAuth();
  const [members, set_members] = useState<Member[]>([]);
  const [loading, set_loading] = useState(true);
  const [processing, set_processing] = useState<string | null>(null);
  const [error_message, set_error_message] = useState<string | null>(null);
  const [success_message, set_success_message] = useState<string | null>(null);
  const [editing_role, set_editing_role] = useState<string | null>(null);
  const [new_role, set_new_role] = useState<string>('');

  useEffect(() => {
    if (organization?.id) {
      fetch_members();
    }
  }, [organization?.id]);

  const fetch_members = async () => {
    if (!organization?.id) return;

    try {
      set_loading(true);
      const response = await fetch(`/api/organizations/${organization.id}/members`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        set_members(data.members || []);
      } else {
        const data = await response.json();
        set_error_message(data.error || 'Failed to load members');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      set_error_message('Failed to load members');
    } finally {
      set_loading(false);
    }
  };

  const change_role = async (member_id: string, role: string) => {
    if (!organization?.id) return;

    try {
      set_processing(member_id);
      set_error_message(null);

      const response = await fetch(`/api/organizations/${organization.id}/members/${member_id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        set_success_message('Role updated successfully');
        set_editing_role(null);
        set_new_role('');
        fetch_members();
      } else {
        set_error_message(data.error || 'Failed to update role');
      }
    } catch (error) {
      console.error('Change role error:', error);
      set_error_message('Failed to update role');
    } finally {
      set_processing(null);
    }
  };

  const remove_member = async (member_id: string, member_name: string) => {
    if (!organization?.id) return;
    if (!confirm(`Are you sure you want to remove ${member_name} from the organization?`)) return;

    try {
      set_processing(member_id);
      set_error_message(null);

      const response = await fetch(`/api/organizations/${organization.id}/members/${member_id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        set_success_message('Member removed successfully');
        fetch_members();
      } else {
        set_error_message(data.error || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Remove member error:', error);
      set_error_message('Failed to remove member');
    } finally {
      set_processing(null);
    }
  };

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

  const get_role_badge = (role: string) => {
    switch (role) {
      case 'org_owner':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300"><Crown className="w-3 h-3 mr-1" />Owner</Badge>;
      case 'org_admin':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300"><Shield className="w-3 h-3 mr-1" />Admin</Badge>;
      case 'org_member':
        return <Badge variant="outline"><User className="w-3 h-3 mr-1" />Member</Badge>;
      case 'org_viewer':
        return <Badge variant="outline" className="text-gray-500"><Eye className="w-3 h-3 mr-1" />Viewer</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const get_role_display = (role: string) => {
    switch (role) {
      case 'org_owner': return 'Owner';
      case 'org_admin': return 'Admin';
      case 'org_member': return 'Member';
      case 'org_viewer': return 'Viewer';
      default: return role;
    }
  };

  const can_manage_member = (member: Member) => {
    // Can't manage yourself
    if (member.user?.id === current_user?.id) return false;
    // Can't manage owner
    if (member.role === 'org_owner') return false;
    // Only owner and admin can manage
    const current_member = members.find(m => m.user?.id === current_user?.id);
    if (!current_member) return false;
    return current_member.role === 'org_owner' || current_member.role === 'org_admin';
  };

  const get_available_roles = (current_role: string) => {
    // Don't allow changing to owner
    const roles = [
      { value: 'org_admin', label: 'Admin' },
      { value: 'org_member', label: 'Member' },
      { value: 'org_viewer', label: 'Viewer' }
    ];
    return roles.filter(r => r.value !== current_role);
  };

  const owner_count = members.filter(m => m.role === 'org_owner').length;
  const admin_count = members.filter(m => m.role === 'org_admin').length;
  const member_count = members.filter(m => m.role === 'org_member').length;
  const viewer_count = members.filter(m => m.role === 'org_viewer').length;

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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-gray-900">Members</h1>
            <RolePermissionsTooltip />
          </div>
          <p className="text-gray-500 mt-1">Manage your organization members and their roles</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold">{owner_count}</p>
              <p className="text-sm text-gray-500">Owner{owner_count !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{admin_count}</p>
              <p className="text-sm text-gray-500">Admin{admin_count !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-gray-600" />
            <div>
              <p className="text-2xl font-bold">{member_count}</p>
              <p className="text-sm text-gray-500">Member{member_count !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-2xl font-bold">{viewer_count}</p>
              <p className="text-sm text-gray-500">Viewer{viewer_count !== 1 ? 's' : ''}</p>
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

      {/* Members List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Organization Members
            </CardTitle>
            <CardDescription>
              {members.length} member{members.length !== 1 ? 's' : ''} total
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={fetch_members}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No members found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-xl font-semibold text-gray-600">
                        {member.user?.name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{member.user?.name || 'Unknown User'}</h4>
                        {member.user?.id === current_user?.id && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {member.user?.email || 'No email'}
                      </p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {editing_role === member.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          className="h-9 px-3 border rounded-md text-sm"
                          value={new_role}
                          onChange={(e) => set_new_role(e.target.value)}
                        >
                          <option value="">Select role</option>
                          {get_available_roles(member.role).map(role => (
                            <option key={role.value} value={role.value}>{role.label}</option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          onClick={() => change_role(member.id, new_role)}
                          disabled={!new_role || processing === member.id}
                        >
                          {processing === member.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Save'
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            set_editing_role(null);
                            set_new_role('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        {get_role_badge(member.role)}

                        {can_manage_member(member) && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                set_editing_role(member.id);
                                set_new_role('');
                              }}
                            >
                              Change Role
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => remove_member(member.id, member.user?.name || 'this member')}
                              disabled={processing === member.id}
                            >
                              {processing === member.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <UserMinus className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        )}
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

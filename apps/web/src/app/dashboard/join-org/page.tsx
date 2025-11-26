'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, UserPlus, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';

interface OrganizationInfo {
  id: string;
  name: string;
  slug: string;
}

interface ValidationResult {
  valid: boolean;
  organization?: OrganizationInfo;
  default_role?: string;
  auto_approve?: boolean;
  has_pending_request?: boolean;
  error?: string;
}

interface JoinRequest {
  id: string;
  organization: OrganizationInfo;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requested_role: string;
  created_at: string;
  rejection_reason?: string;
}

export default function JoinOrganizationPage() {
  const [invite_code, set_invite_code] = useState('');
  const [loading, set_loading] = useState(false);
  const [validating, set_validating] = useState(false);
  const [validation_result, set_validation_result] = useState<ValidationResult | null>(null);
  const [join_message, set_join_message] = useState('');
  const [success_message, set_success_message] = useState<string | null>(null);
  const [error_message, set_error_message] = useState<string | null>(null);
  const [my_requests, set_my_requests] = useState<JoinRequest[]>([]);
  const [loading_requests, set_loading_requests] = useState(true);

  // Fetch user's join requests on mount
  React.useEffect(() => {
    fetch_my_requests();
  }, []);

  const fetch_my_requests = async () => {
    try {
      set_loading_requests(true);
      const response = await fetch('/api/organizations/my-requests', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        set_my_requests(data.requests || []);
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      set_loading_requests(false);
    }
  };

  const validate_code = async () => {
    if (!invite_code.trim()) {
      set_error_message('Please enter an invite code');
      return;
    }

    try {
      set_validating(true);
      set_error_message(null);
      set_success_message(null);
      set_validation_result(null);

      const response = await fetch('/api/organizations/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: invite_code.trim() })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        set_validation_result({
          valid: true,
          organization: data.organization,
          default_role: data.default_role,
          auto_approve: data.auto_approve,
          has_pending_request: data.has_pending_request
        });
      } else {
        set_error_message(data.error || 'Invalid invite code');
        set_validation_result({ valid: false, error: data.error });
      }
    } catch (error) {
      console.error('Validation error:', error);
      set_error_message('Failed to validate code. Please try again.');
    } finally {
      set_validating(false);
    }
  };

  const submit_join_request = async () => {
    if (!validation_result?.valid) return;

    try {
      set_loading(true);
      set_error_message(null);

      const response = await fetch('/api/organizations/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          code: invite_code.trim(),
          message: join_message.trim() || undefined
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.status === 'approved') {
          set_success_message(`Successfully joined ${data.organization.name}!`);
        } else {
          set_success_message(`Join request submitted to ${data.organization.name}. Waiting for approval.`);
        }
        // Reset form
        set_invite_code('');
        set_join_message('');
        set_validation_result(null);
        // Refresh requests
        fetch_my_requests();
      } else {
        set_error_message(data.error || 'Failed to submit join request');
      }
    } catch (error) {
      console.error('Join error:', error);
      set_error_message('Failed to submit request. Please try again.');
    } finally {
      set_loading(false);
    }
  };

  const cancel_request = async (request_id: string) => {
    try {
      const response = await fetch(`/api/organizations/my-requests/${request_id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        fetch_my_requests();
      }
    } catch (error) {
      console.error('Cancel error:', error);
    }
  };

  const get_status_badge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><AlertCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const get_role_display = (role: string) => {
    switch (role) {
      case 'org_admin': return 'Admin';
      case 'org_member': return 'Member';
      case 'org_viewer': return 'Viewer';
      default: return role;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Join Organization</h1>
        <p className="text-gray-500 mt-1">Enter an invite code to join another organization</p>
      </div>

      {/* Success/Error Messages */}
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

      {/* Enter Code Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Enter Invite Code
          </CardTitle>
          <CardDescription>
            Ask your organization admin for an invite code
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Enter code (e.g., ACME-X7K9)"
                value={invite_code}
                onChange={(e) => set_invite_code(e.target.value.toUpperCase())}
                className="font-mono text-lg tracking-wider"
                maxLength={9}
              />
            </div>
            <Button
              onClick={validate_code}
              disabled={validating || !invite_code.trim()}
            >
              {validating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                'Validate'
              )}
            </Button>
          </div>

          {/* Validation Result */}
          {validation_result?.valid && validation_result.organization && (
            <div className="border rounded-lg p-4 bg-green-50 border-green-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900">{validation_result.organization.name}</h3>
                  <p className="text-sm text-green-700">
                    You will join as: <Badge variant="outline" className="ml-1">{get_role_display(validation_result.default_role || 'org_member')}</Badge>
                  </p>
                  {validation_result.auto_approve && (
                    <p className="text-sm text-green-600 mt-1">
                      <CheckCircle className="w-3 h-3 inline mr-1" />
                      Auto-approve enabled - you'll join instantly
                    </p>
                  )}
                  {validation_result.has_pending_request && (
                    <p className="text-sm text-yellow-600 mt-1">
                      <Clock className="w-3 h-3 inline mr-1" />
                      You already have a pending request for this organization
                    </p>
                  )}
                </div>
              </div>

              {!validation_result.has_pending_request && (
                <div className="mt-4 space-y-3">
                  <div>
                    <Label htmlFor="message">Message (optional)</Label>
                    <Input
                      id="message"
                      placeholder="Why do you want to join this organization?"
                      value={join_message}
                      onChange={(e) => set_join_message(e.target.value)}
                      maxLength={500}
                    />
                  </div>
                  <Button
                    onClick={submit_join_request}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : validation_result.auto_approve ? (
                      'Join Organization'
                    ) : (
                      'Submit Join Request'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            My Join Requests
          </CardTitle>
          <CardDescription>
            Track the status of your organization join requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading_requests ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : my_requests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <UserPlus className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No join requests yet</p>
              <p className="text-sm">Enter an invite code above to join an organization</p>
            </div>
          ) : (
            <div className="space-y-3">
              {my_requests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">{request.organization?.name || 'Unknown Organization'}</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>Role: {get_role_display(request.requested_role)}</span>
                        <span>•</span>
                        <span>{new Date(request.created_at).toLocaleDateString()}</span>
                      </div>
                      {request.status === 'rejected' && request.rejection_reason && (
                        <p className="text-sm text-red-600 mt-1">
                          Reason: {request.rejection_reason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {get_status_badge(request.status)}
                    {request.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => cancel_request(request.id)}
                      >
                        Cancel
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

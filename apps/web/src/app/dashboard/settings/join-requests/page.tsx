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
  UserPlus, CheckCircle, XCircle, AlertCircle, Loader2,
  Clock, RefreshCw, Mail, Calendar, MessageSquare
} from 'lucide-react';

interface JoinRequest {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  requested_role: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  message?: string;
  invite_code?: {
    code: string;
    name?: string;
  };
  rejection_reason?: string;
  reviewed_by?: {
    name: string;
    email: string;
  };
  created_at: string;
  reviewed_at?: string;
}

export default function JoinRequestsPage() {
  const { organization } = useAuth();
  const [requests, set_requests] = useState<JoinRequest[]>([]);
  const [loading, set_loading] = useState(true);
  const [processing, set_processing] = useState<string | null>(null);
  const [error_message, set_error_message] = useState<string | null>(null);
  const [success_message, set_success_message] = useState<string | null>(null);
  const [rejection_reason, set_rejection_reason] = useState('');
  const [rejecting_id, set_rejecting_id] = useState<string | null>(null);
  const [filter_status, set_filter_status] = useState<string>('pending');

  useEffect(() => {
    if (organization?.id) {
      fetch_requests();
    }
  }, [organization?.id]);

  const fetch_requests = async () => {
    if (!organization?.id) return;

    try {
      set_loading(true);
      const response = await fetch(`/api/organizations/${organization.id}/join-requests`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        set_requests(data.requests || []);
      } else {
        const data = await response.json();
        set_error_message(data.error || 'Failed to load join requests');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      set_error_message('Failed to load join requests');
    } finally {
      set_loading(false);
    }
  };

  const approve_request = async (request_id: string) => {
    if (!organization?.id) return;

    try {
      set_processing(request_id);
      set_error_message(null);

      const response = await fetch(`/api/organizations/${organization.id}/join-requests/${request_id}/approve`, {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        set_success_message('Request approved successfully');
        fetch_requests();
      } else {
        set_error_message(data.error || 'Failed to approve request');
      }
    } catch (error) {
      console.error('Approve error:', error);
      set_error_message('Failed to approve request');
    } finally {
      set_processing(null);
    }
  };

  const reject_request = async (request_id: string) => {
    if (!organization?.id) return;

    try {
      set_processing(request_id);
      set_error_message(null);

      const response = await fetch(`/api/organizations/${organization.id}/join-requests/${request_id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reason: rejection_reason.trim() || undefined
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        set_success_message('Request rejected');
        set_rejection_reason('');
        set_rejecting_id(null);
        fetch_requests();
      } else {
        set_error_message(data.error || 'Failed to reject request');
      }
    } catch (error) {
      console.error('Reject error:', error);
      set_error_message('Failed to reject request');
    } finally {
      set_processing(null);
    }
  };

  const get_status_badge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
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

  const filtered_requests = requests.filter(req => {
    if (filter_status === 'all') return true;
    return req.status === filter_status;
  });

  const pending_count = requests.filter(r => r.status === 'pending').length;

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
          <h1 className="text-2xl font-semibold text-gray-900">Join Requests</h1>
          <p className="text-gray-500 mt-1">Review and manage requests to join your organization</p>
        </div>
        {pending_count > 0 && (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
            {pending_count} pending
          </Badge>
        )}
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

      {/* Requests List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Join Requests
            </CardTitle>
            <CardDescription>
              {filtered_requests.length} request{filtered_requests.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="h-9 px-3 border rounded-md text-sm"
              value={filter_status}
              onChange={(e) => set_filter_status(e.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All</option>
            </select>
            <Button variant="ghost" size="sm" onClick={fetch_requests}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : filtered_requests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <UserPlus className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No {filter_status !== 'all' ? filter_status : ''} join requests</p>
              <p className="text-sm">Share your invite codes to get new members</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered_requests.map((request) => (
                <div
                  key={request.id}
                  className={`p-4 border rounded-lg ${request.status !== 'pending' ? 'bg-gray-50' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-lg font-semibold text-gray-600">
                            {request.user?.name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold">{request.user?.name || 'Unknown User'}</h4>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {request.user?.email || 'No email'}
                          </p>
                        </div>
                        {get_status_badge(request.status)}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <span>Role: {get_role_display(request.requested_role)}</span>
                        {request.invite_code && (
                          <span>Code: <code className="bg-gray-100 px-1 rounded">{request.invite_code.code}</code></span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(request.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {request.message && (
                        <div className="mt-2 p-2 bg-gray-50 rounded-md text-sm">
                          <span className="flex items-center gap-1 text-gray-600 mb-1">
                            <MessageSquare className="w-3 h-3" />
                            Message:
                          </span>
                          <p className="text-gray-700">{request.message}</p>
                        </div>
                      )}

                      {request.status === 'rejected' && request.rejection_reason && (
                        <div className="mt-2 p-2 bg-red-50 rounded-md text-sm">
                          <span className="text-red-600 font-medium">Rejection reason: </span>
                          <span className="text-red-700">{request.rejection_reason}</span>
                        </div>
                      )}

                      {request.reviewed_by && request.reviewed_at && (
                        <p className="mt-2 text-xs text-gray-400">
                          {request.status === 'approved' ? 'Approved' : 'Rejected'} by {request.reviewed_by.name} on {new Date(request.reviewed_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    {request.status === 'pending' && (
                      <div className="flex flex-col gap-2 ml-4">
                        {rejecting_id === request.id ? (
                          <div className="space-y-2">
                            <Input
                              placeholder="Reason (optional)"
                              value={rejection_reason}
                              onChange={(e) => set_rejection_reason(e.target.value)}
                              className="w-48 text-sm"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => reject_request(request.id)}
                                disabled={processing === request.id}
                              >
                                {processing === request.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  'Confirm'
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  set_rejecting_id(null);
                                  set_rejection_reason('');
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => approve_request(request.id)}
                              disabled={processing === request.id}
                            >
                              {processing === request.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Approve
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => set_rejecting_id(request.id)}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
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

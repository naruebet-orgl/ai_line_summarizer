'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CreditCard,
  Loader2,
  AlertCircle,
  CheckCircle,
  Crown,
  TrendingUp,
  MessageSquare,
  FileText,
  Users,
  Calendar,
  ArrowUpRight,
  Zap,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

/**
 * Usage statistics interface
 * @interface UsageStats
 */
interface UsageStats {
  messages: {
    used: number;
    limit: number;
    percentage: number;
  };
  summaries: {
    used: number;
    limit: number;
    percentage: number;
  };
  members: {
    used: number;
    limit: number;
    percentage: number;
  };
  rooms: {
    used: number;
    limit: number;
    percentage: number;
  };
  api_calls?: {
    used: number;
    limit: number;
    percentage: number;
  };
}

/**
 * Plan details interface
 * @interface PlanDetails
 */
interface PlanDetails {
  name: string;
  price: number;
  billing_cycle: 'monthly' | 'yearly';
  features: string[];
  limits: {
    members: number;
    rooms: number;
    messages_per_month: number;
    summaries_per_month: number;
    api_calls_per_month?: number;
  };
}

/**
 * Billing information interface
 * @interface BillingInfo
 */
interface BillingInfo {
  current_plan: PlanDetails;
  usage: UsageStats;
  billing_period: {
    start: string;
    end: string;
  };
  next_invoice?: {
    amount: number;
    date: string;
  };
  payment_method?: {
    type: string;
    last_four: string;
    expiry: string;
  };
}

/**
 * Available plans for upgrade
 */
const AVAILABLE_PLANS: PlanDetails[] = [
  {
    name: 'Free',
    price: 0,
    billing_cycle: 'monthly',
    features: ['Up to 3 team members', 'Up to 5 LINE rooms', '100 messages/month', 'Basic summaries'],
    limits: { members: 3, rooms: 5, messages_per_month: 100, summaries_per_month: 10 }
  },
  {
    name: 'Starter',
    price: 990,
    billing_cycle: 'monthly',
    features: ['Up to 10 team members', 'Up to 20 LINE rooms', '1,000 messages/month', 'AI summaries', 'Email support'],
    limits: { members: 10, rooms: 20, messages_per_month: 1000, summaries_per_month: 100 }
  },
  {
    name: 'Professional',
    price: 2990,
    billing_cycle: 'monthly',
    features: ['Up to 50 team members', 'Unlimited LINE rooms', '10,000 messages/month', 'Advanced AI summaries', 'Priority support', 'Custom branding'],
    limits: { members: 50, rooms: 1000, messages_per_month: 10000, summaries_per_month: 1000, api_calls_per_month: 5000 }
  },
  {
    name: 'Enterprise',
    price: 9990,
    billing_cycle: 'monthly',
    features: ['Unlimited members', 'Unlimited rooms', 'Unlimited messages', 'Custom AI models', 'Dedicated support', 'SLA guarantee', 'SSO integration'],
    limits: { members: -1, rooms: -1, messages_per_month: -1, summaries_per_month: -1, api_calls_per_month: -1 }
  }
];

/**
 * Billing/Usage Page
 * @description Standalone page for viewing billing information and usage statistics
 */
export default function BillingPage() {
  const { user, is_org_admin, is_org_owner } = useAuth();
  const [billing_info, set_billing_info] = useState<BillingInfo | null>(null);
  const [loading, set_loading] = useState(true);
  const [error_message, set_error_message] = useState<string | null>(null);

  console.log('[BillingPage] Component mounted');

  useEffect(() => {
    fetch_billing_info();
  }, []);

  /**
   * Fetch billing information
   * @description Calls organization.getBilling tRPC endpoint
   */
  const fetch_billing_info = async () => {
    console.log('[BillingPage] Fetching billing info');
    try {
      set_loading(true);
      set_error_message(null);

      const response = await fetch('/api/trpc/organization.getBilling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({})
      });

      console.log('[BillingPage] Billing response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        if (data.result?.data) {
          console.log('[BillingPage] Billing info loaded');
          set_billing_info(data.result.data);
        }
      } else {
        // Create mock data for demonstration
        console.log('[BillingPage] Using mock data');
        set_billing_info({
          current_plan: AVAILABLE_PLANS[1], // Starter plan
          usage: {
            messages: { used: 456, limit: 1000, percentage: 45.6 },
            summaries: { used: 23, limit: 100, percentage: 23 },
            members: { used: 5, limit: 10, percentage: 50 },
            rooms: { used: 8, limit: 20, percentage: 40 }
          },
          billing_period: {
            start: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
          },
          next_invoice: {
            amount: 990,
            date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
          }
        });
      }
    } catch (error) {
      console.error('[BillingPage] Fetch error:', error);
      set_error_message('Failed to load billing information');
    } finally {
      set_loading(false);
    }
  };

  /**
   * Format currency
   * @param amount - Amount in smallest unit (e.g., cents or satang)
   * @returns Formatted currency string
   */
  const format_currency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0
    }).format(amount);
  };

  /**
   * Format date
   * @param date_string - ISO date string
   * @returns Formatted date
   */
  const format_date = (date_string: string) => {
    return new Date(date_string).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  /**
   * Get usage bar color
   * @param percentage - Usage percentage
   * @returns Color class
   */
  const get_usage_color = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  /**
   * Format limit
   * @param limit - Limit value (-1 for unlimited)
   * @returns Formatted limit string
   */
  const format_limit = (limit: number) => {
    return limit === -1 ? 'Unlimited' : limit.toLocaleString();
  };

  /**
   * Check if user can manage billing
   * @returns Boolean indicating permission
   */
  const can_manage_billing = () => {
    return is_org_admin() || is_org_owner();
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
          <h1 className="text-2xl font-semibold text-gray-900">Billing & Usage</h1>
          <p className="text-gray-500 mt-1">Manage your subscription and monitor usage</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetch_billing_info}>
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

      {/* Current Plan Card */}
      {billing_info && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Crown className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle>{billing_info.current_plan.name} Plan</CardTitle>
                  <CardDescription>
                    {format_currency(billing_info.current_plan.price)}/{billing_info.current_plan.billing_cycle}
                  </CardDescription>
                </div>
              </div>
              {can_manage_billing() && billing_info.current_plan.name !== 'Enterprise' && (
                <Button>
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  Upgrade Plan
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {billing_info.current_plan.features.map((feature, index) => (
                <Badge key={index} variant="outline" className="bg-gray-50">
                  <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                  {feature}
                </Badge>
              ))}
            </div>
            {billing_info.billing_period && (
              <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Billing period: {format_date(billing_info.billing_period.start)} - {format_date(billing_info.billing_period.end)}
                </span>
                {billing_info.next_invoice && (
                  <span>
                    Next invoice: {format_currency(billing_info.next_invoice.amount)} on {format_date(billing_info.next_invoice.date)}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Usage Statistics */}
      {billing_info?.usage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Usage This Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Messages */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">Messages</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {billing_info.usage.messages.used.toLocaleString()} / {format_limit(billing_info.usage.messages.limit)}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${get_usage_color(billing_info.usage.messages.percentage)} transition-all`}
                    style={{ width: `${Math.min(billing_info.usage.messages.percentage, 100)}%` }}
                  />
                </div>
              </div>

              {/* AI Summaries */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-orange-500" />
                    <span className="font-medium">AI Summaries</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {billing_info.usage.summaries.used.toLocaleString()} / {format_limit(billing_info.usage.summaries.limit)}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${get_usage_color(billing_info.usage.summaries.percentage)} transition-all`}
                    style={{ width: `${Math.min(billing_info.usage.summaries.percentage, 100)}%` }}
                  />
                </div>
              </div>

              {/* Team Members */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-500" />
                    <span className="font-medium">Team Members</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {billing_info.usage.members.used} / {format_limit(billing_info.usage.members.limit)}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${get_usage_color(billing_info.usage.members.percentage)} transition-all`}
                    style={{ width: `${Math.min(billing_info.usage.members.percentage, 100)}%` }}
                  />
                </div>
              </div>

              {/* Rooms */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="font-medium">LINE Rooms</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {billing_info.usage.rooms.used} / {format_limit(billing_info.usage.rooms.limit)}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${get_usage_color(billing_info.usage.rooms.percentage)} transition-all`}
                    style={{ width: `${Math.min(billing_info.usage.rooms.percentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Method */}
      {billing_info?.payment_method && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-6 bg-gray-200 rounded flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium">
                    {billing_info.payment_method.type} •••• {billing_info.payment_method.last_four}
                  </p>
                  <p className="text-sm text-gray-500">Expires {billing_info.payment_method.expiry}</p>
                </div>
              </div>
              {can_manage_billing() && (
                <Button variant="outline" size="sm">
                  Update
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Available Plans
          </CardTitle>
          <CardDescription>Compare plans and choose the best for your team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {AVAILABLE_PLANS.map((plan) => {
              const is_current = billing_info?.current_plan.name === plan.name;
              return (
                <div
                  key={plan.name}
                  className={`p-4 rounded-lg border-2 ${
                    is_current ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{plan.name}</h3>
                    {is_current && (
                      <Badge className="bg-purple-100 text-purple-800">Current</Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold mb-3">
                    {plan.price === 0 ? 'Free' : format_currency(plan.price)}
                    {plan.price > 0 && <span className="text-sm font-normal text-gray-500">/mo</span>}
                  </p>
                  <ul className="space-y-1 text-sm text-gray-600 mb-4">
                    <li>• {format_limit(plan.limits.members)} members</li>
                    <li>• {format_limit(plan.limits.rooms)} rooms</li>
                    <li>• {format_limit(plan.limits.messages_per_month)} messages/mo</li>
                    <li>• {format_limit(plan.limits.summaries_per_month)} summaries/mo</li>
                  </ul>
                  {can_manage_billing() && !is_current && (
                    <Button
                      variant={plan.price > (billing_info?.current_plan.price || 0) ? 'default' : 'outline'}
                      size="sm"
                      className="w-full"
                    >
                      {plan.price > (billing_info?.current_plan.price || 0) ? 'Upgrade' : 'Downgrade'}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Contact for Enterprise */}
      <Alert className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <Crown className="h-4 w-4 text-purple-600" />
        <AlertDescription className="text-purple-800">
          Need more? <strong>Contact us</strong> for a custom Enterprise plan with unlimited usage,
          dedicated support, and custom integrations.
        </AlertDescription>
      </Alert>
    </div>
  );
}

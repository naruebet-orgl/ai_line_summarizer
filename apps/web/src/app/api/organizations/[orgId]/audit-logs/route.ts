/**
 * Organization Audit Logs API Route
 * @description Proxies audit log requests to backend
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

/**
 * Build headers for backend request
 * @param request - Incoming request
 * @returns Headers object
 */
function build_headers(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const cookies = request.headers.get('cookie');
  if (cookies) {
    headers['Cookie'] = cookies;
  }

  const authorization = request.headers.get('authorization');
  if (authorization) {
    headers['Authorization'] = authorization;
  }

  return headers;
}

/**
 * GET /api/organizations/[orgId]/audit-logs
 * @description Get organization audit logs
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const queryString = searchParams.toString();

  console.log(`📋 GET /api/organizations/${orgId}/audit-logs - Fetching audit logs`);

  try {
    const url = queryString
      ? `${BACKEND_URL}/api/organizations/${orgId}/audit-logs?${queryString}`
      : `${BACKEND_URL}/api/organizations/${orgId}/audit-logs`;

    const backend_response = await fetch(url, {
      method: 'GET',
      headers: build_headers(request),
    });

    const data = await backend_response.json();

    return NextResponse.json(data, { status: backend_response.status });
  } catch (error) {
    console.error('❌ Audit logs fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

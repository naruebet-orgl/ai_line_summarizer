/**
 * Reject Join Request API Route
 * @description Proxies join request rejection to backend
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
 * POST /api/organizations/[orgId]/join-requests/[requestId]/reject
 * @description Reject a join request
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; requestId: string }> }
) {
  const { orgId, requestId } = await params;
  console.log(`❌ POST /api/organizations/${orgId}/join-requests/${requestId}/reject - Rejecting request`);

  try {
    const body = await request.json().catch(() => ({}));

    const backend_response = await fetch(
      `${BACKEND_URL}/api/organizations/${orgId}/join-requests/${requestId}/reject`,
      {
        method: 'POST',
        headers: build_headers(request),
        body: JSON.stringify(body),
      }
    );

    const data = await backend_response.json();

    return NextResponse.json(data, { status: backend_response.status });
  } catch (error) {
    console.error('❌ Join request reject error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reject join request' },
      { status: 500 }
    );
  }
}

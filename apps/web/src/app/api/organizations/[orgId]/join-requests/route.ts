/**
 * Organization Join Requests API Route
 * @description Proxies join request management to backend
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
 * GET /api/organizations/[orgId]/join-requests
 * @description List pending join requests
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  console.log(`📨 GET /api/organizations/${orgId}/join-requests - Fetching join requests`);

  try {
    const backend_response = await fetch(
      `${BACKEND_URL}/api/organizations/${orgId}/join-requests`,
      {
        method: 'GET',
        headers: build_headers(request),
      }
    );

    const data = await backend_response.json();

    return NextResponse.json(data, { status: backend_response.status });
  } catch (error) {
    console.error('❌ Join requests fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch join requests' },
      { status: 500 }
    );
  }
}

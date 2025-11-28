/**
 * Regenerate Member Invite Code API Route
 * @description Proxies member invite code regeneration to backend
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
 * POST /api/organizations/[orgId]/member-invite-code/regenerate
 * @description Regenerate the organization's member invite code
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  console.log(`🔄 POST /api/organizations/${orgId}/member-invite-code/regenerate`);

  try {
    const backend_response = await fetch(
      `${BACKEND_URL}/api/organizations/${orgId}/member-invite-code/regenerate`,
      {
        method: 'POST',
        headers: build_headers(request),
      }
    );

    const data = await backend_response.json();

    return NextResponse.json(data, { status: backend_response.status });
  } catch (error) {
    console.error('❌ Regenerate member invite code error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to regenerate member invite code' },
      { status: 500 }
    );
  }
}

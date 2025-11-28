/**
 * Organization Member Role API Route
 * @description Proxies member role change requests to backend
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
 * PUT /api/organizations/[orgId]/members/[memberId]/role
 * @description Update member role
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; memberId: string }> }
) {
  const { orgId, memberId } = await params;
  console.log(`👥 PUT /api/organizations/${orgId}/members/${memberId}/role - Updating role`);

  try {
    const body = await request.json();

    const backend_response = await fetch(
      `${BACKEND_URL}/api/organizations/${orgId}/members/${memberId}/role`,
      {
        method: 'PUT',
        headers: build_headers(request),
        body: JSON.stringify(body),
      }
    );

    const data = await backend_response.json();

    return NextResponse.json(data, { status: backend_response.status });
  } catch (error) {
    console.error('❌ Member role update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update member role' },
      { status: 500 }
    );
  }
}

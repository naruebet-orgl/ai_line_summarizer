/**
 * Organization Invite Code API Route
 * @description Proxies individual invite code management requests to backend
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
 * DELETE /api/organizations/[orgId]/invite-codes/[codeId]
 * @description Delete/revoke invite code
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; codeId: string }> }
) {
  const { orgId, codeId } = await params;
  console.log(`🎟️ DELETE /api/organizations/${orgId}/invite-codes/${codeId} - Deleting invite code`);

  try {
    const backend_response = await fetch(
      `${BACKEND_URL}/api/organizations/${orgId}/invite-codes/${codeId}`,
      {
        method: 'DELETE',
        headers: build_headers(request),
      }
    );

    const data = await backend_response.json();

    return NextResponse.json(data, { status: backend_response.status });
  } catch (error) {
    console.error('❌ Invite code delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete invite code' },
      { status: 500 }
    );
  }
}

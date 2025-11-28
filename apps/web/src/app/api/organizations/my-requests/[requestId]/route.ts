/**
 * My Join Request API Route
 * @description Proxies individual join request management to backend
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
 * DELETE /api/organizations/my-requests/[requestId]
 * @description Cancel a join request
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const { requestId } = await params;
  console.log(`❌ DELETE /api/organizations/my-requests/${requestId} - Cancelling request`);

  try {
    const backend_response = await fetch(
      `${BACKEND_URL}/api/organizations/my-requests/${requestId}`,
      {
        method: 'DELETE',
        headers: build_headers(request),
      }
    );

    const data = await backend_response.json();

    return NextResponse.json(data, { status: backend_response.status });
  } catch (error) {
    console.error('❌ Cancel request error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel join request' },
      { status: 500 }
    );
  }
}

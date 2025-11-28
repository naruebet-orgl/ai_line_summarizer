/**
 * Join Organization API Route
 * @description Proxies join organization requests to backend
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
 * POST /api/organizations/join
 * @description Submit join request using invite code
 */
export async function POST(request: NextRequest) {
  console.log(`🚀 POST /api/organizations/join - Submitting join request`);

  try {
    const body = await request.json();

    const backend_response = await fetch(
      `${BACKEND_URL}/api/organizations/join`,
      {
        method: 'POST',
        headers: build_headers(request),
        body: JSON.stringify(body),
      }
    );

    const data = await backend_response.json();

    return NextResponse.json(data, { status: backend_response.status });
  } catch (error) {
    console.error('❌ Join organization error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to join organization' },
      { status: 500 }
    );
  }
}

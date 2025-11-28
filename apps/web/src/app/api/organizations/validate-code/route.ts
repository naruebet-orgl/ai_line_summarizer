/**
 * Validate Invite Code API Route
 * @description Proxies invite code validation to backend
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
 * POST /api/organizations/validate-code
 * @description Validate an invite code
 */
export async function POST(request: NextRequest) {
  console.log(`🎟️ POST /api/organizations/validate-code - Validating invite code`);

  try {
    const body = await request.json();

    const backend_response = await fetch(
      `${BACKEND_URL}/api/organizations/validate-code`,
      {
        method: 'POST',
        headers: build_headers(request),
        body: JSON.stringify(body),
      }
    );

    const data = await backend_response.json();

    return NextResponse.json(data, { status: backend_response.status });
  } catch (error) {
    console.error('❌ Validate code error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to validate invite code' },
      { status: 500 }
    );
  }
}

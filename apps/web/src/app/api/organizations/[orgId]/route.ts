/**
 * Organization API Route
 * @description Proxies organization requests to backend
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

  // Forward cookies for authentication
  const cookies = request.headers.get('cookie');
  if (cookies) {
    headers['Cookie'] = cookies;
  }

  // Forward Authorization header if present
  const authorization = request.headers.get('authorization');
  if (authorization) {
    headers['Authorization'] = authorization;
  }

  return headers;
}

/**
 * GET /api/organizations/[orgId]
 * @description Get organization details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  console.log(`🏢 GET /api/organizations/${orgId} - Fetching organization`);

  try {
    const backend_response = await fetch(`${BACKEND_URL}/api/organizations/${orgId}`, {
      method: 'GET',
      headers: build_headers(request),
    });

    const data = await backend_response.json();

    return NextResponse.json(data, { status: backend_response.status });
  } catch (error) {
    console.error('❌ Organization fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch organization' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/organizations/[orgId]
 * @description Update organization details
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  console.log(`🏢 PUT /api/organizations/${orgId} - Updating organization`);

  try {
    const body = await request.json();

    const backend_response = await fetch(`${BACKEND_URL}/api/organizations/${orgId}`, {
      method: 'PUT',
      headers: build_headers(request),
      body: JSON.stringify(body),
    });

    const data = await backend_response.json();

    return NextResponse.json(data, { status: backend_response.status });
  } catch (error) {
    console.error('❌ Organization update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update organization' },
      { status: 500 }
    );
  }
}

/**
 * Organization Members API Route
 * @description Proxies member management requests to backend
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
 * GET /api/organizations/[orgId]/members
 * @description List organization members
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  console.log(`👥 GET /api/organizations/${orgId}/members - Fetching members`);

  try {
    const backend_response = await fetch(`${BACKEND_URL}/api/organizations/${orgId}/members`, {
      method: 'GET',
      headers: build_headers(request),
    });

    const data = await backend_response.json();

    return NextResponse.json(data, { status: backend_response.status });
  } catch (error) {
    console.error('❌ Members fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizations/[orgId]/members
 * @description Add new member to organization
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  console.log(`👥 POST /api/organizations/${orgId}/members - Adding member`);

  try {
    const body = await request.json();

    const backend_response = await fetch(`${BACKEND_URL}/api/organizations/${orgId}/members`, {
      method: 'POST',
      headers: build_headers(request),
      body: JSON.stringify(body),
    });

    const data = await backend_response.json();

    return NextResponse.json(data, { status: backend_response.status });
  } catch (error) {
    console.error('❌ Member add error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add member' },
      { status: 500 }
    );
  }
}

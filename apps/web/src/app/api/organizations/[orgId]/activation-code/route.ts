import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

/**
 * GET /api/organizations/:orgId/activation-code
 * @description Get the organization's LINE group activation code
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  console.log(`🔑 GET /api/organizations/${orgId}/activation-code - Fetching activation code`);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Forward authentication headers
    const cookies = request.headers.get('cookie');
    if (cookies) {
      headers['Cookie'] = cookies;
    }

    const authorization = request.headers.get('authorization');
    if (authorization) {
      headers['Authorization'] = authorization;
    }

    const response = await fetch(`${BACKEND_URL}/api/organizations/${orgId}/activation-code`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Error fetching activation code:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activation code' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizations/:orgId/activation-code
 * @description Regenerate the organization's LINE group activation code
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  console.log(`🔄 POST /api/organizations/${orgId}/activation-code - Regenerating activation code`);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Forward authentication headers
    const cookies = request.headers.get('cookie');
    if (cookies) {
      headers['Cookie'] = cookies;
    }

    const authorization = request.headers.get('authorization');
    if (authorization) {
      headers['Authorization'] = authorization;
    }

    const response = await fetch(`${BACKEND_URL}/api/organizations/${orgId}/activation-code/regenerate`, {
      method: 'POST',
      headers,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Error regenerating activation code:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to regenerate activation code' },
      { status: 500 }
    );
  }
}

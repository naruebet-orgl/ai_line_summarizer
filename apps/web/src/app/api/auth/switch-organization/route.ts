/**
 * Switch Organization API Route
 * @description Proxies organization switch requests to backend
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

/**
 * POST /api/auth/switch-organization
 * @description Switch user's current organization context
 */
export async function POST(request: NextRequest) {
  console.log('🔀 POST /api/auth/switch-organization - Switching organization');

  try {
    const body = await request.json();

    // Get cookies for authentication
    const cookies = request.headers.get('cookie');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (cookies) {
      headers['Cookie'] = cookies;
    }

    const authorization = request.headers.get('authorization');
    if (authorization) {
      headers['Authorization'] = authorization;
    }

    const backend_response = await fetch(`${BACKEND_URL}/api/auth/switch-organization`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await backend_response.json();

    if (!backend_response.ok) {
      return NextResponse.json(data, { status: backend_response.status });
    }

    // Create response with updated organization context
    const response = NextResponse.json({
      success: true,
      organization: data.organization,
      message: data.message
    });

    // If backend returns updated tokens, set them as cookies
    if (data.access_token) {
      response.cookies.set('access_token', data.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: data.expires_in || 24 * 60 * 60,
        path: '/'
      });
    }

    console.log(`✅ Switched to organization: ${data.organization?.name}`);

    return response;
  } catch (error) {
    console.error('❌ Switch organization error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to switch organization' },
      { status: 500 }
    );
  }
}

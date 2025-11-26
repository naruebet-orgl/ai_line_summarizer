/**
 * Login API Route
 * @description Proxies login requests to backend
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  console.log('🔐 POST /api/auth/login - Proxying to backend');

  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Forward request to backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      return NextResponse.json(data, { status: backendResponse.status });
    }

    // Create response with cookies
    const response = NextResponse.json({
      success: true,
      user: data.user,
      message: data.message
    });

    // Set access token cookie
    response.cookies.set('access_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: data.expires_in || 24 * 60 * 60, // 24 hours default
      path: '/'
    });

    // Set refresh token cookie
    response.cookies.set('refresh_token', data.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: data.refresh_expires_in || 7 * 24 * 60 * 60, // 7 days default
      path: '/'
    });

    console.log(`✅ User logged in: ${data.user?.email}`);

    return response;
  } catch (error) {
    console.error('❌ Login proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}

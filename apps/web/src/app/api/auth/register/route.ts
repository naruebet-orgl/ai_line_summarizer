/**
 * Register API Route
 * @description Proxies registration requests to backend
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  console.log('📝 POST /api/auth/register - Proxying to backend');

  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    // Forward request to backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name }),
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
      maxAge: data.expires_in || 24 * 60 * 60,
      path: '/'
    });

    // Set refresh token cookie
    response.cookies.set('refresh_token', data.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: data.refresh_expires_in || 7 * 24 * 60 * 60,
      path: '/'
    });

    console.log(`✅ User registered: ${data.user?.email}`);

    return response;
  } catch (error) {
    console.error('❌ Register proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}

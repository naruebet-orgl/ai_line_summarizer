/**
 * Login API Route
 * @description Proxies login requests to backend and sets auth cookies
 * @returns {Object} User data on success, or error with specific code
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

/**
 * POST /api/auth/login
 * @param request - Next.js request object with email and password
 * @returns Response with user data and cookies on success, or error details
 */
export async function POST(request: NextRequest) {
  console.log('🔐 POST /api/auth/login - Proxying to backend');

  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email and password are required',
          error_code: 'MISSING_CREDENTIALS'
        },
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

    // Forward backend errors with full details
    if (!backendResponse.ok) {
      console.log(`❌ Backend login error: ${data.error_code} - ${data.error}`);
      return NextResponse.json(
        {
          success: false,
          error: data.error || 'Login failed',
          error_code: data.error_code || 'UNKNOWN_ERROR',
          ...(data.lock_minutes && { lock_minutes: data.lock_minutes }),
          ...(data.status && { status: data.status })
        },
        { status: backendResponse.status }
      );
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

    // Check if backend is unreachable
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unable to connect to server. Please try again.',
          error_code: 'CONNECTION_ERROR'
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred. Please try again.',
        error_code: 'SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}

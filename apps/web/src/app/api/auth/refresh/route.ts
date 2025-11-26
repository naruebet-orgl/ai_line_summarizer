/**
 * Refresh Token API Route
 * @description Refreshes access token using refresh token
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  console.log('🔄 POST /api/auth/refresh - Refreshing token');

  try {
    // Get refresh token from cookie
    const refreshToken = request.cookies.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: 'No refresh token provided' },
        { status: 401 }
      );
    }

    // Forward request to backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      // Clear cookies if refresh failed
      const response = NextResponse.json(data, { status: backendResponse.status });

      response.cookies.set('access_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
      });

      response.cookies.set('refresh_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
      });

      return response;
    }

    // Create response with new cookies
    const response = NextResponse.json({
      success: true,
      message: 'Token refreshed successfully'
    });

    // Set new access token cookie
    response.cookies.set('access_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: data.expires_in || 24 * 60 * 60,
      path: '/'
    });

    // Set new refresh token cookie
    response.cookies.set('refresh_token', data.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: data.refresh_expires_in || 7 * 24 * 60 * 60,
      path: '/'
    });

    console.log('✅ Token refreshed successfully');

    return response;
  } catch (error) {
    console.error('❌ Refresh token proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Token refresh failed' },
      { status: 500 }
    );
  }
}

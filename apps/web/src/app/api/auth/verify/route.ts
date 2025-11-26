/**
 * Verify API Route
 * @description Verifies JWT token and returns user info
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  console.log('🔍 GET /api/auth/verify - Verifying token');

  try {
    // Get access token from cookie
    const accessToken = request.cookies.get('access_token')?.value;

    if (!accessToken) {
      console.log('❌ No access token found');
      return NextResponse.json(
        { success: false, authenticated: false, error: 'No token provided' },
        { status: 401 }
      );
    }

    // Forward request to backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      // Token might be expired, try to refresh
      const refreshToken = request.cookies.get('refresh_token')?.value;

      if (refreshToken) {
        console.log('🔄 Access token expired, attempting refresh');

        const refreshResponse = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();

          // Verify with new token
          const verifyResponse = await fetch(`${BACKEND_URL}/api/auth/verify`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${refreshData.access_token}`,
              'Content-Type': 'application/json',
            },
          });

          if (verifyResponse.ok) {
            const verifyData = await verifyResponse.json();

            const response = NextResponse.json({
              success: true,
              authenticated: true,
              user: verifyData.user
            });

            // Update cookies with new tokens
            response.cookies.set('access_token', refreshData.access_token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: refreshData.expires_in || 24 * 60 * 60,
              path: '/'
            });

            response.cookies.set('refresh_token', refreshData.refresh_token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: refreshData.refresh_expires_in || 7 * 24 * 60 * 60,
              path: '/'
            });

            console.log('✅ Token refreshed and verified');
            return response;
          }
        }
      }

      return NextResponse.json(
        { success: false, authenticated: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    console.log(`✅ Token verified for: ${data.user?.email}`);

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: data.user
    });
  } catch (error) {
    console.error('❌ Verify proxy error:', error);
    return NextResponse.json(
      { success: false, authenticated: false, error: 'Verification failed' },
      { status: 500 }
    );
  }
}

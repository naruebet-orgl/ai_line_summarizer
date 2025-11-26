/**
 * Forgot Password API Route
 * @description Proxies forgot password requests to backend
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  console.log('🔑 POST /api/auth/forgot-password - Proxying to backend');

  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Forward request to backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await backendResponse.json();

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: data.message || 'If an account with that email exists, a password reset link has been sent.'
    });
  } catch (error) {
    console.error('❌ Forgot password proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request. Please try again.' },
      { status: 500 }
    );
  }
}

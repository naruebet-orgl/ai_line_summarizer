import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check for the session cookie
    const sessionCookie = request.cookies.get('chat-session');

    if (sessionCookie && sessionCookie.value === 'authenticated') {
      return NextResponse.json({
        authenticated: true,
        user: {
          email: 'aiadmin',
          name: 'AI Analytics Admin',
          roles: ['analytics_viewer']
        }
      });
    }

    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  } catch (error) {
    console.error('Auth verification error:', error);
    return NextResponse.json(
      { authenticated: false },
      { status: 500 }
    );
  }
}
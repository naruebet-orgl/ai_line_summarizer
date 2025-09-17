import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import HrAllowlist from '@/lib/models/HrAllowlist';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // For MVP, we'll use a simple hardcoded check
    // In production, you'd check against HrAllowlist collection
    if (email === 'admin@company.com' && password === 'admin123') {
      const response = NextResponse.json({
        success: true,
        user: {
          email: 'admin@company.com',
          name: 'HR Admin',
          roles: ['hr_viewer']
        }
      });

      // Set a simple session cookie (in production, use proper JWT)
      response.cookies.set('hr-session', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 // 24 hours
      });

      return response;
    }

    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
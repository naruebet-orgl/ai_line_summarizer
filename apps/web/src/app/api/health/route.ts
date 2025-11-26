import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const health = {
      status: 'OK',
      service: 'ORGL Notes Bot Frontend',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      uptime: process.uptime()
    };

    return NextResponse.json(health);
  } catch (error) {
    return NextResponse.json(
      {
        status: 'ERROR',
        service: 'ORGL Notes Bot Frontend',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return handleTRPCRequest(request)
}

export async function POST(request: NextRequest) {
  return handleTRPCRequest(request)
}

async function handleTRPCRequest(request: NextRequest) {
  const url = new URL(request.url)
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001'

  // Forward the request to backend
  const backendTRPCUrl = `${backendUrl}/api/trpc${url.pathname.replace('/api/trpc', '')}${url.search}`

  try {
    const backendResponse = await fetch(backendTRPCUrl, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: request.method !== 'GET' ? await request.text() : undefined,
    })

    const data = await backendResponse.text()

    return new NextResponse(data, {
      status: backendResponse.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  } catch (error) {
    console.error('Error proxying to backend:', error)
    return NextResponse.json(
      { error: 'Failed to connect to backend' },
      { status: 500 }
    )
  }
}
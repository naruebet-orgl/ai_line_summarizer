import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return handleTRPCRequest(request)
}

export async function POST(request: NextRequest) {
  return handleTRPCRequest(request)
}

async function handleTRPCRequest(request: NextRequest) {
  const url = new URL(request.url)

  // For production, use the Railway backend URL directly
  // This works around Next.js build-time env var limitations
  const backendUrl = process.env.NODE_ENV === 'production'
    ? 'https://backend-production-8d6f.up.railway.app'
    : (process.env.BACKEND_URL || 'http://localhost:3001')

  // Forward the request to backend
  const backendTRPCUrl = `${backendUrl}/api/trpc${url.pathname.replace('/api/trpc', '')}${url.search}`

  console.log(`Proxying TRPC request to: ${backendTRPCUrl}`)
  console.log(`Backend URL configured as: ${backendUrl}`)
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`)

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
    console.error('Backend URL:', backendUrl)
    console.error('Full URL attempted:', backendTRPCUrl)
    return NextResponse.json(
      {
        error: 'Failed to connect to backend',
        details: error instanceof Error ? error.message : 'Unknown error',
        backendUrl: backendUrl,
        attemptedUrl: backendTRPCUrl
      },
      { status: 500 }
    )
  }
}
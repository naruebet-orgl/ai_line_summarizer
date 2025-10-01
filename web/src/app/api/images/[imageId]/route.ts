import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    const { imageId } = await params;

    // Get backend URL from environment
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const imageUrl = `${backendUrl}/api/images/${imageId}`;

    console.log(`📸 Proxying image request to: ${imageUrl}`);

    // Fetch image from backend
    const response = await fetch(imageUrl, {
      headers: {
        'Accept': 'image/*',
      },
      // Don't cache during fetch, but we'll set cache headers in response
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`❌ Backend returned ${response.status} for image ${imageId}`);
      return NextResponse.json(
        { error: 'Image not found' },
        { status: response.status }
      );
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    console.log(`✅ Image ${imageId} fetched successfully (${contentType})`);

    // Return the image with appropriate headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': imageBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('❌ Error proxying image:', error);
    return NextResponse.json(
      { error: 'Failed to load image' },
      { status: 500 }
    );
  }
}

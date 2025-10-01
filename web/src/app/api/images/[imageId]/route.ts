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
    console.log(`🔧 BACKEND_URL env: ${process.env.BACKEND_URL}`);

    // Fetch image from backend with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(imageUrl, {
        headers: {
          'Accept': 'image/*',
        },
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Backend returned ${response.status} for image ${imageId}: ${errorText}`);
        return NextResponse.json(
          { error: 'Image not found', details: errorText },
          { status: response.status }
        );
      }

      // Get the image data
      const imageBuffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/jpeg';

      console.log(`✅ Image ${imageId} fetched successfully (${contentType}, ${imageBuffer.byteLength} bytes)`);

      // Return the image with appropriate headers
      return new NextResponse(imageBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Content-Length': imageBuffer.byteLength.toString(),
        },
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error(`❌ Timeout fetching image from backend: ${imageUrl}`);
        return NextResponse.json(
          { error: 'Request timeout', details: 'Backend took too long to respond' },
          { status: 504 }
        );
      }
      throw fetchError;
    }

  } catch (error: any) {
    console.error('❌ Error proxying image:', error);
    console.error('❌ Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    return NextResponse.json(
      { error: 'Failed to load image', details: error.message },
      { status: 500 }
    );
  }
}

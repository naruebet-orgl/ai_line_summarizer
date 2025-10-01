import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    const { imageId } = await params;
    console.log(`📸 Fetching image: ${imageId}`);

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(imageId)) {
      console.error(`❌ Invalid image ID format: ${imageId}`);
      return NextResponse.json(
        { error: 'Invalid image ID' },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    await connectDB();

    if (!mongoose.connection.db) {
      console.error('❌ MongoDB not connected');
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 503 }
      );
    }

    // Create GridFS bucket
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'images'
    });

    // Find the file
    const objectId = new mongoose.Types.ObjectId(imageId);
    const files = await bucket.find({ _id: objectId }).toArray();

    if (files.length === 0) {
      console.error(`❌ Image not found in GridFS: ${imageId}`);
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    const file = files[0];
    console.log(`✅ Found image: ${file.filename}, size: ${file.length} bytes`);

    // Stream the file to a buffer
    const downloadStream = bucket.openDownloadStream(objectId);
    const chunks: Uint8Array[] = [];

    await new Promise((resolve, reject) => {
      downloadStream.on('data', (chunk) => chunks.push(chunk));
      downloadStream.on('error', reject);
      downloadStream.on('end', resolve);
    });

    const imageBuffer = Buffer.concat(chunks);
    const contentType = file.metadata?.contentType || 'image/jpeg';

    console.log(`✅ Image ${imageId} fetched successfully (${contentType}, ${imageBuffer.length} bytes)`);

    // Return the image with appropriate headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': imageBuffer.length.toString(),
      },
    });

  } catch (error: any) {
    console.error('❌ Error fetching image:', error);
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

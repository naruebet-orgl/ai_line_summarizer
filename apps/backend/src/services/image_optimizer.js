/**
 * Image Optimizer Service
 *
 * Provides image compression and optimization utilities using Sharp library.
 * Reduces image file size while maintaining acceptable visual quality.
 *
 * @module services/image_optimizer
 */

const sharp = require('sharp');

/**
 * Default optimization configuration
 * These values provide a good balance between file size and quality.
 */
const DEFAULT_CONFIG = {
  // Maximum dimensions (will scale down if larger, preserving aspect ratio)
  max_width: 1920,
  max_height: 1920,

  // JPEG quality (1-100, higher = better quality, larger file)
  jpeg_quality: 80,

  // WebP quality (1-100, higher = better quality, larger file)
  webp_quality: 80,

  // PNG compression level (0-9, higher = more compression, slower)
  png_compression: 6,

  // Whether to convert images to WebP for better compression
  convert_to_webp: true,

  // Whether to preserve EXIF metadata (location, camera info, etc.)
  preserve_metadata: false
};

/**
 * Image Optimizer class
 * Handles image compression, resizing, and format conversion.
 */
class ImageOptimizer {
  /**
   * Creates an ImageOptimizer instance with optional configuration override.
   * @param {Object} config - Configuration options to override defaults
   */
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    console.log('📸 ImageOptimizer initialized with config:', {
      max_dimensions: `${this.config.max_width}x${this.config.max_height}`,
      jpeg_quality: this.config.jpeg_quality,
      webp_quality: this.config.webp_quality,
      convert_to_webp: this.config.convert_to_webp
    });
  }

  /**
   * Optimize an image buffer with compression and optional resizing.
   *
   * @param {Buffer} input_buffer - Raw image data as Buffer
   * @param {string} content_type - Original MIME type (e.g., 'image/jpeg')
   * @param {Object} options - Optional overrides for this specific optimization
   * @returns {Promise<Object>} Optimization result with buffer and metadata
   *
   * @example
   * const result = await optimizer.optimize(imageBuffer, 'image/jpeg');
   * console.log(`Reduced from ${result.original_size} to ${result.optimized_size}`);
   */
  async optimize(input_buffer, content_type, options = {}) {
    const start_time = Date.now();
    const config = { ...this.config, ...options };

    console.log(`📸 Starting image optimization...`);
    console.log(`   Original content type: ${content_type}`);
    console.log(`   Original size: ${this.format_bytes(input_buffer.length)}`);

    try {
      // Get image metadata
      const metadata = await sharp(input_buffer).metadata();
      console.log(`   Original dimensions: ${metadata.width}x${metadata.height}`);
      console.log(`   Format: ${metadata.format}`);

      // Create sharp pipeline
      let pipeline = sharp(input_buffer);

      // Resize if larger than max dimensions (preserve aspect ratio)
      if (metadata.width > config.max_width || metadata.height > config.max_height) {
        pipeline = pipeline.resize(config.max_width, config.max_height, {
          fit: 'inside',
          withoutEnlargement: true
        });
        console.log(`   Resizing to fit within ${config.max_width}x${config.max_height}`);
      }

      // Remove metadata if not preserving (reduces file size)
      if (!config.preserve_metadata) {
        pipeline = pipeline.rotate(); // Auto-rotate based on EXIF, then strip EXIF
      }

      // Determine output format and apply compression
      let output_buffer;
      let output_content_type;
      let output_format;

      if (config.convert_to_webp && !content_type.includes('gif')) {
        // Convert to WebP for better compression (not for GIFs)
        output_buffer = await pipeline
          .webp({ quality: config.webp_quality })
          .toBuffer();
        output_content_type = 'image/webp';
        output_format = 'webp';
        console.log(`   Converting to WebP with quality ${config.webp_quality}`);
      } else if (content_type.includes('jpeg') || content_type.includes('jpg')) {
        // Compress JPEG
        output_buffer = await pipeline
          .jpeg({ quality: config.jpeg_quality, mozjpeg: true })
          .toBuffer();
        output_content_type = 'image/jpeg';
        output_format = 'jpeg';
        console.log(`   Compressing JPEG with quality ${config.jpeg_quality}`);
      } else if (content_type.includes('png')) {
        // Compress PNG
        output_buffer = await pipeline
          .png({ compressionLevel: config.png_compression })
          .toBuffer();
        output_content_type = 'image/png';
        output_format = 'png';
        console.log(`   Compressing PNG with level ${config.png_compression}`);
      } else if (content_type.includes('gif')) {
        // Pass through GIF (animated GIFs need special handling)
        output_buffer = await pipeline.toBuffer();
        output_content_type = 'image/gif';
        output_format = 'gif';
        console.log(`   Passing through GIF`);
      } else {
        // Default to WebP for unknown formats
        output_buffer = await pipeline
          .webp({ quality: config.webp_quality })
          .toBuffer();
        output_content_type = 'image/webp';
        output_format = 'webp';
        console.log(`   Converting unknown format to WebP`);
      }

      // Get output metadata
      const output_metadata = await sharp(output_buffer).metadata();
      const processing_time = Date.now() - start_time;
      const size_reduction = input_buffer.length - output_buffer.length;
      const reduction_percent = ((size_reduction / input_buffer.length) * 100).toFixed(1);

      const result = {
        buffer: output_buffer,
        content_type: output_content_type,
        format: output_format,
        original_size: input_buffer.length,
        optimized_size: output_buffer.length,
        size_reduction: size_reduction,
        reduction_percent: parseFloat(reduction_percent),
        original_dimensions: {
          width: metadata.width,
          height: metadata.height
        },
        optimized_dimensions: {
          width: output_metadata.width,
          height: output_metadata.height
        },
        processing_time_ms: processing_time
      };

      console.log(`✅ Image optimization complete:`);
      console.log(`   Optimized size: ${this.format_bytes(output_buffer.length)}`);
      console.log(`   Size reduction: ${this.format_bytes(size_reduction)} (${reduction_percent}%)`);
      console.log(`   Output dimensions: ${output_metadata.width}x${output_metadata.height}`);
      console.log(`   Processing time: ${processing_time}ms`);

      return result;

    } catch (error) {
      console.error('❌ Image optimization failed:', error.message);

      // Return original image if optimization fails
      return {
        buffer: input_buffer,
        content_type: content_type,
        format: content_type.split('/')[1] || 'unknown',
        original_size: input_buffer.length,
        optimized_size: input_buffer.length,
        size_reduction: 0,
        reduction_percent: 0,
        error: error.message,
        fallback: true
      };
    }
  }

  /**
   * Format bytes to human-readable string.
   * @param {number} bytes - Number of bytes
   * @returns {string} Formatted string (e.g., "1.5 MB")
   */
  format_bytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Create a thumbnail version of an image.
   *
   * @param {Buffer} input_buffer - Raw image data as Buffer
   * @param {number} max_dimension - Maximum width or height for thumbnail
   * @returns {Promise<Object>} Thumbnail result with buffer and metadata
   */
  async create_thumbnail(input_buffer, max_dimension = 200) {
    console.log(`📸 Creating thumbnail (max ${max_dimension}px)...`);

    try {
      const thumbnail_buffer = await sharp(input_buffer)
        .resize(max_dimension, max_dimension, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: 70 })
        .toBuffer();

      const metadata = await sharp(thumbnail_buffer).metadata();

      console.log(`✅ Thumbnail created: ${metadata.width}x${metadata.height}, ${this.format_bytes(thumbnail_buffer.length)}`);

      return {
        buffer: thumbnail_buffer,
        content_type: 'image/webp',
        width: metadata.width,
        height: metadata.height,
        size: thumbnail_buffer.length
      };
    } catch (error) {
      console.error('❌ Thumbnail creation failed:', error.message);
      throw error;
    }
  }
}

// Export singleton instance with default config
module.exports = new ImageOptimizer();

// Also export class for custom configurations
module.exports.ImageOptimizer = ImageOptimizer;

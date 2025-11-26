/**
 * JWT Service
 * @description Handles JWT token generation and verification
 */

const crypto = require('crypto');

// Configuration from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Parse duration string to milliseconds
 * @param {string} duration - Duration string like '24h', '7d', '30m'
 * @returns {number} - Duration in milliseconds
 */
function parse_duration(duration) {
  const match = duration.match(/^(\d+)([smhdw])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers = {
    's': 1000,                    // seconds
    'm': 60 * 1000,               // minutes
    'h': 60 * 60 * 1000,          // hours
    'd': 24 * 60 * 60 * 1000,     // days
    'w': 7 * 24 * 60 * 60 * 1000  // weeks
  };

  return value * multipliers[unit];
}

/**
 * Base64 URL encode
 * @param {string|Buffer} data - Data to encode
 * @returns {string} - Base64 URL encoded string
 */
function base64_url_encode(data) {
  const base64 = Buffer.isBuffer(data)
    ? data.toString('base64')
    : Buffer.from(JSON.stringify(data)).toString('base64');

  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Base64 URL decode
 * @param {string} str - Base64 URL encoded string
 * @returns {string} - Decoded string
 */
function base64_url_decode(str) {
  let base64 = str
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  // Add padding
  while (base64.length % 4) {
    base64 += '=';
  }

  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Create HMAC signature
 * @param {string} data - Data to sign
 * @param {string} secret - Secret key
 * @returns {string} - Base64 URL encoded signature
 */
function create_signature(data, secret) {
  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest();

  return base64_url_encode(signature);
}

/**
 * Generate JWT token
 * @param {Object} payload - Token payload
 * @param {Object} options - Token options
 * @returns {string} - JWT token
 */
function generate_token(payload, options = {}) {
  console.log(`🔐 Generating JWT token for user: ${payload.user_id}`);

  const expiresIn = options.expiresIn || JWT_EXPIRES_IN;
  const secret = options.secret || JWT_SECRET;

  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const exp = now + Math.floor(parse_duration(expiresIn) / 1000);

  const tokenPayload = {
    ...payload,
    iat: now,
    exp: exp,
    jti: crypto.randomBytes(16).toString('hex') // Unique token ID
  };

  const encodedHeader = base64_url_encode(header);
  const encodedPayload = base64_url_encode(tokenPayload);
  const signature = create_signature(`${encodedHeader}.${encodedPayload}`, secret);

  const token = `${encodedHeader}.${encodedPayload}.${signature}`;

  console.log(`✅ JWT token generated, expires at: ${new Date(exp * 1000).toISOString()}`);

  return token;
}

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @param {Object} options - Verification options
 * @returns {Object} - Decoded payload or null if invalid
 */
function verify_token(token, options = {}) {
  console.log(`🔍 Verifying JWT token`);

  const secret = options.secret || JWT_SECRET;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log(`❌ Invalid token format`);
      return null;
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    // Verify signature
    const expectedSignature = create_signature(`${encodedHeader}.${encodedPayload}`, secret);
    if (signature !== expectedSignature) {
      console.log(`❌ Invalid token signature`);
      return null;
    }

    // Decode payload
    const payload = JSON.parse(base64_url_decode(encodedPayload));

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      console.log(`❌ Token has expired`);
      return null;
    }

    console.log(`✅ Token verified for user: ${payload.user_id}`);
    return payload;
  } catch (error) {
    console.error(`❌ Token verification error: ${error.message}`);
    return null;
  }
}

/**
 * Generate access and refresh token pair
 * @param {Object} user - User object
 * @returns {Object} - Access token, refresh token, and expiry info
 */
function generate_token_pair(user) {
  console.log(`🔐 Generating token pair for user: ${user._id}`);

  const payload = {
    user_id: user._id.toString(),
    email: user.email,
    role: user.role,
    type: 'access'
  };

  const accessToken = generate_token(payload, { expiresIn: JWT_EXPIRES_IN });

  const refreshPayload = {
    user_id: user._id.toString(),
    type: 'refresh'
  };

  const refreshToken = generate_token(refreshPayload, { expiresIn: JWT_REFRESH_EXPIRES_IN });

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_in: Math.floor(parse_duration(JWT_EXPIRES_IN) / 1000),
    refresh_expires_in: Math.floor(parse_duration(JWT_REFRESH_EXPIRES_IN) / 1000)
  };
}

/**
 * Decode token without verification (for debugging)
 * @param {string} token - JWT token
 * @returns {Object} - Decoded header and payload
 */
function decode_token(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const header = JSON.parse(base64_url_decode(parts[0]));
    const payload = JSON.parse(base64_url_decode(parts[1]));

    return { header, payload };
  } catch (error) {
    return null;
  }
}

module.exports = {
  generate_token,
  verify_token,
  generate_token_pair,
  decode_token,
  parse_duration
};

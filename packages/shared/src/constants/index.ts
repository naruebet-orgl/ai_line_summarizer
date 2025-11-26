/**
 * Shared constants for LINE Chat Summarizer
 * @description Common configuration constants used across backend and frontend
 */

// Session configuration defaults
export const SESSION_DEFAULTS = {
  MAX_MESSAGES_PER_SESSION: 50,
  SESSION_TIMEOUT_HOURS: 24,
  MIN_MESSAGES_FOR_SUMMARY: 1,
} as const;

// Room types enum
export const ROOM_TYPES = {
  INDIVIDUAL: 'individual',
  GROUP: 'group',
} as const;

// Session status enum
export const SESSION_STATUS = {
  ACTIVE: 'active',
  CLOSED: 'closed',
  SUMMARIZING: 'summarizing',
} as const;

// Message types enum
export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  STICKER: 'sticker',
  FILE: 'file',
  LOCATION: 'location',
  AUDIO: 'audio',
  VIDEO: 'video',
} as const;

// Pagination defaults
export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 10000,
} as const;

// API paths
export const API_PATHS = {
  HEALTH: '/api/health',
  LINE_WEBHOOK: '/api/line/webhook',
  TRPC: '/api/trpc',
  DEBUG: '/api/debug',
} as const;

// Error codes
export const ERROR_CODES = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

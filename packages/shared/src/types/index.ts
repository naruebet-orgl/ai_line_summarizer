/**
 * Shared types for LINE Chat Summarizer
 * @description Common type definitions used across backend and frontend
 */

// Room types
export type RoomType = 'individual' | 'group';

// Session status types
export type SessionStatus = 'active' | 'closed' | 'summarizing';

// Message types
export interface MessageLog {
  message_id: string;
  user_id: string;
  user_name?: string;
  content: string;
  message_type: 'text' | 'image' | 'sticker' | 'file' | 'location' | 'audio' | 'video';
  timestamp: Date;
}

// Session summary
export interface SessionSummary {
  session_id: string;
  chat_session_id: string;
  line_room_id: string;
  room_name: string;
  room_type: RoomType;
  status: SessionStatus;
  message_count: number;
  has_summary: boolean;
  summary?: string;
  created_at: Date;
  updated_at: Date;
  closed_at?: Date;
}

// Room/Group summary
export interface RoomSummary {
  room_id: string;
  line_room_id: string;
  line_group_id?: string;
  name: string;
  group_name?: string;
  type: RoomType;
  is_active: boolean;
  statistics?: {
    total_messages: number;
    total_sessions: number;
  };
  last_activity_at?: Date;
  created_at: Date;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: PaginationMeta;
}

// LINE Webhook event types (simplified)
export interface LineWebhookEvent {
  type: string;
  timestamp: number;
  source: {
    type: 'user' | 'group' | 'room';
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
  replyToken?: string;
  message?: {
    type: string;
    id: string;
    text?: string;
  };
}

export interface LineWebhookPayload {
  destination: string;
  events: LineWebhookEvent[];
}

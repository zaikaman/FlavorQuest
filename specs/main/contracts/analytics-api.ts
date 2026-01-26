/**
 * Analytics API Type Definitions
 * 
 * Định nghĩa types cho API endpoints liên quan đến analytics logging
 */

import type { Database } from './database.types';
import type { Language } from './poi-api';

// Extract analytics log type từ Supabase generated types
export type AnalyticsLog = Database['public']['Tables']['analytics_logs']['Row'];
export type AnalyticsLogInsert = Database['public']['Tables']['analytics_logs']['Insert'];

/**
 * Event types cho analytics tracking
 */
export type EventType =
  | 'tour_start'       // User clicked "Start Tour" button
  | 'tour_end'         // User stopped tour or left page
  | 'auto_play'        // Audio tự động phát khi vào geofence
  | 'manual_play'      // User manually clicked play button
  | 'skip'             // User skipped audio trước khi nghe hết
  | 'settings_change'; // User changed settings

/**
 * Analytics event data structure
 */
export interface AnalyticsEvent {
  poi_id?: string;
  session_id: string;
  rounded_lat?: number; // Rounded to 2 decimals for privacy
  rounded_lng?: number; // Rounded to 2 decimals for privacy
  language?: Language;
  event_type: EventType;
  listen_duration?: number; // seconds
  completed?: boolean;
  timestamp?: Date; // Optional, defaults to NOW() on server
  user_agent?: string;
}

/**
 * POST /api/analytics
 * Log một analytics event (public, không cần auth)
 */
export interface LogAnalyticsRequest {
  events: AnalyticsEvent[]; // Batch logging support
}

export interface LogAnalyticsResponse {
  success: boolean;
  data?: {
    logged_count: number;
  };
  error?: string;
}

/**
 * GET /api/analytics/summary (Admin only)
 * Lấy analytics summary
 */
export interface GetAnalyticsSummaryRequest {
  start_date?: string; // ISO date string
  end_date?: string;   // ISO date string
  poi_id?: string;     // Filter by POI
}

export interface AnalyticsSummary {
  total_sessions: number;
  total_events: number;
  total_tours_started: number;
  total_tours_completed: number;
  average_tour_duration: number; // seconds
  
  // Per-event type counts
  event_counts: Record<EventType, number>;
  
  // Per-language breakdown
  language_breakdown: Record<Language, number>;
  
  // Top POIs by plays
  top_pois: Array<{
    poi_id: string;
    poi_name: string;
    play_count: number;
    avg_listen_duration: number;
    completion_rate: number; // 0-1
  }>;
  
  // Completion rates
  audio_completion_rate: number; // 0-1
  skip_rate: number; // 0-1
}

export interface GetAnalyticsSummaryResponse {
  success: boolean;
  data?: AnalyticsSummary;
  error?: string;
}

/**
 * GET /api/analytics/poi/:id (Admin only)
 * Lấy analytics chi tiết cho một POI
 */
export interface GetPOIAnalyticsRequest {
  poi_id: string;
  start_date?: string;
  end_date?: string;
}

export interface POIAnalytics {
  poi_id: string;
  poi_name: string;
  
  // Play stats
  total_plays: number;
  auto_plays: number;
  manual_plays: number;
  
  // Listen stats
  avg_listen_duration: number; // seconds
  completion_rate: number; // 0-1
  skip_rate: number; // 0-1
  
  // Per-language breakdown
  plays_by_language: Record<Language, number>;
  
  // Time series data (daily aggregates)
  daily_plays: Array<{
    date: string; // ISO date
    play_count: number;
  }>;
  
  // Heatmap data (rounded coordinates)
  location_heatmap: Array<{
    rounded_lat: number;
    rounded_lng: number;
    count: number;
  }>;
}

export interface GetPOIAnalyticsResponse {
  success: boolean;
  data?: POIAnalytics;
  error?: string;
}

/**
 * Helper function types
 */

/**
 * Round coordinates to 2 decimal places for privacy
 */
export function roundCoordinates(
  lat: number,
  lng: number
): [number, number];

/**
 * Generate or retrieve session ID
 */
export function getOrCreateSessionId(): Promise<string>;

/**
 * Log analytics event (fire-and-forget, không block UI)
 */
export function logEvent(event: AnalyticsEvent): void;

/**
 * Batch log multiple events
 */
export function logEventsBatch(events: AnalyticsEvent[]): Promise<void>;

/**
 * Calculate listen completion rate
 */
export function calculateCompletionRate(
  listen_duration: number,
  total_duration: number
): number;

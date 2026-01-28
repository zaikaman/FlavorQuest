/**
 * Analytics Service
 * Log events to Supabase analytics table
 * 
 * Features:
 * - Event logging với metadata
 * - Batch queuing cho offline support
 * - Privacy-aware (rounded GPS coordinates)
 * - Session tracking
 */

import { createClient } from '@/lib/supabase/client';
import type { Language, Coordinates } from '@/lib/types/index';
import type { Json } from '@/lib/types/database.types';
import { enqueueAnalytics, loadAnalyticsQueue, clearAnalyticsQueue } from '@/lib/services/storage';

export interface AnalyticsEventBase {
  event_type: 'tour_start' | 'tour_end' | 'auto_play' | 'manual_play' | 'skip' | 'settings_change';
  poi_id?: string;
  language?: Language;
  metadata?: Json;
  rounded_lat?: number;
  rounded_lng?: number;
  session_id?: string;
}

export interface AnalyticsEvent extends AnalyticsEventBase {
  timestamp: string;
}

// Round GPS coordinates to 3 decimal places (~111m precision) for privacy
function roundCoordinate(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Generate session ID (persistent across page reloads within same session)
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  let sessionId = sessionStorage.getItem('flavorquest_session_id');

  // Validate UUID format (simple check for 8-4-4-4-12 pattern)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!sessionId || !uuidRegex.test(sessionId)) {
    // Generate valid UUID
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      sessionId = crypto.randomUUID();
    } else {
      // Fallback for very old browsers (unlikely needed but safe)
      sessionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    sessionStorage.setItem('flavorquest_session_id', sessionId);
  }
  return sessionId;
}

/**
 * Log event to Supabase
 */
export async function logEvent(event: AnalyticsEventBase, coordinates?: Coordinates): Promise<void> {
  const timestamp = new Date().toISOString();
  const sessionId = getSessionId();

  const analyticsEvent: AnalyticsEvent = {
    ...event,
    timestamp,
    session_id: sessionId,
  };

  // Add rounded coordinates if provided
  if (coordinates) {
    analyticsEvent.rounded_lat = roundCoordinate(coordinates.lat);
    analyticsEvent.rounded_lng = roundCoordinate(coordinates.lng);
  }

  // Transform event to match database schema
  // Metadata is not a column, so we map specific fields to columns
  const { metadata, ...rest } = analyticsEvent;
  const dbEvent: any = { ...rest };

  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    const meta = metadata as Record<string, any>;

    // Map user_agent
    if (typeof meta.user_agent === 'string') {
      dbEvent.user_agent = meta.user_agent;
    }

    // Map audio metrics
    if (typeof meta.played_duration === 'number') {
      dbEvent.listen_duration = Math.round(meta.played_duration);
    }

    // Map completion status
    if (typeof meta.completion_percent === 'number') {
      // Consider completed if > 95% listened
      dbEvent.completed = meta.completion_percent > 95;
    }

    // For tour_end, we might want to store duration elsewhere, 
    // but the schema doesn't seem to have a generic duration column other than listen_duration.
    // If it's a tour_end event, listen_duration might be used for tour duration?
    // The comment says "Audio listen duration", so maybe not suitable for tour duration.
    // However, to avoid errors, we just won't try to insert unknown fields.
  }

  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('analytics_logs')
      .insert(dbEvent);

    if (error) {
      console.error('Failed to log analytics event:', JSON.stringify(error, null, 2));
      // Queue for later if network error
      const errorMsg = error.message || '';
      if (errorMsg.includes('fetch') || errorMsg.includes('network')) {
        const queueEvent = {
          id: crypto.randomUUID(),
          ...analyticsEvent,
          session_id: analyticsEvent.session_id || sessionId,
        };
        await enqueueAnalytics(queueEvent as any);
      }
    }
  } catch (error) {
    console.error('Analytics error:', error instanceof Error ? error.message : error);
    // Queue for offline sync
    const queueEvent = {
      id: crypto.randomUUID(),
      ...analyticsEvent,
      session_id: analyticsEvent.session_id || sessionId,
    };
    await enqueueAnalytics(queueEvent as any);
  }
}

/**
 * Log tour start event
 */
export async function logTourStart(language: Language, coordinates?: Coordinates): Promise<void> {
  return logEvent({
    event_type: 'tour_start',
    language,
    metadata: {
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      screen_size: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : '',
    } as Json,
  }, coordinates);
}

/**
 * Log auto play event
 */
export async function logAutoPlay(
  poiId: string,
  language: Language,
  coordinates?: Coordinates,
  metadata?: Json
): Promise<void> {
  return logEvent({
    event_type: 'auto_play',
    poi_id: poiId,
    language,
    metadata,
  }, coordinates);
}

/**
 * Log manual play event
 */
export async function logManualPlay(
  poiId: string,
  language: Language,
  metadata?: Json
): Promise<void> {
  return logEvent({
    event_type: 'manual_play',
    poi_id: poiId,
    language,
    metadata,
  });
}

/**
 * Log skip event
 */
export async function logSkip(
  poiId: string,
  language: Language,
  playedDuration: number,
  totalDuration: number
): Promise<void> {
  return logEvent({
    event_type: 'skip',
    poi_id: poiId,
    language,
    metadata: {
      played_duration: playedDuration,
      total_duration: totalDuration,
      completion_percent: Math.round((playedDuration / totalDuration) * 100),
    } as Json,
  });
}

/**
 * Log tour end event
 */
export async function logTourEnd(
  language: Language,
  duration: number,
  poisVisited: number,
  coordinates?: Coordinates
): Promise<void> {
  return logEvent({
    event_type: 'tour_end',
    language,
    metadata: {
      duration,
      pois_visited: poisVisited,
    } as Json,
  }, coordinates);
}

/**
 * Sync queued analytics events (offline → online)
 * Uses batch API endpoint for better reliability
 */
export async function syncQueuedEvents(): Promise<{ synced: number; failed: boolean }> {
  const queuedEvents = await loadAnalyticsQueue();

  if (queuedEvents.length === 0) {
    return { synced: 0, failed: false };
  }

  // Check if online
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.log('Offline, skipping sync');
    return { synced: 0, failed: true };
  }

  try {
    // Try batch API first (more reliable for offline sync)
    const response = await fetch('/api/analytics/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events: queuedEvents }),
    });

    if (response.ok) {
      await clearAnalyticsQueue();
      console.log(`Synced ${queuedEvents.length} analytics events via batch API`);
      return { synced: queuedEvents.length, failed: false };
    }

    // Fallback to direct Supabase insert
    const supabase = createClient();

    const { error } = await supabase
      .from('analytics_logs')
      .insert(queuedEvents);

    if (!error) {
      await clearAnalyticsQueue();
      console.log(`Synced ${queuedEvents.length} analytics events via Supabase`);
      return { synced: queuedEvents.length, failed: false };
    }

    console.error('Failed to sync analytics events:', error);
    return { synced: 0, failed: true };
  } catch (error) {
    console.error('Analytics sync error:', error);
    return { synced: 0, failed: true };
  }
}

/**
 * Get count of pending analytics events
 */
export async function getPendingEventsCount(): Promise<number> {
  const queue = await loadAnalyticsQueue();
  return queue.length;
}

/**
 * Register background sync for analytics (if supported)
 */
export async function registerAnalyticsBackgroundSync(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;
  if (!('sync' in ServiceWorkerRegistration.prototype)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    await (registration as any).sync.register('sync-analytics');
    return true;
  } catch (error) {
    console.error('Failed to register background sync:', error);
    return false;
  }
}

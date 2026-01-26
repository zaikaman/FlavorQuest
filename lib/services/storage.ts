/**
 * Offline Storage Service
 * 
 * Wrapper cho IndexedDB sử dụng idb-keyval library
 * Lưu trữ data offline để app hoạt động without network
 * 
 * Storage Keys:
 * - 'pois': Cached POI data từ Supabase
 * - 'user-settings': User preferences (language, volume, auto-mode, etc.)
 * - 'visit-history': List of visited POIs with timestamps
 * - 'cooldown-tracker': Last played timestamp per POI
 * - 'analytics-queue': Queued analytics events (sync khi online)
 * - 'last-sync': Timestamp of last successful sync
 * 
 * @see https://github.com/jakearchibald/idb-keyval
 */

import { get, set, del, clear, keys } from 'idb-keyval';
import type { POI, UserSettings, VisitHistoryEntry, CooldownRecord, AnalyticsLog } from '@/lib/types/index';

/**
 * Storage Keys
 */
export const STORAGE_KEYS = {
  POIS: 'pois',
  USER_SETTINGS: 'user-settings',
  VISIT_HISTORY: 'visit-history',
  COOLDOWN_TRACKER: 'cooldown-tracker',
  ANALYTICS_QUEUE: 'analytics-queue',
  LAST_SYNC: 'last-sync',
  LAST_POSITION: 'last-position',
  PRELOAD_STATUS: 'preload-status',
} as const;

/**
 * Type-safe storage operations
 */

// ========================================
// POIs Storage
// ========================================

/**
 * Save POIs to IndexedDB
 * Overwrite toàn bộ POI cache
 */
export async function savePOIs(pois: POI[]): Promise<void> {
  await set(STORAGE_KEYS.POIS, pois);
}

/**
 * Load POIs from IndexedDB
 * Return empty array nếu không có data
 */
export async function loadPOIs(): Promise<POI[]> {
  const pois = await get<POI[]>(STORAGE_KEYS.POIS);
  return pois ?? [];
}

/**
 * Clear POIs cache
 */
export async function clearPOIs(): Promise<void> {
  await del(STORAGE_KEYS.POIS);
}

// ========================================
// User Settings Storage
// ========================================

/**
 * Save user settings to IndexedDB
 */
export async function saveSettings(settings: UserSettings): Promise<void> {
  await set(STORAGE_KEYS.USER_SETTINGS, settings);
}

/**
 * Load user settings from IndexedDB
 * Return default settings nếu không có data
 */
export async function loadSettings(): Promise<UserSettings> {
  const settings = await get<UserSettings>(STORAGE_KEYS.USER_SETTINGS);
  
  // Default settings nếu chưa có
  if (!settings) {
    return {
      language: 'vi',
      volume: 0.8,
      autoPlayEnabled: true,
      geofenceRadius: 18,
      batterySaverMode: false,
      showNotifications: true,
      preferredMapZoom: 15,
    };
  }
  
  return settings;
}

/**
 * Update một phần settings (merge with existing)
 */
export async function updateSettings(partialSettings: Partial<UserSettings>): Promise<void> {
  const currentSettings = await loadSettings();
  const updatedSettings = { ...currentSettings, ...partialSettings };
  await saveSettings(updatedSettings);
}

/**
 * Clear user settings
 */
export async function clearSettings(): Promise<void> {
  await del(STORAGE_KEYS.USER_SETTINGS);
}

// ========================================
// Visit History Storage
// ========================================

/**
 * Save visit history entry
 * Append to existing history
 */
export async function saveVisit(entry: VisitHistoryEntry): Promise<void> {
  const history = await loadVisitHistory();
  history.push(entry);
  await set(STORAGE_KEYS.VISIT_HISTORY, history);
}

/**
 * Load visit history from IndexedDB
 * Return empty array nếu không có data
 */
export async function loadVisitHistory(): Promise<VisitHistoryEntry[]> {
  const history = await get<VisitHistoryEntry[]>(STORAGE_KEYS.VISIT_HISTORY);
  return history ?? [];
}

/**
 * Clear visit history
 */
export async function clearVisitHistory(): Promise<void> {
  await del(STORAGE_KEYS.VISIT_HISTORY);
}

/**
 * Get visited POI IDs (deduplicated)
 */
export async function getVisitedPOIIds(): Promise<string[]> {
  const history = await loadVisitHistory();
  const uniqueIds = new Set(history.map((entry) => entry.poi_id));
  return Array.from(uniqueIds);
}

// ========================================
// Cooldown Tracker Storage
// ========================================

/**
 * Save cooldown record for a POI
 * Track last played timestamp
 */
export async function saveCooldown(poiId: string, timestamp: number): Promise<void> {
  const tracker = await loadCooldownTracker();
  tracker[poiId] = timestamp;
  await set(STORAGE_KEYS.COOLDOWN_TRACKER, tracker);
}

/**
 * Load cooldown tracker from IndexedDB
 * Return empty object nếu không có data
 */
export async function loadCooldownTracker(): Promise<CooldownRecord> {
  const tracker = await get<CooldownRecord>(STORAGE_KEYS.COOLDOWN_TRACKER);
  return tracker ?? {};
}

/**
 * Get last played timestamp for a POI
 * Return null nếu chưa từng phát
 */
export async function getLastPlayed(poiId: string): Promise<number | null> {
  const tracker = await loadCooldownTracker();
  return tracker[poiId] ?? null;
}

/**
 * Clear cooldown tracker
 */
export async function clearCooldownTracker(): Promise<void> {
  await del(STORAGE_KEYS.COOLDOWN_TRACKER);
}

// ========================================
// Analytics Queue Storage
// ========================================

/**
 * Enqueue analytics event to sync khi online
 */
export async function enqueueAnalytics(event: AnalyticsLog): Promise<void> {
  const queue = await loadAnalyticsQueue();
  queue.push(event);
  await set(STORAGE_KEYS.ANALYTICS_QUEUE, queue);
}

/**
 * Load analytics queue from IndexedDB
 */
export async function loadAnalyticsQueue(): Promise<AnalyticsLog[]> {
  const queue = await get<AnalyticsLog[]>(STORAGE_KEYS.ANALYTICS_QUEUE);
  return queue ?? [];
}

/**
 * Clear analytics queue (sau khi sync thành công)
 */
export async function clearAnalyticsQueue(): Promise<void> {
  await del(STORAGE_KEYS.ANALYTICS_QUEUE);
}

/**
 * Remove specific events from queue (partial sync)
 */
export async function removeAnalyticsFromQueue(idsToRemove: string[]): Promise<void> {
  const queue = await loadAnalyticsQueue();
  const filtered = queue.filter((event) => !idsToRemove.includes(event.id));
  await set(STORAGE_KEYS.ANALYTICS_QUEUE, filtered);
}

// ========================================
// Last Sync Timestamp
// ========================================

/**
 * Save last sync timestamp
 */
export async function saveLastSync(timestamp: number): Promise<void> {
  await set(STORAGE_KEYS.LAST_SYNC, timestamp);
}

/**
 * Load last sync timestamp
 * Return null nếu chưa từng sync
 */
export async function loadLastSync(): Promise<number | null> {
  const timestamp = await get<number>(STORAGE_KEYS.LAST_SYNC);
  return timestamp ?? null;
}

// ========================================
// Last Position Storage (for GPS drift detection)
// ========================================

/**
 * Save last known position
 */
export async function saveLastPosition(position: GeolocationPosition): Promise<void> {
  await set(STORAGE_KEYS.LAST_POSITION, position);
}

/**
 * Load last known position
 */
export async function loadLastPosition(): Promise<GeolocationPosition | null> {
  const position = await get<GeolocationPosition>(STORAGE_KEYS.LAST_POSITION);
  return position ?? null;
}

// ========================================
// Preload Status (track audio/images preload progress)
// ========================================

export interface PreloadStatus {
  totalPOIs: number;
  preloadedPOIs: number;
  preloadedAudio: string[]; // POI IDs with preloaded audio
  preloadedImages: string[]; // POI IDs with preloaded images
  lastPreloadTime: number;
}

/**
 * Save preload status
 */
export async function savePreloadStatus(status: PreloadStatus): Promise<void> {
  await set(STORAGE_KEYS.PRELOAD_STATUS, status);
}

/**
 * Load preload status
 */
export async function loadPreloadStatus(): Promise<PreloadStatus | null> {
  const status = await get<PreloadStatus>(STORAGE_KEYS.PRELOAD_STATUS);
  return status ?? null;
}

// ========================================
// Global Operations
// ========================================

/**
 * Get all storage keys
 */
export async function getAllKeys(): Promise<string[]> {
  return await keys();
}

/**
 * Clear all storage (reset app state)
 * ⚠️ Warning: This will delete ALL offline data
 */
export async function clearAllStorage(): Promise<void> {
  await clear();
}

/**
 * Get storage size estimate (approximate)
 */
export async function getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage ?? 0,
      quota: estimate.quota ?? 0,
    };
  }
  return null;
}

/**
 * Check if storage is available
 */
export function isStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

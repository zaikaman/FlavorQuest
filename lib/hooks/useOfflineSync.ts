/**
 * useOfflineSync Hook
 * 
 * Detect online/offline status và sync data khi connection changes
 * 
 * Features:
 * - Detect network status changes
 * - Auto-sync queued analytics khi online
 * - Notify khi offline ready
 * - Track sync status
 * - Background sync registration
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  loadAnalyticsQueue,
  clearAnalyticsQueue,
  loadLastSync,
  saveLastSync,
  loadPOIs,
  savePOIs,
  loadPreloadStatus,
  type PreloadStatus,
} from '@/lib/services/storage';
import { createClient } from '@/lib/supabase/client';
import type { POI, AnalyticsLog } from '@/lib/types/index';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';
export type OfflineStatus = 'online' | 'offline' | 'checking';

export interface UseOfflineSyncOptions {
  /** Tự động sync khi online */
  autoSync?: boolean;
  /** Thời gian tối thiểu giữa các lần sync (ms) */
  syncThrottle?: number;
  /** Callback khi sync thành công */
  onSyncSuccess?: (syncedCount: number) => void;
  /** Callback khi sync thất bại */
  onSyncError?: (error: Error) => void;
  /** Callback khi trạng thái network thay đổi */
  onNetworkChange?: (isOnline: boolean) => void;
  /** Callback khi offline ready (POIs đã được cache) */
  onOfflineReady?: () => void;
}

const DEFAULT_OPTIONS: UseOfflineSyncOptions = {
  autoSync: true,
  syncThrottle: 5000, // 5 seconds
};

export interface UseOfflineSyncReturn {
  /** Trạng thái network hiện tại */
  isOnline: boolean;
  /** Trạng thái offline (online/offline/checking) */
  offlineStatus: OfflineStatus;
  /** Trạng thái sync */
  syncStatus: SyncStatus;
  /** Số lượng events đang chờ sync */
  pendingEventsCount: number;
  /** Thời điểm sync thành công lần cuối */
  lastSyncTime: number | null;
  /** App đã sẵn sàng offline chưa */
  isOfflineReady: boolean;
  /** Trạng thái preload */
  preloadStatus: PreloadStatus | null;
  /** Trigger manual sync */
  syncNow: () => Promise<void>;
  /** Refresh POI data từ server */
  refreshPOIs: () => Promise<POI[]>;
  /** Check trạng thái offline ready */
  checkOfflineReady: () => Promise<boolean>;
}

export function useOfflineSync(options: UseOfflineSyncOptions = {}): UseOfflineSyncReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // State
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return navigator.onLine;
  });
  const [offlineStatus, setOfflineStatus] = useState<OfflineStatus>('checking');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [pendingEventsCount, setPendingEventsCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const [preloadStatus, setPreloadStatus] = useState<PreloadStatus | null>(null);

  // Refs để tránh stale closures
  const lastSyncAttemptRef = useRef<number>(0);
  const isSyncingRef = useRef(false);

  /**
   * Load pending events count
   */
  const loadPendingCount = useCallback(async () => {
    try {
      const queue = await loadAnalyticsQueue();
      setPendingEventsCount(queue.length);
      return queue.length;
    } catch (error) {
      console.error('Failed to load pending events count:', error);
      return 0;
    }
  }, []);

  /**
   * Sync queued analytics events to Supabase
   */
  const syncAnalyticsEvents = useCallback(async (): Promise<number> => {
    const queue = await loadAnalyticsQueue();

    if (queue.length === 0) {
      return 0;
    }

    const supabase = createClient();

    // Transform queue items to match database schema
    const dbEvents = queue.map((event: AnalyticsLog) => ({
      poi_id: event.poi_id || null,
      session_id: event.session_id,
      rounded_lat: event.rounded_lat ?? null,
      rounded_lng: event.rounded_lng ?? null,
      language: event.language || null,
      event_type: event.event_type,
      listen_duration: event.listen_duration ?? null,
      completed: event.completed ?? null,
      user_agent: event.user_agent || null,
    }));

    const { error } = await supabase
      .from('analytics_logs')
      .insert(dbEvents);

    if (error) {
      throw new Error(`Failed to sync analytics: ${error.message}`);
    }

    // Clear synced events
    await clearAnalyticsQueue();

    return queue.length;
  }, []);

  /**
   * Sync all pending data
   */
  const syncNow = useCallback(async () => {
    // Throttle check
    const now = Date.now();
    if (now - lastSyncAttemptRef.current < opts.syncThrottle!) {
      console.log('Sync throttled, skipping...');
      return;
    }

    // Prevent concurrent syncs
    if (isSyncingRef.current) {
      console.log('Sync already in progress, skipping...');
      return;
    }

    // Check online status
    if (!navigator.onLine) {
      console.log('Offline, skipping sync...');
      return;
    }

    lastSyncAttemptRef.current = now;
    isSyncingRef.current = true;
    setSyncStatus('syncing');

    try {
      // Sync analytics events
      const syncedCount = await syncAnalyticsEvents();

      // Update last sync time
      await saveLastSync(now);
      setLastSyncTime(now);

      // Update pending count
      await loadPendingCount();

      setSyncStatus('success');
      opts.onSyncSuccess?.(syncedCount);

      // Reset status after short delay
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
      opts.onSyncError?.(error as Error);

      // Reset status after short delay
      setTimeout(() => setSyncStatus('idle'), 5000);
    } finally {
      isSyncingRef.current = false;
    }
  }, [opts, syncAnalyticsEvents, loadPendingCount]);

  /**
   * Refresh POI data from server
   */
  const refreshPOIs = useCallback(async (): Promise<POI[]> => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('pois')
      .select('*')
      .is('deleted_at', null)
      .order('priority', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch POIs: ${error.message}`);
    }

    const pois = (data || []) as POI[];

    // Save to IndexedDB
    await savePOIs(pois);

    return pois;
  }, []);

  /**
   * Check if app is ready for offline use
   */
  const checkOfflineReady = useCallback(async (): Promise<boolean> => {
    try {
      // Check if POIs are cached
      const cachedPOIs = await loadPOIs();
      if (!cachedPOIs || cachedPOIs.length === 0) {
        setIsOfflineReady(false);
        return false;
      }

      // Check preload status
      const status = await loadPreloadStatus();
      setPreloadStatus(status);

      // Check service worker registration
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (!registration.active) {
          setIsOfflineReady(false);
          return false;
        }
      }

      setIsOfflineReady(true);
      return true;
    } catch (error) {
      console.error('Failed to check offline ready:', error);
      setIsOfflineReady(false);
      return false;
    }
  }, []);

  /**
   * Register for background sync (if supported)
   */
  const registerBackgroundSync = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('sync' in ServiceWorkerRegistration.prototype)) {
      console.log('Background Sync not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register('sync-analytics');
      console.log('Background sync registered');
    } catch (error) {
      console.error('Failed to register background sync:', error);
    }
  }, []);

  /**
   * Handle online event
   */
  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setOfflineStatus('online');
    opts.onNetworkChange?.(true);

    // Auto sync when back online
    if (opts.autoSync) {
      syncNow();
    }
  }, [opts, syncNow]);

  /**
   * Handle offline event
   */
  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setOfflineStatus('offline');
    opts.onNetworkChange?.(false);

    // Register for background sync
    registerBackgroundSync();
  }, [opts, registerBackgroundSync]);

  // Initialize và listen to network events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Set initial state
    const online = navigator.onLine;
    setIsOnline(online);
    setOfflineStatus(online ? 'online' : 'offline');

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load initial data
    loadPendingCount();
    loadLastSync().then(setLastSyncTime);
    checkOfflineReady().then((ready) => {
      if (ready && opts.onOfflineReady) {
        opts.onOfflineReady();
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto sync on mount if online và có pending events
  useEffect(() => {
    if (opts.autoSync && isOnline && pendingEventsCount > 0) {
      syncNow();
    }
  }, [opts.autoSync, isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  // Periodically check pending count
  useEffect(() => {
    const interval = setInterval(() => {
      loadPendingCount();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [loadPendingCount]);

  return {
    isOnline,
    offlineStatus,
    syncStatus,
    pendingEventsCount,
    lastSyncTime,
    isOfflineReady,
    preloadStatus,
    syncNow,
    refreshPOIs,
    checkOfflineReady,
  };
}

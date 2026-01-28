/**
 * usePOIManager Hook
 * Fetch, cache, and filter POIs
 * 
 * Features:
 * - Fetch POIs from Supabase
 * - Cache POIs in IndexedDB
 * - Filter POIs by distance
 * - Localize POI content
 * - Offline-first strategy
 * - Audio preloading integration
 * - Background sync
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { POI, Language, Coordinates, LocalizedPOI } from '@/lib/types/index';
import { createClient } from '@/lib/supabase/client';
import { savePOIs, loadPOIs, saveLastSync, loadLastSync } from '@/lib/services/storage';
import { filterPOIsWithinRadius } from '@/lib/utils/distance';
import { getLocalizedPOI } from '@/lib/utils/localization';

export interface UsePOIManagerOptions {
  language?: Language;
  autoFetch?: boolean;
  cacheFirst?: boolean;
  /** Tự động preload audio cho nearby POIs */
  autoPreloadAudio?: boolean;
  /** Bán kính preload (meters) */
  preloadRadius?: number;
  /** Callback khi offline ready */
  onOfflineReady?: () => void;
  /** Callback khi có lỗi */
  onError?: (error: string) => void;
}

const DEFAULT_OPTIONS: UsePOIManagerOptions = {
  language: 'vi',
  autoFetch: true,
  cacheFirst: true,
  autoPreloadAudio: true,
  preloadRadius: 500,
};

export function usePOIManager(options: UsePOIManagerOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const [pois, setPOIs] = useState<POI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);

  // Track if we've triggered offline ready callback
  const offlineReadyTriggeredRef = useRef(false);

  // Fetch POIs from Supabase
  const fetchFromSupabase = useCallback(async (): Promise<POI[]> => {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('pois')
      .select('*')
      .is('deleted_at', null)
      .order('priority', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch POIs: ${error.message}`);
    }

    return (data || []) as POI[];
  }, []);

  // Load POIs with cache-first strategy
  const loadPOIsWithCache = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsOfflineMode(false);

    try {
      // Try cache first if enabled
      if (opts.cacheFirst) {
        const cachedPOIs = await loadPOIs();
        if (cachedPOIs && cachedPOIs.length > 0) {
          setPOIs(cachedPOIs);
          setIsLoading(false);
          
          // Check if we're online
          if (navigator.onLine) {
            // Fetch in background to update cache
            fetchFromSupabase()
              .then(async (freshPOIs) => {
                await savePOIs(freshPOIs);
                await saveLastSync(Date.now());
                setPOIs(freshPOIs);
                setLastFetchTime(Date.now());
              })
              .catch((err) => {
                console.warn('Background fetch failed:', err);
              });
          } else {
            setIsOfflineMode(true);
            const lastSync = await loadLastSync();
            setLastFetchTime(lastSync);
          }
          
          return;
        }
      }

      // Fetch from network
      const fetchedPOIs = await fetchFromSupabase();
      await savePOIs(fetchedPOIs);
      await saveLastSync(Date.now());
      setPOIs(fetchedPOIs);
      setLastFetchTime(Date.now());
    } catch (err) {
      const errorMessage = (err as Error).message;
      
      // Try loading from cache as fallback
      try {
        const cachedPOIs = await loadPOIs();
        if (cachedPOIs && cachedPOIs.length > 0) {
          setPOIs(cachedPOIs);
          setIsOfflineMode(true);
          setError('Đang sử dụng dữ liệu đã lưu (chế độ ngoại tuyến)');
          
          const lastSync = await loadLastSync();
          setLastFetchTime(lastSync);
          
          // Notify offline mode but with data
          if (!offlineReadyTriggeredRef.current) {
            offlineReadyTriggeredRef.current = true;
            opts.onOfflineReady?.();
          }
        } else {
          setError(errorMessage);
          opts.onError?.(errorMessage);
        }
      } catch (cacheErr) {
        console.error('Failed to load from cache:', cacheErr);
        setError(errorMessage);
        opts.onError?.(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [opts.cacheFirst, fetchFromSupabase, opts]);

  // Refetch POIs (bypass cache)
  const refetch = useCallback(async () => {
    if (!navigator.onLine) {
      setError('Không có kết nối mạng');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fetchedPOIs = await fetchFromSupabase();
      await savePOIs(fetchedPOIs);
      await saveLastSync(Date.now());
      setPOIs(fetchedPOIs);
      setLastFetchTime(Date.now());
      setIsOfflineMode(false);
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      opts.onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFromSupabase, opts]);

  // Preload audio for nearby POIs
  const preloadNearbyAudio = useCallback(async (position: Coordinates) => {
    if (!opts.autoPreloadAudio || pois.length === 0) return;

    try {
      setIsPreloading(true);
      
      // Dynamically import to avoid SSR issues
      const { audioPreloader } = await import('@/lib/services/audio-preloader');
      
      await audioPreloader.preload(pois, {
        language: opts.language!,
        currentPosition: position,
        preloadRadius: opts.preloadRadius,
        onProgress: (progress) => {
          setPreloadProgress(progress.percent);
        },
        onComplete: () => {
          setIsPreloading(false);
          setPreloadProgress(100);
          
          // Notify offline ready
          if (!offlineReadyTriggeredRef.current) {
            offlineReadyTriggeredRef.current = true;
            opts.onOfflineReady?.();
          }
        },
        onError: (error) => {
          console.error('Preload error:', error);
          setIsPreloading(false);
        },
      });
    } catch (error) {
      console.error('Failed to preload audio:', error);
      setIsPreloading(false);
    }
  }, [opts.autoPreloadAudio, opts.language, opts.preloadRadius, opts.onOfflineReady, pois]);

  // Preload all audio (for manual trigger)
  const preloadAllAudio = useCallback(async () => {
    if (pois.length === 0) return;

    try {
      setIsPreloading(true);
      
      const { audioPreloader } = await import('@/lib/services/audio-preloader');
      
      await audioPreloader.preload(pois, {
        language: opts.language!,
        preloadAll: true,
        onProgress: (progress) => {
          setPreloadProgress(progress.percent);
        },
        onComplete: () => {
          setIsPreloading(false);
          setPreloadProgress(100);
          
          if (!offlineReadyTriggeredRef.current) {
            offlineReadyTriggeredRef.current = true;
            opts.onOfflineReady?.();
          }
        },
        onError: (error) => {
          console.error('Preload error:', error);
          setIsPreloading(false);
        },
      });
    } catch (error) {
      console.error('Failed to preload all audio:', error);
      setIsPreloading(false);
    }
  }, [pois, opts.language, opts.onOfflineReady]);

  // Get localized POIs
  const getLocalizedPOIs = useCallback((lang: Language = opts.language!): LocalizedPOI[] => {
    return pois.map((poi) => getLocalizedPOI(poi, lang));
  }, [pois, opts.language]);

  // Filter POIs within radius
  const filterNearby = useCallback((position: Coordinates, radiusMeters: number = 500): POI[] => {
    return filterPOIsWithinRadius<POI>(position, pois, radiusMeters).map(item => item.poi);
  }, [pois]);

  // Get POI by ID
  const getPOIById = useCallback((id: string): POI | undefined => {
    return pois.find((poi) => poi.id === id);
  }, [pois]);

  // Initialize
  useEffect(() => {
    if (opts.autoFetch) {
      loadPOIsWithCache();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOfflineMode(false);
      // Optionally refetch when back online
      if (pois.length > 0) {
        refetch();
      }
    };

    const handleOffline = () => {
      setIsOfflineMode(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pois.length, refetch]);

  return {
    pois,
    localizedPOIs: getLocalizedPOIs(),
    isLoading,
    error,
    lastFetchTime,
    isOfflineMode,
    isPreloading,
    preloadProgress,
    refetch,
    getLocalizedPOIs,
    filterNearby,
    getPOIById,
    preloadNearbyAudio,
    preloadAllAudio,
  };
}

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

const POI_SELECT_FIELDS = `
  id,
  lat,
  lng,
  radius,
  priority,
  name_vi,
  name_en,
  name_ja,
  name_fr,
  name_ko,
  name_zh,
  description_vi,
  description_en,
  description_ja,
  description_fr,
  description_ko,
  description_zh,
  audio_url_vi,
  audio_url_en,
  audio_url_ja,
  audio_url_fr,
  audio_url_ko,
  audio_url_zh,
  image_url,
  signature_dish,
  category_tags,
  fun_fact,
  estimated_hours,
  owner_id,
  created_at,
  updated_at,
  deleted_at
`.replace(/\s+/g, ' ').trim();
const POI_MEMORY_CACHE_TTL_MS = 60_000;

let poiMemoryCache: { data: POI[]; cachedAt: number } | null = null;
let poiInFlightPromise: Promise<POI[]> | null = null;

export function usePOIManager(options: UsePOIManagerOptions = {}) {
  const language = options.language ?? DEFAULT_OPTIONS.language ?? 'vi';
  const autoFetch = options.autoFetch ?? DEFAULT_OPTIONS.autoFetch ?? true;
  const cacheFirst = options.cacheFirst ?? DEFAULT_OPTIONS.cacheFirst ?? true;
  const autoPreloadAudio = options.autoPreloadAudio ?? DEFAULT_OPTIONS.autoPreloadAudio ?? true;
  const preloadRadius = options.preloadRadius ?? DEFAULT_OPTIONS.preloadRadius ?? 500;
  const onOfflineReady = options.onOfflineReady;
  const onError = options.onError;
  
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
    if (poiMemoryCache && Date.now() - poiMemoryCache.cachedAt < POI_MEMORY_CACHE_TTL_MS) {
      return poiMemoryCache.data;
    }

    if (poiInFlightPromise) {
      return poiInFlightPromise;
    }

    const supabase = createClient();

    poiInFlightPromise = (async () => {
      const { data, error } = await supabase
        .from('pois')
        .select(POI_SELECT_FIELDS)
        .is('deleted_at', null)
        .order('priority', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch POIs: ${error.message}`);
      }

      const nextData = (data ?? []) as unknown as POI[];
      poiMemoryCache = {
        data: nextData,
        cachedAt: Date.now(),
      };

      return nextData;
    })();

    try {
      return await poiInFlightPromise;
    } finally {
      poiInFlightPromise = null;
    }
  }, []);

  // Load POIs with cache-first strategy
  const loadPOIsWithCache = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsOfflineMode(false);

    try {
      // Try cache first if enabled
      if (cacheFirst) {
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
      poiMemoryCache = {
        data: fetchedPOIs,
        cachedAt: Date.now(),
      };
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
            onOfflineReady?.();
          }
        } else {
          setError(errorMessage);
          onError?.(errorMessage);
        }
      } catch (cacheErr) {
        console.error('Failed to load from cache:', cacheErr);
        setError(errorMessage);
        onError?.(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [cacheFirst, fetchFromSupabase, onError, onOfflineReady]);

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
      poiMemoryCache = {
        data: fetchedPOIs,
        cachedAt: Date.now(),
      };
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFromSupabase, onError]);

  // Preload audio for nearby POIs
  const preloadNearbyAudio = useCallback(async (position: Coordinates) => {
    if (!autoPreloadAudio || pois.length === 0) return;

    try {
      setIsPreloading(true);
      
      // Dynamically import to avoid SSR issues
      const { audioPreloader } = await import('@/lib/services/audio-preloader');
      
      await audioPreloader.preload(pois, {
        language,
        currentPosition: position,
        preloadRadius,
        onProgress: (progress) => {
          setPreloadProgress(progress.percent);
        },
        onComplete: () => {
          setIsPreloading(false);
          setPreloadProgress(100);
          
          // Notify offline ready
          if (!offlineReadyTriggeredRef.current) {
            offlineReadyTriggeredRef.current = true;
            onOfflineReady?.();
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
  }, [autoPreloadAudio, language, onOfflineReady, pois, preloadRadius]);

  // Preload all audio (for manual trigger)
  const preloadAllAudio = useCallback(async () => {
    if (pois.length === 0) return;

    try {
      setIsPreloading(true);
      
      const { audioPreloader } = await import('@/lib/services/audio-preloader');
      
      await audioPreloader.preload(pois, {
        language,
        preloadAll: true,
        onProgress: (progress) => {
          setPreloadProgress(progress.percent);
        },
        onComplete: () => {
          setIsPreloading(false);
          setPreloadProgress(100);
          
          if (!offlineReadyTriggeredRef.current) {
            offlineReadyTriggeredRef.current = true;
            onOfflineReady?.();
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
  }, [language, onOfflineReady, pois]);

  const preloadAllAssets = useCallback(async () => {
    if (pois.length === 0) return;

    try {
      setIsPreloading(true);
      setPreloadProgress(0);

      const { audioPreloader } = await import('@/lib/services/audio-preloader');

      await audioPreloader.preload(pois, {
        language,
        preloadAll: true,
        onProgress: (progress) => {
          setPreloadProgress(Math.round(progress.percent * 0.7));
        },
        onError: (error) => {
          console.error('Audio preload error:', error);
        },
      });

      await audioPreloader.preloadImages(pois, {
        onProgress: (progress) => {
          const imageProgress = Math.round(progress.percent * 0.3);
          setPreloadProgress(70 + imageProgress);
        },
      });

      setIsPreloading(false);
      setPreloadProgress(100);

      if (!offlineReadyTriggeredRef.current) {
        offlineReadyTriggeredRef.current = true;
        onOfflineReady?.();
      }
    } catch (error) {
      console.error('Failed to preload all assets:', error);
      setIsPreloading(false);
    }
  }, [language, onOfflineReady, pois]);

  // Get localized POIs
  const getLocalizedPOIs = useCallback((lang: Language = language): LocalizedPOI[] => {
    return pois.map((poi) => getLocalizedPOI(poi, lang));
  }, [language, pois]);

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
    if (autoFetch) {
      void loadPOIsWithCache();
    }
  }, [autoFetch, loadPOIsWithCache]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOfflineMode(false);
      // Optionally refetch when back online
      if (pois.length > 0) {
        void refetch();
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
    preloadAllAssets,
  };
}

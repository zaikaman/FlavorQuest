'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Tour } from '@/lib/types/index';
import { loadTours, saveTours } from '@/lib/services/storage';

export interface UseTourManagerOptions {
  autoFetch?: boolean;
  cacheFirst?: boolean;
  onError?: (error: string) => void;
}

const DEFAULT_OPTIONS: UseTourManagerOptions = {
  autoFetch: true,
  cacheFirst: true,
};

const TOUR_MEMORY_CACHE_TTL_MS = 60_000;

let toursMemoryCache: { data: Tour[]; cachedAt: number } | null = null;
let toursInFlightPromise: Promise<Tour[]> | null = null;

export function useTourManager(options: UseTourManagerOptions = {}) {
  const autoFetch = options.autoFetch ?? DEFAULT_OPTIONS.autoFetch ?? true;
  const cacheFirst = options.cacheFirst ?? DEFAULT_OPTIONS.cacheFirst ?? true;
  const onError = options.onError;

  const [tours, setTours] = useState<Tour[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);

  const updateMemoryCache = useCallback((nextTours: Tour[]) => {
    toursMemoryCache = {
      data: nextTours,
      cachedAt: Date.now(),
    };
  }, []);

  const fetchFromApi = useCallback(async (): Promise<Tour[]> => {
    if (toursMemoryCache && Date.now() - toursMemoryCache.cachedAt < TOUR_MEMORY_CACHE_TTL_MS) {
      return toursMemoryCache.data;
    }

    if (toursInFlightPromise) {
      return toursInFlightPromise;
    }

    toursInFlightPromise = (async () => {
      const response = await fetch('/api/tours');

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Không thể tải danh sách tour');
      }

      const nextData = (await response.json()) as Tour[];
      updateMemoryCache(nextData);
      return nextData;
    })();

    try {
      return await toursInFlightPromise;
    } finally {
      toursInFlightPromise = null;
    }
  }, [updateMemoryCache]);

  const loadToursWithCache = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsOfflineMode(false);

    try {
      if (cacheFirst) {
        const cachedTours = await loadTours();
        if (cachedTours.length > 0) {
          setTours(cachedTours);
          setIsLoading(false);

          if (navigator.onLine) {
            fetchFromApi()
              .then(async (freshTours) => {
                await saveTours(freshTours);
                setTours(freshTours);
                setLastFetchTime(Date.now());
                updateMemoryCache(freshTours);
              })
              .catch((fetchError) => {
                console.warn('[useTourManager] Background fetch failed:', fetchError);
              });
          } else {
            setIsOfflineMode(true);
          }

          return;
        }
      }

      const fetchedTours = await fetchFromApi();
      await saveTours(fetchedTours);
      setTours(fetchedTours);
      setLastFetchTime(Date.now());
      updateMemoryCache(fetchedTours);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : 'Không thể tải danh sách tour';

      try {
        const cachedTours = await loadTours();
        if (cachedTours.length > 0) {
          setTours(cachedTours);
          setIsOfflineMode(true);
          setError('Đang sử dụng danh sách tour đã lưu');
        } else {
          setError(message);
          onError?.(message);
        }
      } catch (cacheError) {
        console.error('[useTourManager] Cache fallback failed:', cacheError);
        setError(message);
        onError?.(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [cacheFirst, fetchFromApi, onError, updateMemoryCache]);

  const refetch = useCallback(async () => {
    if (!navigator.onLine) {
      setError('Không có kết nối mạng');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fetchedTours = await fetchFromApi();
      await saveTours(fetchedTours);
      setTours(fetchedTours);
      setLastFetchTime(Date.now());
      setIsOfflineMode(false);
      updateMemoryCache(fetchedTours);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : 'Không thể tải danh sách tour';
      setError(message);
      onError?.(message);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFromApi, onError, updateMemoryCache]);

  useEffect(() => {
    if (autoFetch) {
      void loadToursWithCache();
    }
  }, [autoFetch, loadToursWithCache]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOfflineMode(false);
      void refetch();
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
  }, [refetch]);

  return {
    tours,
    isLoading,
    error,
    isOfflineMode,
    lastFetchTime,
    refetch,
  };
}

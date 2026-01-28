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
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { POI, Language, Coordinates, LocalizedPOI } from '@/lib/types/index';
import { createClient } from '@/lib/supabase/client';
import { savePOIs, loadPOIs } from '@/lib/services/storage';
import { filterPOIsWithinRadius } from '@/lib/utils/distance';
import { getLocalizedPOI } from '@/lib/utils/localization';

export interface UsePOIManagerOptions {
  language?: Language;
  autoFetch?: boolean;
  cacheFirst?: boolean;
}

const DEFAULT_OPTIONS: UsePOIManagerOptions = {
  language: 'vi',
  autoFetch: true,
  cacheFirst: true,
};

export function usePOIManager(options: UsePOIManagerOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const [pois, setPOIs] = useState<POI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);

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

    try {
      // Try cache first if enabled
      if (opts.cacheFirst) {
        const cachedPOIs = await loadPOIs();
        if (cachedPOIs && cachedPOIs.length > 0) {
          setPOIs(cachedPOIs);
          setIsLoading(false);
          
          // Fetch in background to update cache
          fetchFromSupabase()
            .then(async (freshPOIs) => {
              await savePOIs(freshPOIs);
              setPOIs(freshPOIs);
              setLastFetchTime(Date.now());
            })
            .catch((err) => {
              console.warn('Background fetch failed:', err);
            });
          
          return;
        }
      }

      // Fetch from network
      const fetchedPOIs = await fetchFromSupabase();
      await savePOIs(fetchedPOIs);
      setPOIs(fetchedPOIs);
      setLastFetchTime(Date.now());
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      
      // Try loading from cache as fallback
      try {
        const cachedPOIs = await loadPOIs();
        if (cachedPOIs && cachedPOIs.length > 0) {
          setPOIs(cachedPOIs);
          setError('Using cached data (offline mode)');
        }
      } catch (cacheErr) {
        console.error('Failed to load from cache:', cacheErr);
      }
    } finally {
      setIsLoading(false);
    }
  }, [opts.cacheFirst, fetchFromSupabase]);

  // Refetch POIs (bypass cache)
  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const fetchedPOIs = await fetchFromSupabase();
      await savePOIs(fetchedPOIs);
      setPOIs(fetchedPOIs);
      setLastFetchTime(Date.now());
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFromSupabase]);

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
  }, [opts.autoFetch, loadPOIsWithCache]);

  return {
    pois,
    localizedPOIs: getLocalizedPOIs(),
    isLoading,
    error,
    lastFetchTime,
    refetch,
    getLocalizedPOIs,
    filterNearby,
    getPOIById,
  };
}

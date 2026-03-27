/**
 * useGeolocation Hook
 * Wrapper cho navigator.geolocation.watchPosition
 *
 * Features:
 * - Real-time GPS tracking
 * - Error handling
 * - Permission status tracking
 * - Automatic cleanup
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Coordinates } from '@/lib/types/index';

export interface GeolocationState {
  coordinates: Coordinates | null;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: number | null;
  error: GeolocationPositionError | null;
  isLoading: boolean;
  permissionState: 'prompt' | 'granted' | 'denied' | null;
}

export interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
}

const DEFAULT_OPTIONS: UseGeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
  watch: true,
};

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const enableHighAccuracy = options.enableHighAccuracy ?? DEFAULT_OPTIONS.enableHighAccuracy;
  const timeout = options.timeout ?? DEFAULT_OPTIONS.timeout;
  const maximumAge = options.maximumAge ?? DEFAULT_OPTIONS.maximumAge;
  const watch = options.watch ?? DEFAULT_OPTIONS.watch;

  // State for accuracy mode (allow fallback to low accuracy)
  const [useHighAccuracy, setUseHighAccuracy] = useState(enableHighAccuracy);

  const [state, setState] = useState<GeolocationState>({
    coordinates: null,
    accuracy: null,
    speed: null,
    heading: null,
    timestamp: null,
    error: null,
    isLoading: true,
    permissionState: null,
  });

  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    setUseHighAccuracy(enableHighAccuracy);
  }, [enableHighAccuracy]);

  // Check permission status
  const checkPermission = useCallback(async () => {
    if (!('permissions' in navigator)) {
      return;
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      setState((prev) => ({
        ...prev,
        permissionState: result.state as 'prompt' | 'granted' | 'denied',
      }));

      // Listen for permission changes
      result.addEventListener('change', () => {
        setState((prev) => ({
          ...prev,
          permissionState: result.state as 'prompt' | 'granted' | 'denied',
        }));
      });
    } catch (error) {
      console.warn('Permission API not supported:', error);
    }
  }, []);

  // Success callback
  const onSuccess = useCallback((position: GeolocationPosition) => {
    console.log('[useGeolocation] success:', {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      speed: position.coords.speed,
      heading: position.coords.heading,
      timestamp: position.timestamp,
      highAccuracy: useHighAccuracy,
    });

    setState({
      coordinates: {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      },
      accuracy: position.coords.accuracy,
      speed: position.coords.speed,
      heading: position.coords.heading,
      timestamp: position.timestamp,
      error: null,
      isLoading: false,
      permissionState: 'granted',
    });
  }, []);

  // Error callback
  const onError = useCallback(
    (error: GeolocationPositionError) => {
      console.warn('[useGeolocation] error:', {
        code: error.code,
        message: error.message,
        highAccuracy: useHighAccuracy,
      });

      // If timeout (code 3) and using high accuracy, try falling back to low accuracy
      if (error.code === 3 && useHighAccuracy) {
        console.warn('Geolocation timed out, falling back to low accuracy...');
        setUseHighAccuracy(false);
        setState((prev) => ({ ...prev, error: null, isLoading: true })); // Clear error and set loading
        return;
      }

      setState((prev) => ({
        ...prev,
        error,
        isLoading: false,
        permissionState: error.code === error.PERMISSION_DENIED ? 'denied' : prev.permissionState,
      }));
    },
    [useHighAccuracy]
  );

  // Start watching position
  const startWatching = useCallback(() => {
    if (!('geolocation' in navigator)) {
      onError({
        code: 2,
        message: 'Geolocation is not supported by this browser.',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError);
      return;
    }

    if (watchIdRef.current !== null) {
      // Clear existing watch if we are restarting (e.g., changing accuracy)
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    // Use longer timeout for low accuracy mode (20s) to give it a fair chance
    const watchOptions = {
      enableHighAccuracy: useHighAccuracy,
      timeout: useHighAccuracy ? timeout : 20000,
      maximumAge,
    };

    console.log('[useGeolocation] start watching:', {
      watch,
      enableHighAccuracy: watchOptions.enableHighAccuracy,
      timeout: watchOptions.timeout,
      maximumAge: watchOptions.maximumAge,
    });

    if (watch) {
      watchIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, watchOptions);
    } else {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, watchOptions);
    }
  }, [maximumAge, onError, onSuccess, timeout, useHighAccuracy, watch]);

  // Stop watching position
  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Initialize
  useEffect(() => {
    const initTimer = window.setTimeout(() => {
      void checkPermission();
      startWatching();
    }, 0);

    return () => {
      window.clearTimeout(initTimer);
      stopWatching();
    };
  }, [checkPermission, startWatching, stopWatching]);

  return {
    ...state,
    startWatching,
    stopWatching,
    refetch: startWatching,
  };
}

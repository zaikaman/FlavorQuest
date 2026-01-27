/**
 * Geolocation Service
 * Browser API wrapper cho GPS tracking
 * 
 * Exports:
 * - getCurrentPosition: Get current GPS position
 * - watchPosition: Watch position changes
 * - clearWatch: Stop watching
 * - checkPermission: Check geolocation permission status
 */

import type { Coordinates } from '@/lib/types/index';

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export const DEFAULT_GEOLOCATION_OPTIONS: GeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
};

/**
 * Get current position once
 */
export async function getCurrentPosition(
  options: GeolocationOptions = DEFAULT_GEOLOCATION_OPTIONS
): Promise<GeolocationPosition> {
  if (!('geolocation' in navigator)) {
    throw new Error('Geolocation is not supported by this browser');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

/**
 * Watch position changes
 */
export function watchPosition(
  onSuccess: (position: GeolocationPosition) => void,
  onError: (error: GeolocationPositionError) => void,
  options: GeolocationOptions = DEFAULT_GEOLOCATION_OPTIONS
): number {
  if (!('geolocation' in navigator)) {
    throw new Error('Geolocation is not supported by this browser');
  }

  return navigator.geolocation.watchPosition(onSuccess, onError, options);
}

/**
 * Stop watching position
 */
export function clearWatch(watchId: number): void {
  if ('geolocation' in navigator) {
    navigator.geolocation.clearWatch(watchId);
  }
}

/**
 * Check geolocation permission status
 */
export async function checkPermission(): Promise<PermissionState | null> {
  if (!('permissions' in navigator)) {
    return null;
  }

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return result.state;
  } catch (error) {
    console.warn('Permission API not supported:', error);
    return null;
  }
}

/**
 * Request geolocation permission (triggers browser prompt)
 */
export async function requestPermission(): Promise<boolean> {
  try {
    await getCurrentPosition();
    return true;
  } catch (error) {
    const geoError = error as GeolocationPositionError;
    if (geoError.code === geoError.PERMISSION_DENIED) {
      return false;
    }
    throw error;
  }
}

/**
 * Convert GeolocationPosition to Coordinates
 */
export function toCoordinates(position: GeolocationPosition): Coordinates {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
  };
}

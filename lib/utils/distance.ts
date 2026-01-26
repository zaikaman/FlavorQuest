/**
 * Haversine Distance Calculator
 * 
 * Tính khoảng cách giữa 2 tọa độ GPS sử dụng công thức Haversine
 * 
 * Độ chính xác: ~1-3 meters (đủ cho geofencing)
 * Performance: ~0.01ms per calculation
 * 
 * @see https://en.wikipedia.org/wiki/Haversine_formula
 */

import type { Coordinates } from '@/lib/types/index';

/**
 * Earth radius in meters (mean radius)
 */
const EARTH_RADIUS_METERS = 6371000;

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * 
 * Formula:
 * a = sin²(Δφ/2) + cos(φ1) * cos(φ2) * sin²(Δλ/2)
 * c = 2 * atan2(√a, √(1−a))
 * d = R * c
 * 
 * Where:
 * - φ = latitude in radians
 * - λ = longitude in radians
 * - R = Earth radius
 * 
 * @param from - Starting coordinates {lat, lng}
 * @param to - Destination coordinates {lat, lng}
 * @returns Distance in meters
 * 
 * @example
 * ```ts
 * const userPos = { lat: 10.759, lng: 106.705 };
 * const poiPos = { lat: 10.760, lng: 106.706 };
 * const distance = calculateDistance(userPos, poiPos);
 * console.log(distance); // ~150 meters
 * ```
 */
export function calculateDistance(from: Coordinates, to: Coordinates): number {
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);

  // Haversine formula
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = EARTH_RADIUS_METERS * c;

  return distance;
}

/**
 * Check if coordinates are within a certain radius (geofencing check)
 * 
 * @param from - Starting coordinates
 * @param to - Destination coordinates
 * @param radius - Radius in meters
 * @returns True if within radius
 * 
 * @example
 * ```ts
 * const userPos = { lat: 10.759, lng: 106.705 };
 * const poiPos = { lat: 10.760, lng: 106.706 };
 * const isNear = isWithinRadius(userPos, poiPos, 200);
 * console.log(isNear); // true (distance ~150m < 200m)
 * ```
 */
export function isWithinRadius(from: Coordinates, to: Coordinates, radius: number): boolean {
  const distance = calculateDistance(from, to);
  return distance <= radius;
}

/**
 * Find nearest POI from user position
 * 
 * @param userPos - User's current position
 * @param pois - Array of POIs with coordinates
 * @returns Nearest POI and distance, or null if no POIs
 * 
 * @example
 * ```ts
 * const userPos = { lat: 10.759, lng: 106.705 };
 * const pois = [
 *   { id: '1', lat: 10.760, lng: 106.706, name: 'POI 1' },
 *   { id: '2', lat: 10.758, lng: 106.704, name: 'POI 2' },
 * ];
 * const nearest = findNearestPOI(userPos, pois);
 * console.log(nearest); // { poi: {...}, distance: 150 }
 * ```
 */
export function findNearestPOI<T extends { lat: number; lng: number }>(
  userPos: Coordinates,
  pois: T[]
): { poi: T; distance: number } | null {
  if (pois.length === 0) {
    return null;
  }

  let nearestPOI: T = pois[0]!; // Non-null assertion: length check guarantees pois[0] exists
  let minDistance = calculateDistance(userPos, { lat: nearestPOI.lat, lng: nearestPOI.lng });

  for (let i = 1; i < pois.length; i++) {
    const poi = pois[i]!; // Non-null assertion: loop guarantees valid index
    const distance = calculateDistance(userPos, { lat: poi.lat, lng: poi.lng });

    if (distance < minDistance) {
      minDistance = distance;
      nearestPOI = poi;
    }
  }

  return { poi: nearestPOI, distance: minDistance };
}

/**
 * Filter POIs within a certain radius from user position
 * 
 * @param userPos - User's current position
 * @param pois - Array of POIs with coordinates
 * @param radius - Radius in meters
 * @returns Array of POIs with distances
 * 
 * @example
 * ```ts
 * const userPos = { lat: 10.759, lng: 106.705 };
 * const pois = [...];
 * const nearby = filterPOIsWithinRadius(userPos, pois, 500);
 * console.log(nearby); // [{ poi: {...}, distance: 150 }, { poi: {...}, distance: 300 }]
 * ```
 */
export function filterPOIsWithinRadius<T extends { lat: number; lng: number }>(
  userPos: Coordinates,
  pois: T[],
  radius: number
): Array<{ poi: T; distance: number }> {
  const results: Array<{ poi: T; distance: number }> = [];

  for (const poi of pois) {
    const distance = calculateDistance(userPos, { lat: poi.lat, lng: poi.lng });

    if (distance <= radius) {
      results.push({ poi, distance });
    }
  }

  // Sort by distance (nearest first)
  results.sort((a, b) => a.distance - b.distance);

  return results;
}

/**
 * Calculate bearing between two points (direction in degrees)
 * 
 * @param from - Starting coordinates
 * @param to - Destination coordinates
 * @returns Bearing in degrees (0-360, 0 = North, 90 = East, 180 = South, 270 = West)
 * 
 * @example
 * ```ts
 * const from = { lat: 10.759, lng: 106.705 };
 * const to = { lat: 10.760, lng: 106.706 };
 * const bearing = calculateBearing(from, to);
 * console.log(bearing); // ~45 degrees (Northeast)
 * ```
 */
export function calculateBearing(from: Coordinates, to: Coordinates): number {
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const deltaLng = toRadians(to.lng - from.lng);

  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

  const bearingRadians = Math.atan2(y, x);
  const bearingDegrees = (bearingRadians * 180) / Math.PI;

  // Normalize to 0-360
  return (bearingDegrees + 360) % 360;
}

/**
 * Get compass direction from bearing
 * 
 * @param bearing - Bearing in degrees (0-360)
 * @returns Compass direction (N, NE, E, SE, S, SW, W, NW)
 * 
 * @example
 * ```ts
 * const direction = getCompassDirection(45);
 * console.log(direction); // "NE"
 * ```
 */
export function getCompassDirection(bearing: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index] ?? 'N'; // Fallback to 'N' if undefined
}

/**
 * Format distance for display (human-readable)
 * 
 * @param meters - Distance in meters
 * @param locale - Locale for number formatting (default: 'vi-VN')
 * @returns Formatted string (e.g., "150 m", "1.5 km")
 * 
 * @example
 * ```ts
 * console.log(formatDistance(150)); // "150 m"
 * console.log(formatDistance(1500)); // "1.5 km"
 * console.log(formatDistance(12345)); // "12.3 km"
 * ```
 */
export function formatDistance(meters: number, locale: string = 'vi-VN'): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  const kilometers = meters / 1000;
  return `${kilometers.toLocaleString(locale, { maximumFractionDigits: 1 })} km`;
}

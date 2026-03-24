/**
 * Geofencing Web Worker
 * 
 * Offload geofencing calculations to background thread
 * Prevents blocking main thread khi check multiple POIs
 * 
 * Features:
 * - Distance calculations in background
 * - POI proximity detection
 * - Cooldown checking
 * - Stable sorting for simultaneous POI triggers
 * 
 * Communication:
 * - postMessage: Send data to worker
 * - onmessage: Receive results from worker
 * 
 * Browser Support:
 * - Chrome/Edge: ✅ Full support
 * - Firefox: ✅ Full support
 * - Safari: ✅ Full support
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
 */

import type { Coordinates, POI } from '@/lib/types/index';
import { calculateDistance, filterPOIsWithinRadius } from '@/lib/utils/distance';

/**
 * Message types từ main thread
 */
type WorkerRequest =
  | {
    type: 'CHECK_GEOFENCE';
    requestId: number;
    payload: {
      userPosition: Coordinates;
      pois: POI[];
      geofenceRadius: number;
      cooldownTracker: Record<string, number>;
      cooldownPeriod: number;
    };
  }
  | {
    type: 'CALCULATE_DISTANCE';
    requestId: number;
    payload: {
      from: Coordinates;
      to: Coordinates;
    };
  }
  | {
    type: 'FILTER_NEARBY';
    requestId: number;
    payload: {
      userPosition: Coordinates;
      pois: POI[];
      radius: number;
    };
  };

/**
 * Response types trả về main thread
 */
type WorkerResponse =
  | {
    type: 'GEOFENCE_RESULT';
    requestId: number;
    payload: {
      triggeredPOIs: Array<{
        poi: POI;
        distance: number;
      }>;
      nearbyPOIs: Array<{
        poi: POI;
        distance: number;
      }>;
    };
  }
  | {
    type: 'DISTANCE_RESULT';
    requestId: number;
    payload: {
      distance: number;
    };
  }
  | {
    type: 'NEARBY_POIS';
    requestId: number;
    payload: {
      pois: Array<{
        poi: POI;
        distance: number;
      }>;
    };
  }
  | {
    type: 'ERROR';
    requestId: number;
    payload: {
      message: string;
    };
  };

function createErrorResponse(requestId: number, message: string): WorkerResponse {
  return {
    type: 'ERROR',
    requestId,
    payload: { message },
  };
}

function isValidPOI(poi: POI): boolean {
  return Number.isFinite(poi.lat) && Number.isFinite(poi.lng);
}

function sortTriggeredPOIs(
  a: { poi: POI; distance: number },
  b: { poi: POI; distance: number }
): number {
  if (a.distance !== b.distance) {
    return a.distance - b.distance;
  }

  const radiusA = a.poi.radius ?? 0;
  const radiusB = b.poi.radius ?? 0;
  if (radiusA !== radiusB) {
    return radiusA - radiusB;
  }

  const nameComparison = a.poi.name_vi.localeCompare(b.poi.name_vi, 'vi');
  if (nameComparison !== 0) {
    return nameComparison;
  }

  return a.poi.id.localeCompare(b.poi.id);
}

/**
 * Check if POI can be played (not in cooldown)
 */
function canPlayPOI(
  poiId: string,
  cooldownTracker: Record<string, number>,
  cooldownPeriod: number
): boolean {
  const lastPlayed = cooldownTracker[poiId];

  if (!lastPlayed) {
    return true; // Never played
  }

  const now = Date.now();
  const timeSinceLastPlay = now - lastPlayed;

  return timeSinceLastPlay >= cooldownPeriod;
}

/**
 * Process geofence check
 */
function processGeofenceCheck(request: WorkerRequest): WorkerResponse {
  if (request.type !== 'CHECK_GEOFENCE') {
    return createErrorResponse(request.requestId, 'Invalid request type');
  }

  const { requestId } = request;
  const { userPosition, pois, geofenceRadius, cooldownTracker, cooldownPeriod } = request.payload;

  try {
    const validPOIs = pois.filter(isValidPOI);
    const safeGeofenceRadius = Math.max(1, geofenceRadius);

    // Filter POIs within geofence radius
    const nearbyPOIs = filterPOIsWithinRadius(
      userPosition,
      validPOIs,
      safeGeofenceRadius * 2 // Check wider area for "nearby" list
    );

    // Filter POIs that triggered geofence (within radius + not in cooldown)
    const triggeredPOIs = nearbyPOIs
      .filter(({ poi, distance }: { poi: POI; distance: number }) => {
        // Check if within POI's own radius
        return distance <= Math.max(poi.radius || 0, safeGeofenceRadius);
      })
      .filter(({ poi }: { poi: POI; distance: number }) => {
        // Check cooldown
        return canPlayPOI(poi.id, cooldownTracker, cooldownPeriod);
      })
      .sort(sortTriggeredPOIs);

    return {
      type: 'GEOFENCE_RESULT',
      requestId,
      payload: {
        triggeredPOIs,
        nearbyPOIs,
      },
    };
  } catch (error) {
    return createErrorResponse(
      requestId,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Process distance calculation
 */
function processDistanceCalculation(request: WorkerRequest): WorkerResponse {
  if (request.type !== 'CALCULATE_DISTANCE') {
    return createErrorResponse(request.requestId, 'Invalid request type');
  }

  const { requestId } = request;
  const { from, to } = request.payload;

  try {
    const distance = calculateDistance(from, to);

    return {
      type: 'DISTANCE_RESULT',
      requestId,
      payload: { distance },
    };
  } catch (error) {
    return createErrorResponse(
      requestId,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Process nearby POIs filter
 */
function processNearbyFilter(request: WorkerRequest): WorkerResponse {
  if (request.type !== 'FILTER_NEARBY') {
    return createErrorResponse(request.requestId, 'Invalid request type');
  }

  const { requestId } = request;
  const { userPosition, pois, radius } = request.payload;

  try {
    const nearbyPOIs = filterPOIsWithinRadius(userPosition, pois.filter(isValidPOI), radius);

    return {
      type: 'NEARBY_POIS',
      requestId,
      payload: { pois: nearbyPOIs },
    };
  } catch (error) {
    return createErrorResponse(
      requestId,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Main message handler
 */
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  const requestId = request.requestId;

  let response: WorkerResponse;

  switch (request.type) {
    case 'CHECK_GEOFENCE':
      response = processGeofenceCheck(request);
      break;

    case 'CALCULATE_DISTANCE':
      response = processDistanceCalculation(request);
      break;

    case 'FILTER_NEARBY':
      response = processNearbyFilter(request);
      break;

    default:
      response = createErrorResponse(requestId, 'Unknown request type');
  }

  self.postMessage(response);
};

/**
 * Export types for main thread
 */
export type { WorkerRequest, WorkerResponse };

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
 * - Priority sorting
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
    payload: {
      from: Coordinates;
      to: Coordinates;
    };
  }
  | {
    type: 'FILTER_NEARBY';
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
    payload: {
      distance: number;
    };
  }
  | {
    type: 'NEARBY_POIS';
    payload: {
      pois: Array<{
        poi: POI;
        distance: number;
      }>;
    };
  }
  | {
    type: 'ERROR';
    payload: {
      message: string;
    };
  };

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
    return {
      type: 'ERROR',
      payload: { message: 'Invalid request type' },
    };
  }

  const { userPosition, pois, geofenceRadius, cooldownTracker, cooldownPeriod } = request.payload;

  try {
    // Filter POIs within geofence radius
    const nearbyPOIs = filterPOIsWithinRadius(
      userPosition,
      pois,
      geofenceRadius * 2 // Check wider area for "nearby" list
    );

    // Filter POIs that triggered geofence (within radius + not in cooldown)
    const triggeredPOIs = nearbyPOIs
      .filter(({ poi, distance }: { poi: POI; distance: number }) => {
        // Check if within POI's own radius
        return distance <= Math.max(poi.radius || 0, geofenceRadius);
      })
      .filter(({ poi }: { poi: POI; distance: number }) => {
        // Check cooldown
        return canPlayPOI(poi.id, cooldownTracker, cooldownPeriod);
      })
      .sort((a: { poi: POI; distance: number }, b: { poi: POI; distance: number }) => {
        // Sort by priority (higher first), then distance (closer first)
        if (a.poi.priority !== b.poi.priority) {
          return b.poi.priority - a.poi.priority;
        }
        return a.distance - b.distance;
      });

    return {
      type: 'GEOFENCE_RESULT',
      payload: {
        triggeredPOIs,
        nearbyPOIs,
      },
    };
  } catch (error) {
    return {
      type: 'ERROR',
      payload: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Process distance calculation
 */
function processDistanceCalculation(request: WorkerRequest): WorkerResponse {
  if (request.type !== 'CALCULATE_DISTANCE') {
    return {
      type: 'ERROR',
      payload: { message: 'Invalid request type' },
    };
  }

  const { from, to } = request.payload;

  try {
    const distance = calculateDistance(from, to);

    return {
      type: 'DISTANCE_RESULT',
      payload: { distance },
    };
  } catch (error) {
    return {
      type: 'ERROR',
      payload: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Process nearby POIs filter
 */
function processNearbyFilter(request: WorkerRequest): WorkerResponse {
  if (request.type !== 'FILTER_NEARBY') {
    return {
      type: 'ERROR',
      payload: { message: 'Invalid request type' },
    };
  }

  const { userPosition, pois, radius } = request.payload;

  try {
    const nearbyPOIs = filterPOIsWithinRadius(userPosition, pois, radius);

    return {
      type: 'NEARBY_POIS',
      payload: { pois: nearbyPOIs },
    };
  } catch (error) {
    return {
      type: 'ERROR',
      payload: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Main message handler
 */
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

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
      response = {
        type: 'ERROR',
        payload: { message: 'Unknown request type' },
      };
  }

  self.postMessage(response);
};

/**
 * Export types for main thread
 */
export type { WorkerRequest, WorkerResponse };

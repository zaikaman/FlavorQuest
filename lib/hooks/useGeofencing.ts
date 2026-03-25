/**
 * useGeofencing Hook
 * Web Worker integration cho distance checking
 *
 * Features:
 * - Offload distance calculations to Web Worker
 * - Monitor POI proximity
 * - Trigger callbacks khi enter/exit geofence
 * - Keep results stable near geofence boundaries
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Coordinates, POI } from '@/lib/types/index';
import { GEOFENCE_TRIGGER_RADIUS_M } from '@/lib/constants/index';
import { filterPOIsWithinRadius } from '@/lib/utils/distance';

export interface GeofenceEvent {
  poi: POI;
  distance: number;
  timestamp: number;
}

export interface UseGeofencingOptions {
  radius?: number;
  enabled?: boolean;
  onEnter?: (event: GeofenceEvent) => void;
  onExit?: (event: GeofenceEvent) => void;
}

const DEFAULT_OPTIONS: UseGeofencingOptions = {
  radius: GEOFENCE_TRIGGER_RADIUS_M,
  enabled: true,
};

const EXIT_BUFFER_METERS = 6;

type WorkerPOIEntry = {
  poi: POI;
  distance: number;
};

type GeofenceWorkerResponse =
  | {
      type: 'GEOFENCE_RESULT';
      requestId: number;
      payload: {
        triggeredPOIs: WorkerPOIEntry[];
        nearbyPOIs: WorkerPOIEntry[];
      };
    }
  | {
      type: 'NEARBY_POIS';
      requestId: number;
      payload: {
        pois: WorkerPOIEntry[];
      };
    }
  | {
      type: 'ERROR';
      requestId: number;
      payload: {
        message: string;
      };
    };

function isValidPOI(poi: POI): boolean {
  return Number.isFinite(poi.lat) && Number.isFinite(poi.lng);
}

function sortTriggeredEntries(a: WorkerPOIEntry, b: WorkerPOIEntry): number {
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

function flattenEntries(entries: WorkerPOIEntry[]): Array<POI & { distance: number }> {
  return entries.map(({ poi, distance }) => ({
    ...poi,
    distance,
  }));
}

function processGeofenceLocally(
  currentPosition: Coordinates,
  pois: POI[],
  radius: number
): { nearbyPOIs: WorkerPOIEntry[]; triggeredPOIs: WorkerPOIEntry[] } {
  const safeRadius = Math.max(1, radius);
  const validPOIs = pois.filter(isValidPOI);
  const nearbyPOIs = filterPOIsWithinRadius(currentPosition, validPOIs, safeRadius * 2);
  const triggeredPOIs = nearbyPOIs
    .filter(({ poi, distance }) => distance <= Math.max(poi.radius || 0, safeRadius))
    .sort(sortTriggeredEntries);

  return { nearbyPOIs, triggeredPOIs };
}

export function useGeofencing(
  currentPosition: Coordinates | null,
  pois: POI[],
  options: UseGeofencingOptions = {}
) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const [nearbyPOIs, setNearbyPOIs] = useState<Array<POI & { distance: number }>>([]);
  const [activePOIs, setActivePOIs] = useState<Set<string>>(new Set());

  const workerRef = useRef<Worker | null>(null);
  const previousActivePOIsRef = useRef<Set<string>>(new Set());
  const latestRequestIdRef = useRef(0);
  const optionsRef = useRef(opts);
  const onEnterRef = useRef(opts.onEnter);
  const onExitRef = useRef(opts.onExit);
  const poisRef = useRef(pois);

  useEffect(() => {
    optionsRef.current = opts;
    onEnterRef.current = opts.onEnter;
    onExitRef.current = opts.onExit;
    poisRef.current = pois;
  }, [opts, pois]);

  const resetState = useCallback(() => {
    previousActivePOIsRef.current = new Set();
    setNearbyPOIs([]);
    setActivePOIs(new Set());
  }, []);

  const reconcileGeofenceResult = useCallback(
    (result: { nearbyPOIs: WorkerPOIEntry[]; triggeredPOIs: WorkerPOIEntry[] }) => {
      const flattenedNearby = flattenEntries(result.nearbyPOIs);
      const previousActive = previousActivePOIsRef.current;
      const nextActive = new Set<string>();
      const distanceByPoiId = new Map(flattenedNearby.map((poi) => [poi.id, poi.distance]));
      const onEnter = onEnterRef.current;
      const onExit = onExitRef.current;
      const radius = optionsRef.current.radius ?? GEOFENCE_TRIGGER_RADIUS_M;
      const currentPOIs = poisRef.current;

      result.triggeredPOIs.forEach(({ poi }) => {
        nextActive.add(poi.id);
      });

      previousActive.forEach((poiId) => {
        if (nextActive.has(poiId)) {
          return;
        }

        const latestDistance = distanceByPoiId.get(poiId);
        if (latestDistance !== undefined && latestDistance <= radius + EXIT_BUFFER_METERS) {
          nextActive.add(poiId);
        }
      });

      setNearbyPOIs(flattenedNearby);
      setActivePOIs(nextActive);

      if (onEnter) {
        if (result.triggeredPOIs.length > 0) {
          console.log(
            '[useGeofencing] triggered POIs:',
            result.triggeredPOIs.map(({ poi, distance }) => ({
              id: poi.id,
              name: poi.name_vi,
              distance: Math.round(distance),
              poiRadius: poi.radius,
              effectiveRadius: Math.max(poi.radius || 0, radius),
            }))
          );
        }

        result.triggeredPOIs.forEach(({ poi, distance }) => {
          if (previousActive.has(poi.id)) {
            return;
          }

          onEnter({
            poi,
            distance,
            timestamp: Date.now(),
          });
        });
      }

      if (onExit) {
        if (previousActive.size > 0 && previousActive.size !== nextActive.size) {
          console.log('[useGeofencing] active POIs updated:', {
            previous: Array.from(previousActive),
            next: Array.from(nextActive),
          });
        }

        previousActive.forEach((poiId) => {
          if (nextActive.has(poiId)) {
            return;
          }

          const poi = currentPOIs.find((item) => item.id === poiId);
          if (!poi) {
            return;
          }

          onExit({
            poi,
            distance: distanceByPoiId.get(poiId) ?? radius + EXIT_BUFFER_METERS,
            timestamp: Date.now(),
          });
        });
      }

      previousActivePOIsRef.current = nextActive;
    },
    []
  );

  // Initialize Web Worker
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      workerRef.current = new Worker(new URL('@/lib/workers/geofence.worker.ts', import.meta.url));

      workerRef.current.onmessage = (event: MessageEvent<GeofenceWorkerResponse>) => {
        const response = event.data;

        if (response.requestId !== latestRequestIdRef.current) {
          return;
        }

        if (!optionsRef.current.enabled) {
          return;
        }

        if (response.type === 'ERROR') {
          console.error('Geofence worker error:', response.payload.message);
          return;
        }

        if (response.type === 'GEOFENCE_RESULT') {
          reconcileGeofenceResult(response.payload);
          return;
        }

        if (response.type === 'NEARBY_POIS') {
          setNearbyPOIs(flattenEntries(response.payload.pois));
        }
      };

      workerRef.current.onerror = (error) => {
        console.error('Geofence worker error:', error.message || error);
      };
    } catch (error) {
      console.error('Failed to initialize geofence worker:', error);
    }

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [reconcileGeofenceResult]);

  // Send position updates to worker, or fall back to local processing
  useEffect(() => {
    if (!currentPosition || !opts.enabled || pois.length === 0) {
      console.log('[useGeofencing] reset state:', {
        hasPosition: Boolean(currentPosition),
        enabled: opts.enabled,
        poiCount: pois.length,
      });
      resetState();
      return;
    }

    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    const previewNearby = filterPOIsWithinRadius(
      currentPosition,
      pois.filter(isValidPOI),
      Math.max(25, (opts.radius ?? GEOFENCE_TRIGGER_RADIUS_M) * 4)
    )
      .slice(0, 3)
      .map(({ poi, distance }) => ({
        id: poi.id,
        name: poi.name_vi,
        distance: Math.round(distance),
        poiRadius: poi.radius,
      }));

    console.log('[useGeofencing] check request:', {
      requestId,
      position: currentPosition,
      radius: opts.radius ?? GEOFENCE_TRIGGER_RADIUS_M,
      poiCount: pois.length,
      previewNearby,
    });

    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'CHECK_GEOFENCE',
        requestId,
        payload: {
          userPosition: currentPosition,
          pois,
          geofenceRadius: opts.radius ?? GEOFENCE_TRIGGER_RADIUS_M,
          cooldownTracker: {},
          cooldownPeriod: 0,
        },
      });
      return;
    }

    reconcileGeofenceResult(
      processGeofenceLocally(currentPosition, pois, opts.radius ?? GEOFENCE_TRIGGER_RADIUS_M)
    );
  }, [currentPosition, opts.enabled, opts.radius, pois, reconcileGeofenceResult, resetState]);

  const checkDistance = useCallback(
    (poi: POI): number | null => {
      if (!currentPosition) {
        return null;
      }

      const poiWithDistance = nearbyPOIs.find((item) => item.id === poi.id);
      return poiWithDistance?.distance ?? null;
    },
    [currentPosition, nearbyPOIs]
  );

  const isNearby = useCallback((poi: POI): boolean => activePOIs.has(poi.id), [activePOIs]);

  return {
    nearbyPOIs,
    activePOIs: Array.from(activePOIs),
    checkDistance,
    isNearby,
  };
}

/**
 * useGeofencing Hook
 * Web Worker integration cho distance checking
 * 
 * Features:
 * - Offload distance calculations to Web Worker
 * - Monitor POI proximity
 * - Trigger callbacks khi enter/exit geofence
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Coordinates, POI } from '@/lib/types/index';
import { GEOFENCE_TRIGGER_RADIUS_M } from '@/lib/constants/index';

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
  const onEnterRef = useRef(opts.onEnter);
  const onExitRef = useRef(opts.onExit);
  const poisRef = useRef(pois);

  // Update refs when callbacks or pois change
  useEffect(() => {
    onEnterRef.current = opts.onEnter;
    onExitRef.current = opts.onExit;
    poisRef.current = pois;
  }, [opts.onEnter, opts.onExit, pois]);

  // Initialize Web Worker
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      workerRef.current = new Worker(new URL('@/lib/workers/geofence.worker.ts', import.meta.url));
      
      workerRef.current.onmessage = (e: MessageEvent) => {
        const { type, payload } = e.data;
        
        if (type === 'NEARBY_POIS') {
          const poisWithDistance = payload as Array<POI & { distance: number }>;
          setNearbyPOIs(poisWithDistance);
          
          // Update active POIs
          const newActivePOIs = new Set(poisWithDistance.map((p: POI) => p.id));
          setActivePOIs(newActivePOIs);
          
          // Detect enter/exit events
          const onEnter = onEnterRef.current;
          const onExit = onExitRef.current;
          const currentPOIs = poisRef.current;
          
          if (onEnter || onExit) {
            const previousActive = previousActivePOIsRef.current;
            
            // Check for new POIs (enter events)
            poisWithDistance.forEach((poi: POI & { distance: number }) => {
              if (!previousActive.has(poi.id) && onEnter) {
                onEnter({
                  poi,
                  distance: poi.distance,
                  timestamp: Date.now(),
                });
              }
            });
            
            // Check for left POIs (exit events)
            if (onExit) {
              previousActive.forEach((poiId: string) => {
                if (!newActivePOIs.has(poiId)) {
                  const poi = currentPOIs.find((p: POI) => p.id === poiId);
                  if (poi) {
                    onExit({
                      poi,
                      distance: opts.radius!,
                      timestamp: Date.now(),
                    });
                  }
                }
              });
            }
            
            previousActivePOIsRef.current = newActivePOIs;
          }
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Chỉ initialize một lần

  // Send position updates to worker
  useEffect(() => {
    if (!workerRef.current || !currentPosition || !opts.enabled || pois.length === 0) {
      return;
    }

    workerRef.current.postMessage({
      type: 'CHECK_GEOFENCE',
      payload: {
        position: currentPosition,
        pois,
        radius: opts.radius,
      },
    });
  }, [currentPosition, pois, opts.enabled, opts.radius]);

  const checkDistance = useCallback((poi: POI): number | null => {
    if (!currentPosition) return null;
    
    const poisWithDistance = nearbyPOIs.find((p: POI & { distance: number }) => p.id === poi.id);
    return poisWithDistance?.distance ?? null;
  }, [currentPosition, nearbyPOIs]);

  const isNearby = useCallback((poi: POI): boolean => {
    return activePOIs.has(poi.id);
  }, [activePOIs]);

  return {
    nearbyPOIs,
    activePOIs: Array.from(activePOIs),
    checkDistance,
    isNearby,
  };
}

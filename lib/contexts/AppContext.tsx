/**
 * App Context
 * 
 * Global application state management
 * 
 * Features:
 * - Tour state (active, paused, stopped)
 * - Auto mode toggle
 * - Current POI tracking
 * - Audio player state
 * - Geolocation state
 * - Offline status
 * 
 * Use this context for state that needs to be shared across multiple components
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { POI, AudioPlayerStatus, GeolocationState } from '@/lib/types/index';

/**
 * Tour state
 */
export type TourState = 'idle' | 'active' | 'paused' | 'stopped';

/**
 * App context value
 */
interface AppContextValue {
  // Tour state
  tourState: TourState;
  setTourState: (state: TourState) => void;

  // Auto mode
  autoMode: boolean;
  setAutoMode: (enabled: boolean) => Promise<void>;

  // Current POI
  currentPOI: POI | null;
  setCurrentPOI: (poi: POI | null) => void;

  // Audio player
  audioStatus: AudioPlayerStatus;
  setAudioStatus: (status: AudioPlayerStatus) => void;

  // Geolocation
  geolocationState: GeolocationState;
  setGeolocationState: (state: GeolocationState) => void;

  // Offline status
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;

  // Nearby POIs (for UI)
  nearbyPOIs: POI[];
  setNearbyPOIs: (pois: POI[]) => void;

  // Battery optimization mode
  batteryMode: 'normal' | 'low-power' | 'critical';
  setBatteryMode: (mode: 'normal' | 'low-power' | 'critical') => void;
}

/**
 * App context
 */
const AppContext = createContext<AppContextValue | undefined>(undefined);

/**
 * App Provider Props
 */
interface AppProviderProps {
  children: React.ReactNode;
}

/**
 * App Provider Component
 * 
 * @example
 * ```tsx
 * // In app/layout.tsx
 * import { AppProvider } from '@/lib/contexts/AppContext';
 * 
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <AppProvider>
 *           {children}
 *         </AppProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function AppProvider({ children }: AppProviderProps) {
  // Tour state
  const [tourState, setTourState] = useState<TourState>('idle');

  // Auto mode (load from IndexedDB in useEffect)
  const [autoMode, setAutoModeState] = useState(true);

  // Current POI being narrated
  const [currentPOI, setCurrentPOI] = useState<POI | null>(null);

  // Audio player status
  const [audioStatus, setAudioStatus] = useState<AudioPlayerStatus>({
    state: 'idle',
    currentItem: null,
    queue: [],
    volume: 0.8,
    currentTime: 0,
    duration: 0,
    isLoading: false,
    error: null,
  });

  // Geolocation state
  const [geolocationState, setGeolocationState] = useState<GeolocationState>({
    status: 'requesting',
    error: undefined,
  });

  // Online/offline status
  const [isOnline, setIsOnline] = useState(true);

  // Nearby POIs (within 500m)
  const [nearbyPOIs, setNearbyPOIs] = useState<POI[]>([]);

  // Battery mode
  const [batteryMode, setBatteryMode] = useState<'normal' | 'low-power' | 'critical'>('normal');

  // Load auto mode from storage on mount
  useEffect(() => {
    const loadAutoMode = async () => {
      try {
        const { loadSettings } = await import('@/lib/services/storage');
        const settings = await loadSettings();
        setAutoModeState(settings.autoPlayEnabled);
      } catch (error) {
        console.error('Failed to load auto mode from storage:', error);
      }
    };

    loadAutoMode();
  }, []);

  // Listen to online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Set auto mode and persist to storage
   */
  const setAutoMode = useCallback(async (enabled: boolean) => {
    try {
      setAutoModeState(enabled);

      // Persist to IndexedDB
      const { updateSettings } = await import('@/lib/services/storage');
      await updateSettings({ autoPlayEnabled: enabled });
    } catch (error) {
      console.error('Failed to save auto mode to storage:', error);
      // Still update state even if storage fails
      setAutoModeState(enabled);
    }
  }, []);

  const value: AppContextValue = {
    tourState,
    setTourState,
    autoMode,
    setAutoMode,
    currentPOI,
    setCurrentPOI,
    audioStatus,
    setAudioStatus,
    geolocationState,
    setGeolocationState,
    isOnline,
    setIsOnline,
    nearbyPOIs,
    setNearbyPOIs,
    batteryMode,
    setBatteryMode,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/**
 * useApp Hook
 * 
 * @example
 * ```tsx
 * 'use client';
 * import { useApp } from '@/lib/contexts/AppContext';
 * 
 * export function TourControls() {
 *   const { tourState, setTourState, autoMode, setAutoMode } = useApp();
 *   
 *   return (
 *     <div>
 *       <p>Tour: {tourState}</p>
 *       <button onClick={() => setTourState('active')}>Start Tour</button>
 *       <button onClick={() => setAutoMode(!autoMode)}>
 *         Auto Mode: {autoMode ? 'ON' : 'OFF'}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useApp(): AppContextValue {
  const context = useContext(AppContext);

  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }

  return context;
}

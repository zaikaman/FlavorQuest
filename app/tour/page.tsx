/**
 * Main Tour Page
 * Phase 5 - Manual mode, settings, history, bottom nav integration
 * Phase 6 - Multi-language support
 *
 * Features:
 * - Auto/Manual mode toggle (T104-T105)
 * - Bottom navigation (T102-T103)
 * - Settings panel (T094-T098)
 * - History view (T099-T101)
 * - Map interactions (T106-T108)
 * - Multi-language UI (T114-T117)
 */

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
import { useGeofencing } from '@/lib/hooks/useGeofencing';
import { useAudioPlayer, type AudioQueueItem } from '@/lib/hooks/useAudioPlayer';
import { usePOIManager } from '@/lib/hooks/usePOIManager';
import { useTourManager } from '@/lib/hooks/useTourManager';
import { useOfflineSync } from '@/lib/hooks/useOfflineSync';
import { useDevicePerformance } from '@/lib/hooks/useDevicePerformance';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useTranslations } from '@/lib/hooks/useTranslations';
import { InteractiveMap } from '@/components/tour/InteractiveMap';
import { NarrationOverlay } from '@/components/tour/NarrationOverlay';
import { AudioPlayer } from '@/components/tour/AudioPlayer';
import { POIListView } from '@/components/tour/POIListView';
import { TourSelector } from '@/components/tour/TourSelector';
import { HistoryView } from '@/components/tour/HistoryView';
import { BottomNav, type NavTab } from '@/components/layout/BottomNav';
import { SettingsPanel } from '@/components/layout/SettingsPanel';
import { OfflineIndicator } from '@/components/layout/OfflineIndicator';
import { Toast } from '@/components/ui/Toast';
import { TourPageSkeleton } from '@/components/ui/Loading';
import { NoiseFilter } from '@/lib/utils/noise-filter';
import { SpeedCalculator } from '@/lib/utils/speed';
import { logAutoPlay, logManualPlay, logSkip, logTourEnd } from '@/lib/services/analytics';
import { warmAudioUrls } from '@/lib/services/audio-session';
import { resolveDevicePerformance } from '@/lib/services/device-performance';
import { saveVisit, loadSettings } from '@/lib/services/storage';
import { getLocalizedPOI } from '@/lib/utils/localization';
import { calculateDistance, findNearestPOI } from '@/lib/utils/distance';
import type { Json } from '@/lib/types/database.types';
import type { AppNotification, POI, Coordinates, UserSettings } from '@/lib/types/index';
import {
  COOLDOWN_PERIOD_MS,
  GEOFENCE_TRIGGER_RADIUS_M,
  MAX_WALKING_SPEED_KMH,
} from '@/lib/constants/index';

type NavigatorConnection = {
  saveData?: boolean;
  effectiveType?: string;
};

export default function TourPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const { t } = useTranslations();
  const { user } = useAuth();
  const selectedTourId = searchParams.get('tour');
  const requestedTab = searchParams.get('tab');

  // UI State
  const [activeTab, setActiveTab] = useState<NavTab>(requestedTab === 'list' ? 'list' : 'map');
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [visitedPOIs, setVisitedPOIs] = useState<Set<string>>(new Set());
  const [tourStartTime] = useState(() => Date.now());
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const deviceAssessment = useDevicePerformance();

  // Geolocation
  const { coordinates, accuracy, heading, error: geoError, permissionState } = useGeolocation();

  // Refs
  const noiseFilterRef = useRef<NoiseFilter>(new NoiseFilter({ windowSize: 5 })); // 5 samples moving average
  const speedCalculatorRef = useRef<SpeedCalculator>(new SpeedCalculator({ windowSize: 10 }));
  const pendingAutoPlayRef = useRef<Map<string, { distance: number }>>(new Map());
  const autoPlayCooldownRef = useRef<Map<string, number>>(new Map());
  const [filteredPosition, setFilteredPosition] = useState<Coordinates | null>(null);
  const hasPreloadedRef = useRef(false);
  const devicePerformance = useMemo(
    () => resolveDevicePerformance(settings, deviceAssessment),
    [deviceAssessment, settings]
  );

  // Load settings on mount
  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      setIsAutoMode(s.autoPlayEnabled);
    });
  }, []);

  // Toast helper
  const showToastMessage = useCallback(
    (message: string) => {
      setToastMessage(message);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    },
    [setToastMessage, setShowToast]
  );

  const handleOfflineSyncSuccess = useCallback(
    (count: number) => {
      if (count > 0) {
        showToastMessage(t('tour.syncedEvents', { count: String(count) }));
      }
    },
    [showToastMessage, t]
  );

  const handlePOIOfflineReady = useCallback(() => {
    setIsOfflineReady(true);
  }, []);

  // Offline Sync
  const { isOfflineReady: offlineSyncReady } = useOfflineSync({
    autoSync: true,
    onSyncSuccess: handleOfflineSyncSuccess,
  });

  // POI Management với offline support
  const {
    pois,
    isLoading: poisLoading,
    preloadAllAudio,
  } = usePOIManager({
    language,
    autoPreloadAudio: true,
    preloadRadius: devicePerformance.profile.nearbyPreloadRadius,
    onOfflineReady: handlePOIOfflineReady,
  });

  const { tours, isLoading: toursLoading } = useTourManager();

  const selectedTour = useMemo(
    () => tours.find((tour) => tour.id === selectedTourId) ?? null,
    [selectedTourId, tours]
  );

  const activePOIs = useMemo(() => {
    if (!selectedTour) {
      return pois;
    }

    const poiMap = new Map(pois.map((poi) => [poi.id, poi]));
    return selectedTour.poi_ids
      .map((poiId) => poiMap.get(poiId))
      .filter((poi): poi is POI => Boolean(poi));
  }, [pois, selectedTour]);

  const baseGeofenceRadius = settings?.geofenceRadius || GEOFENCE_TRIGGER_RADIUS_M;
  const effectiveGeofenceRadius = useMemo(() => {
    if (!accuracy || !Number.isFinite(accuracy)) {
      return baseGeofenceRadius;
    }

    return Math.max(baseGeofenceRadius, Math.min(Math.round(accuracy), 120));
  }, [accuracy, baseGeofenceRadius]);
  const isUsingAccuracyExpandedRadius = effectiveGeofenceRadius > baseGeofenceRadius;

  const handleSelectTour = useCallback(
    (tourId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());

      if (tourId) {
        params.set('tour', tourId);
      } else {
        params.delete('tour');
      }

      const nextUrl = params.toString() ? `/tour?${params.toString()}` : '/tour';
      router.replace(nextUrl, { scroll: false });
    },
    [router, searchParams]
  );

  const selectedTourMetadata = useMemo<Json | undefined>(() => {
    if (!selectedTour) {
      return undefined;
    }

    return {
      tour_id: selectedTour.id,
      tour_name: selectedTour.name_vi,
      tour_poi_count: selectedTour.poi_ids.length,
      tour_duration_min: selectedTour.estimated_duration_min ?? null,
    } as Json;
  }, [selectedTour]);

  useEffect(() => {
    if (requestedTab === 'chat') {
      const params = new URLSearchParams(searchParams.toString());
      const nextUrl = params.toString() ? `/tour/chat?${params.toString()}` : '/tour/chat';
      router.replace(nextUrl, { scroll: false });
      return;
    }

    if (requestedTab === 'assistant') {
      const params = new URLSearchParams(searchParams.toString());
      const nextUrl = params.toString()
        ? `/tour/assistant?${params.toString()}`
        : '/tour/assistant';
      router.replace(nextUrl, { scroll: false });
      return;
    }

    if (requestedTab === 'list') {
      setActiveTab('list');
      return;
    }

    if (requestedTab === 'history') {
      setActiveTab('map');
      setShowHistory(true);
      return;
    }

    if (requestedTab === 'settings') {
      setActiveTab('map');
      setShowSettings(true);
      return;
    }

    setActiveTab('map');
  }, [requestedTab, router, searchParams]);

  useEffect(() => {
    hasPreloadedRef.current = false;
    autoPlayCooldownRef.current.clear();
  }, [language, selectedTourId]);



  const isAutoPlayOnCooldown = useCallback((poiId: string) => {
    const lastPlayedAt = autoPlayCooldownRef.current.get(poiId);
    if (!lastPlayedAt) {
      return false;
    }

    return Date.now() - lastPlayedAt < COOLDOWN_PERIOD_MS;
  }, []);

  const markAutoPlayCooldown = useCallback((poiId: string, timestamp: number = Date.now()) => {
    autoPlayCooldownRef.current.set(poiId, timestamp);
  }, []);

  const finalizeAutoPlay = useCallback(
    async (item: AudioQueueItem) => {
      const pendingEvent = pendingAutoPlayRef.current.get(item.poi.id);
      if (!pendingEvent) {
        console.log('[TourPage] finalize auto-play skipped because item is not pending:', {
          poiId: item.poi.id,
        });
        return;
      }

      pendingAutoPlayRef.current.delete(item.poi.id);

      const playbackLanguage = item.language ?? language;
      const poiName = item.title || getLocalizedPOI(item.poi, playbackLanguage).name;

      markAutoPlayCooldown(item.poi.id);
      setVisitedPOIs((prev) => new Set([...prev, item.poi.id]));
      await logAutoPlay(item.poi.id, playbackLanguage, undefined, {
        distance: pendingEvent.distance,
        ...(selectedTourMetadata &&
        typeof selectedTourMetadata === 'object' &&
        !Array.isArray(selectedTourMetadata)
          ? (selectedTourMetadata as Record<string, Json>)
          : {}),
      } as Json);
      await saveVisit({
        poi_id: item.poi.id,
        poi_name: poiName,
        visited_at: new Date().toISOString(),
        listened: true,
      });

      console.log('[TourPage] auto-play finalized:', {
        poiId: item.poi.id,
        poiName,
        distance: Math.round(pendingEvent.distance),
        playbackLanguage,
      });

      showToastMessage(t('tour.nowPlaying', { name: poiName }));
    },
    [language, markAutoPlayCooldown, selectedTourMetadata, showToastMessage, t]
  );

  // Handle TTS fallback
  const handleTTSFallback = useCallback(
    async (item: AudioQueueItem) => {
      showToastMessage(t('tour.usingTTS'));
      await finalizeAutoPlay(item);
    },
    [finalizeAutoPlay, showToastMessage, t]
  );

  // Handle audio ended
  const handleAudioEnded = useCallback(async () => {
    // Log completion if needed
  }, []);

  // Handle audio error
  const handleAudioError = useCallback(async (error: string, item: AudioQueueItem) => {
    pendingAutoPlayRef.current.delete(item.poi.id);
    console.error('[TourPage] audio playback error:', {
      poiId: item.poi.id,
      title: item.title,
      error,
    });
    // TTS fallback will be handled by useAudioPlayer
  }, []);

  // Audio Player with TTS fallback
  const audioPlayer = useAudioPlayer({
    autoPlay: true,
    volume: settings?.volume ?? 0.8,
    enableTTSFallback: true,
    language,
    onEnded: handleAudioEnded,
    onError: handleAudioError,
    onPlay: finalizeAutoPlay,
    onTTSFallback: handleTTSFallback,
  });

  const { enqueue } = audioPlayer;

  // Preload all narration audio in the background as soon as the current dataset is ready.
  useEffect(() => {
    if (activePOIs.length > 0 && !hasPreloadedRef.current) {
      void preloadAllAudio();
      hasPreloadedRef.current = true;
    }
  }, [activePOIs.length, preloadAllAudio]);

  // Handle POI entry event
  const handlePOIEnter = async (event: { poi: POI; distance: number }) => {
    if (!isAutoMode) return; // Skip if manual mode

    const { poi } = event;
    if (isUsingAccuracyExpandedRadius && filteredPosition) {
      const nearest = findNearestPOI(filteredPosition, activePOIs);

      if (nearest && nearest.poi.id !== poi.id) {
        console.log('[TourPage] skip auto-play because another POI is nearer under low GPS accuracy:', {
          poiId: poi.id,
          nearestPoiId: nearest.poi.id,
          nearestDistance: Math.round(nearest.distance),
          candidateDistance: Math.round(event.distance),
          accuracy,
          effectiveGeofenceRadius,
        });
        return;
      }
    }

    console.log('[TourPage] handlePOIEnter:', {
      poiId: poi.id,
      name: poi.name_vi,
      distance: Math.round(event.distance),
      poiRadius: poi.radius,
      autoMode: isAutoMode,
      accuracy,
      effectiveGeofenceRadius,
    });

    const isCurrentPOI = audioPlayer.currentItem?.poi.id === poi.id;
    const isQueuedPOI = audioPlayer.queue.some((item) => item.poi.id === poi.id);

    if (isCurrentPOI || isQueuedPOI) {
      console.log('[TourPage] skip auto-play because POI is already current or queued:', {
        poiId: poi.id,
        isCurrentPOI,
        isQueuedPOI,
      });
      return;
    }

    // Check cooldown
    const onCooldown = isAutoPlayOnCooldown(poi.id);
    if (onCooldown) {
      console.log(`POI ${poi.id} is on cooldown, skipping auto-play`);
      return;
    }

    // Check speed
    const currentSpeed = speedCalculatorRef.current.getSpeedKmh();
    if (currentSpeed !== null && currentSpeed > MAX_WALKING_SPEED_KMH) {
      console.log('[TourPage] skip auto-play because speed is too high:', {
        poiId: poi.id,
        currentSpeed,
      });
      showToastMessage(t('tour.tooFast'));
      return;
    }

    // Enqueue audio
    const localizedPOI = getLocalizedPOI(poi, language);
    const audioUrl = localizedPOI.audio_url;

    if (!audioUrl) {
      console.warn(`No audio URL for POI ${poi.id}`);
      return;
    }

    console.log('[TourPage] enqueue auto-play:', {
      poiId: poi.id,
      name: localizedPOI.name,
      language,
      audioUrl,
    });

    enqueue({
      poi,
      audioUrl,
      title: localizedPOI.name,
      description: localizedPOI.description,
      language,
    });
    pendingAutoPlayRef.current.set(poi.id, { distance: event.distance });
  };

  // Geofencing - detect POI entry
  const { nearbyPOIs } = useGeofencing(filteredPosition, activePOIs, {
    radius: effectiveGeofenceRadius,
    enabled: isAutoMode,
    onEnter: handlePOIEnter,
  });

  useEffect(() => {
    if (!selectedTourId || toursLoading || selectedTour) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete('tour');
    const nextUrl = params.toString() ? `/tour?${params.toString()}` : '/tour';
    router.replace(nextUrl, { scroll: false });
    const toastTimer = window.setTimeout(() => {
      showToastMessage(t('tour.invalidSelectedTour'));
    }, 0);

    return () => {
      window.clearTimeout(toastTimer);
    };
  }, [router, searchParams, selectedTour, selectedTourId, showToastMessage, t, toursLoading]);

  useEffect(() => {
    if (!selectedPOI) return;

    const isStillVisible = activePOIs.some((poi) => poi.id === selectedPOI.id);
    if (!isStillVisible) {
      const clearTimer = window.setTimeout(() => {
        setSelectedPOI(null);
      }, 0);

      return () => {
        window.clearTimeout(clearTimer);
      };
    }
  }, [activePOIs, selectedPOI]);

  useEffect(() => {
    const currentPoiId = audioPlayer.currentItem?.poi.id;

    if (!currentPoiId || !selectedTour) {
      return;
    }

    if (selectedTour.poi_ids.includes(currentPoiId)) {
      return;
    }

    void audioPlayer.stop();
    const stopTimer = window.setTimeout(() => {
      setShowPlayerModal(false);
      showToastMessage(t('tour.stoppedOutsideSelectedTour'));
    }, 0);

    return () => {
      window.clearTimeout(stopTimer);
    };
  }, [audioPlayer, selectedTour, showToastMessage, t]);

  // Apply noise filter to GPS coordinates
  useEffect(() => {
    if (!coordinates) return;

    const filtered = noiseFilterRef.current.addSample({
      lat: coordinates.lat,
      lng: coordinates.lng,
      timestamp: Date.now(),
      accuracy: accuracy ?? undefined,
    });
    setFilteredPosition(filtered);

    // Track speed
    speedCalculatorRef.current.addReading(coordinates);
  }, [coordinates, accuracy]);

  useEffect(() => {
    if (!filteredPosition || activePOIs.length === 0) {
      return;
    }

    const nearest = findNearestPOI(filteredPosition, activePOIs);
    console.log('[TourPage] position summary:', {
      filteredPosition,
      accuracy,
      geofenceRadius: baseGeofenceRadius,
      effectiveGeofenceRadius,
      isUsingAccuracyExpandedRadius,
      activePOICount: activePOIs.length,
      nearest: nearest
        ? {
            id: nearest.poi.id,
            name: nearest.poi.name_vi,
            distance: Math.round(nearest.distance),
            poiRadius: nearest.poi.radius,
          }
        : null,
    });
  }, [
    accuracy,
    activePOIs,
    baseGeofenceRadius,
    effectiveGeofenceRadius,
    filteredPosition,
    isUsingAccuracyExpandedRadius,
  ]);

  // Handle tour end (on unmount)
  useEffect(() => {
    return () => {
      const duration = Date.now() - tourStartTime;
      logTourEnd(
        language,
        duration,
        visitedPOIs.size,
        filteredPosition || undefined,
        selectedTourMetadata
      );
    };
  }, [filteredPosition, language, selectedTourMetadata, tourStartTime, visitedPOIs]);

  // Handle permission denied
  useEffect(() => {
    if (permissionState === 'denied') {
      const toastTimer = window.setTimeout(() => {
        showToastMessage(t('tour.locationDenied'));
      }, 0);
      const disableTimer = window.setTimeout(() => {
        setIsAutoMode(false);
      }, 0);

      return () => {
        window.clearTimeout(toastTimer);
        window.clearTimeout(disableTimer);
      };
    }
  }, [permissionState, showToastMessage, t]);

  // Handle geolocation error
  useEffect(() => {
    if (geoError) {
      // Properties of GeolocationPositionError might not be enumerable in some browsers
      const errorCode = geoError.code;
      const errorMsg = geoError.message;

      console.error(`Geolocation error [Code ${errorCode}]: ${errorMsg}`);

      // Check for insecure origin (common issue on local network testing)
      if (
        typeof window !== 'undefined' &&
        window.location.protocol === 'http:' &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1'
      ) {
        console.warn('Geolocation requires a secure context (HTTPS) or localhost.');
        window.setTimeout(() => {
          showToastMessage(t('tour.httpsRequired'));
        }, 0);
        return;
      }

      // Show toast for other errors
      // 1 = PERMISSION_DENIED (handled by permissionState effect)
      // 3 = TIMEOUT (suppressed per user request as it happens during idle)
      if (errorCode !== 1 && errorCode !== 3) {
        window.setTimeout(() => {
          showToastMessage(t('tour.gpsError', { message: errorMsg }));
        }, 0);
      } else if (errorCode === 3) {
        console.warn(`Geolocation timeout (background/idle): ${errorMsg}`);
      }
    }
  }, [geoError, showToastMessage, t]);

  // Handle skip next
  const handleSkipNext = useCallback(async () => {
    if (audioPlayer.currentItem) {
      if (audioPlayer.queue.length > 0) {
        await logSkip(
          audioPlayer.currentItem.poi.id,
          language,
          audioPlayer.currentTime,
          audioPlayer.duration,
          selectedTourMetadata
        );
        audioPlayer.skip();
        return;
      }

      const nextTime = Math.min(audioPlayer.duration || 0, audioPlayer.currentTime + 15);
      audioPlayer.seek(nextTime);
    }
  }, [audioPlayer, language, selectedTourMetadata]);

  // Handle skip previous
  const handleSkipPrevious = useCallback(() => {
    if (!audioPlayer.currentItem) return;

    if (audioPlayer.currentTime > 3) {
      audioPlayer.seek(0);
      return;
    }

    const previousTime = Math.max(0, audioPlayer.currentTime - 15);
    audioPlayer.seek(previousTime);
  }, [audioPlayer]);

  // Cycle playback rate: 0.75x -> 1.0x -> 1.25x -> 1.5x
  const handleCyclePlaybackRate = useCallback(() => {
    const rates = [0.75, 1, 1.25, 1.5];
    const currentIndex = rates.findIndex((rate) => rate === audioPlayer.playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length] as number;
    audioPlayer.setPlaybackRate(nextRate);
    showToastMessage(`Tốc độ phát: ${nextRate}x`);
  }, [audioPlayer, showToastMessage]);

  const handleShuffleQueue = useCallback(() => {
    if (audioPlayer.queue.length <= 1) {
      showToastMessage('Danh sách chờ chưa đủ để trộn');
      return;
    }

    audioPlayer.shuffleQueue();
    showToastMessage('Đã trộn danh sách chờ');
  }, [audioPlayer, showToastMessage]);

  const handleToggleRepeat = useCallback(() => {
    const nextRepeatState = !audioPlayer.isRepeatEnabled;
    audioPlayer.toggleRepeat();
    showToastMessage(nextRepeatState ? 'Đã bật lặp lại' : 'Đã tắt lặp lại');
  }, [audioPlayer, showToastMessage]);

  // Handle POI selection from map
  const handleSelectPOI = useCallback(
    (poi: POI | null) => {
      setSelectedPOI(poi);
    },
    [setSelectedPOI]
  );

  // Handle play POI from map card
  const handlePlayPOI = useCallback(
    async (poi: POI) => {
      pendingAutoPlayRef.current.delete(poi.id);
      const localizedPOI = getLocalizedPOI(poi, language);
      const audioUrl = localizedPOI.audio_url;

      if (audioPlayer.currentItem?.poi.id === poi.id && audioPlayer.isLoading) {
        return;
      }

      // Nếu bấm lại đúng POI đang phát: toggle pause/resume
      if (audioPlayer.currentItem?.poi.id === poi.id) {
        // Nếu đã đổi ngôn ngữ, phát lại source theo ngôn ngữ mới thay vì resume source cũ
        if (audioPlayer.currentItem.language !== language) {
          if (!audioUrl) {
            showToastMessage(t('tour.noAudioForPOI'));
            return;
          }

          await audioPlayer.playNow({
            poi,
            audioUrl,
            title: localizedPOI.name,
            description: localizedPOI.description,
            language,
          });

          showToastMessage(t('tour.nowPlaying', { name: localizedPOI.name }));
          return;
        }

        if (audioPlayer.isPlaying) {
          audioPlayer.pause();
        } else {
          await audioPlayer.play();
        }
        return;
      }

      if (!audioUrl) {
        showToastMessage(t('tour.noAudioForPOI'));
        return;
      }

      await audioPlayer.playNow({
        poi,
        audioUrl,
        title: localizedPOI.name,
        description: localizedPOI.description, // For TTS fallback
        language, // For TTS fallback
      });

      // Track visited
      setVisitedPOIs((prev) => new Set([...prev, poi.id]));

      // Log analytics & save visit
      await logManualPlay(poi.id, language, {
        distance: 0,
        accuracy: accuracy ?? undefined,
        ...(selectedTourMetadata &&
        typeof selectedTourMetadata === 'object' &&
        !Array.isArray(selectedTourMetadata)
          ? (selectedTourMetadata as Record<string, Json>)
          : {}),
      } as Json);
      await saveVisit({
        poi_id: poi.id,
        poi_name: localizedPOI.name,
        visited_at: new Date().toISOString(),
        listened: true,
      });

      showToastMessage(t('tour.nowPlaying', { name: localizedPOI.name }));
    },
    [accuracy, audioPlayer, language, selectedTourMetadata, setVisitedPOIs, showToastMessage, t]
  );

  useEffect(() => {
    return () => {
      pendingAutoPlayRef.current.clear();
      autoPlayCooldownRef.current.clear();
    };
  }, []);

  // Handle view POI detail
  const handleViewPOI = useCallback(
    (poi: POI) => {
      const params = new URLSearchParams();
      if (selectedTourId) {
        params.set('tour', selectedTourId);
      }

      const nextUrl = params.toString()
        ? `/tour/${poi.id}?${params.toString()}`
        : `/tour/${poi.id}`;

      router.push(nextUrl);
    },
    [router, selectedTourId]
  );

  // Handle tab change
  const handleTabChange = useCallback(
    (tab: NavTab) => {
      const params = new URLSearchParams(searchParams.toString());

      if (tab === 'settings') {
        params.set('tab', 'settings');
        const nextUrl = params.toString() ? `/tour?${params.toString()}` : '/tour';
        router.replace(nextUrl, { scroll: false });
        setShowSettings(true);
      } else if (tab === 'history') {
        params.set('tab', 'history');
        const nextUrl = params.toString() ? `/tour?${params.toString()}` : '/tour';
        router.replace(nextUrl, { scroll: false });
        setShowHistory(true);
      } else if (tab === 'assistant') {
        params.set('tab', 'assistant');
        const nextUrl = params.toString()
          ? `/tour/assistant?${params.toString()}`
          : '/tour/assistant';
        router.push(nextUrl);
      } else if (tab === 'chat') {
        params.set('tab', 'chat');
        const nextUrl = params.toString() ? `/tour/chat?${params.toString()}` : '/tour/chat';
        router.push(nextUrl);
      } else {
        params.set('tab', tab);
        const nextUrl = params.toString() ? `/tour?${params.toString()}` : '/tour';
        router.replace(nextUrl, { scroll: false });
        setActiveTab(tab);
      }
    },
    [router, searchParams, setActiveTab, setShowHistory, setShowSettings]
  );

  // Toggle auto/manual mode
  const toggleAutoMode = useCallback(() => {
    setIsAutoMode((prev) => {
      const newMode = !prev;
      showToastMessage(newMode ? t('tour.autoMode') : t('tour.manualMode'));
      return newMode;
    });
  }, [setIsAutoMode, showToastMessage, t]);

  // Check offline readiness
  useEffect(() => {
    const checkOffline = async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        setIsOfflineReady(!!registration.active);
      }
    };
    checkOffline();
  }, []);

  // Get next POI
  const nextPOI = nearbyPOIs.find((p) => p.id !== audioPlayer.currentItem?.poi.id);
  const audioLoadingPOIId = audioPlayer.isLoading
    ? (audioPlayer.currentItem?.poi.id ?? null)
    : null;
  const blockedAutoPlayItem = audioPlayer.interactionRequiredItem;
  const blockedAutoPlayPOIName = useMemo(() => {
    if (!blockedAutoPlayItem) {
      return '';
    }

    return getLocalizedPOI(blockedAutoPlayItem.poi, language).name;
  }, [blockedAutoPlayItem, language]);

  const warmupCandidates = useMemo(() => {
    const rankedPOIs = [...activePOIs];

    if (filteredPosition) {
      rankedPOIs.sort((left, right) => {
        const leftDistance = calculateDistance(filteredPosition, { lat: left.lat, lng: left.lng });
        const rightDistance = calculateDistance(filteredPosition, { lat: right.lat, lng: right.lng });
        return leftDistance - rightDistance;
      });
    } else {
      rankedPOIs.sort((left, right) => (left.priority || 99) - (right.priority || 99));
    }

    const selected: POI[] = [];
    const seen = new Set<string>();

    const addCandidate = (poi: POI | null | undefined) => {
      if (!poi || seen.has(poi.id)) {
        return;
      }

      seen.add(poi.id);
      selected.push(poi);
    };

    addCandidate(selectedPOI);
    addCandidate(audioPlayer.currentItem?.poi);
    addCandidate(nextPOI);
    rankedPOIs.slice(0, 3).forEach(addCandidate);

    return selected;
  }, [activePOIs, audioPlayer.currentItem, filteredPosition, nextPOI, selectedPOI]);

  useEffect(() => {
    if (warmupCandidates.length === 0) {
      return;
    }

    const connection = (navigator as Navigator & { connection?: NavigatorConnection }).connection;
    if (connection?.saveData || connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g') {
      return;
    }

    const timer = window.setTimeout(() => {
      const urls = warmupCandidates
        .map((poi) => getLocalizedPOI(poi, language).audio_url)
        .filter((url): url is string => Boolean(url));

      warmAudioUrls(urls);
    }, 150);

    return () => {
      window.clearTimeout(timer);
    };
  }, [language, warmupCandidates]);

  useEffect(() => {
    if (!blockedAutoPlayItem) {
      return;
    }

    showToastMessage(t('tour.tapToResumeAudio'));
  }, [blockedAutoPlayItem, showToastMessage, t]);

  useEffect(() => {
    if (!user) return;

    const loadNotifications = async () => {
      try {
        const res = await fetch('/api/notifications');
        if (!res.ok) return;
        const data = await res.json();
        setNotifications(data ?? []);
      } catch (error) {
        console.error('Load notifications failed:', error);
      }
    };

    loadNotifications();
  }, [user]);

  useEffect(() => {
    if (!showNotifications || notifications.length === 0) return;

    const hasUnread = notifications.some((item) => !item.read_at);
    if (!hasUnread) return;

    fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
    })
      .then(() => {
        setNotifications((prev) =>
          prev.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() }))
        );
      })
      .catch((error) => {
        console.error('Mark notifications read failed:', error);
      });
  }, [showNotifications, notifications]);

  const unreadCount = notifications.filter((item) => !item.read_at).length;

  return (
    <div className="bg-background-dark relative flex h-screen w-full flex-col overflow-hidden">
      {' '}
      {/* Header */}
      {/* Header Controls */}
      <div className="pointer-events-none absolute top-0 right-0 left-0 z-50 p-4">
        <div className="relative flex items-start justify-between">
          {/* Back Button */}
          <button
            onClick={() => router.push('/')}
            className="pointer-events-auto -mt-1 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/60"
            aria-label={t('common.back')}
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>

          {/* Auto/Manual Mode Toggle */}
          <div className="pointer-events-auto absolute left-1/2 -mt-2 -translate-x-1/2">
            <button
              onClick={toggleAutoMode}
              className={`relative flex items-center gap-2 rounded-full border px-4 py-2 shadow-lg backdrop-blur-md transition-all duration-300 ${
                isAutoMode
                  ? 'bg-primary/90 border-primary shadow-[0_4px_20px_rgba(242,108,13,0.4)]'
                  : 'border-white/10 bg-black/40 hover:bg-black/60'
              } `}
            >
              <span
                className={`material-symbols-outlined text-lg transition-transform ${isAutoMode ? 'scale-110' : ''}`}
                style={{ fontVariationSettings: isAutoMode ? "'FILL' 1" : "'FILL' 0" }}
              >
                {isAutoMode ? 'sensors' : 'touch_app'}
              </span>
              <div className="flex flex-col items-start leading-none">
                <span
                  className={`text-xs font-bold tracking-wider uppercase ${isAutoMode ? 'text-white' : 'text-white/80'}`}
                >
                  {isAutoMode ? t('tour.auto') : t('tour.manual')}
                </span>
                {isAutoMode && (
                  <span className="mt-0.5 text-[10px] font-medium text-white/80">
                    {t('tour.searchingPOIs')}
                  </span>
                )}
              </div>

              {/* Active Pulse */}
              {isAutoMode && (
                <span className="absolute -top-1 -right-1 h-3 w-3 animate-pulse rounded-full border-2 border-black bg-green-500"></span>
              )}
            </button>
          </div>

          {/* Offline Status */}
          <div className="pointer-events-auto flex items-center gap-2">
            {user && (
              <button
                onClick={() => setShowNotifications(true)}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white shadow-lg backdrop-blur-md"
                aria-label={t('notifications.title')}
              >
                <span className="material-symbols-outlined text-xl">notifications</span>
                {unreadCount > 0 && (
                  <span className="bg-primary absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            )}
            <OfflineIndicator
              compact
              className="border border-white/10 !bg-black/40 shadow-lg backdrop-blur-md"
            />
          </div>
        </div>
      </div>
      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden pt-16 pb-16">
        <div className="flex h-full flex-col">
          {activeTab !== 'list' && (
            <TourSelector
              tours={tours}
              selectedTourId={selectedTourId}
              onSelectTour={handleSelectTour}
              filteredPOICount={activePOIs.length}
              totalPOICount={pois.length}
              isLoading={toursLoading}
            />
          )}

          <div className="relative flex-1 overflow-hidden">
            {/* Map View */}
            {activeTab === 'map' && (
              <InteractiveMap
                userLocation={filteredPosition}
                heading={heading}
                accuracy={accuracy}
                pois={activePOIs}
                selectedPOI={selectedPOI}
                onSelectPOI={handleSelectPOI}
                onViewPOI={handleViewPOI}
                onPlayPOI={handlePlayPOI}
                playingPOIId={audioPlayer.currentItem?.poi.id}
                isAudioPlaying={audioPlayer.isPlaying}
                isAudioLoading={audioPlayer.isLoading}
                preferredZoom={devicePerformance.profile.mapDefaultZoom}
                enableFlyAnimation={devicePerformance.profile.mapFlyAnimation}
                showAccuracyRing={devicePerformance.profile.showAccuracyRing}
                showUserPulse={devicePerformance.profile.showUserPulse}
              />
            )}

            {/* List View */}
            {activeTab === 'list' && (
              <POIListView
                pois={activePOIs}
                userLocation={filteredPosition}
                onPlayPOI={handlePlayPOI}
                onViewPOI={handleViewPOI}
                playingPOIId={audioPlayer.currentItem?.poi.id}
                audioLoadingPOIId={audioLoadingPOIId}
                isOfflineReady={isOfflineReady || offlineSyncReady}
                isLoading={poisLoading}
              />
            )}

            {/* Loading Overlay */}
            {poisLoading && activeTab === 'map' && activePOIs.length === 0 && (
              <div className="bg-background-dark absolute inset-0 z-40 overflow-hidden">
                <TourPageSkeleton />
              </div>
            )}

            {/* Autoplay needs interaction after refresh/browser block */}
            {blockedAutoPlayItem && !showPlayerModal && (
              <div className="absolute right-0 bottom-0 left-0 z-40 px-4 pb-20 pointer-events-none">
                <div className="bg-[rgba(45,36,30,0.82)] border border-primary/30 shadow-lg backdrop-blur-md rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                      <span className="material-symbols-outlined text-[22px]">touch_app</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {blockedAutoPlayPOIName}
                      </p>
                      <p className="text-xs leading-relaxed text-white/75">
                        {t('tour.tapToResumeAudio')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Narration Overlay (Mini Player) */}
            {audioPlayer.currentItem && !showPlayerModal && !blockedAutoPlayItem && (
              <div className="absolute right-0 bottom-0 left-0 z-40 px-4 pb-20">
                <NarrationOverlay
                  currentPOI={audioPlayer.currentItem.poi}
                  distance={
                    nearbyPOIs.find((p) => p.id === audioPlayer.currentItem?.poi.id)?.distance
                  }
                  isPlaying={audioPlayer.isPlaying}
                  isLoading={audioPlayer.isLoading}
                  currentTime={audioPlayer.currentTime}
                  duration={audioPlayer.duration}
                  onExpand={() => setShowPlayerModal(true)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Full Audio Player Modal */}
      {showPlayerModal && audioPlayer.currentItem && (
        <div className="bg-background-dark fixed inset-0 z-50">
          <AudioPlayer
            currentPOI={audioPlayer.currentItem.poi}
            isPlaying={audioPlayer.isPlaying}
            isPaused={audioPlayer.isPaused}
            currentTime={audioPlayer.currentTime}
              duration={audioPlayer.duration}
              volume={audioPlayer.volume}
              playbackRate={audioPlayer.playbackRate}
              isRepeatEnabled={audioPlayer.isRepeatEnabled}
              isLoading={audioPlayer.isLoading}
              nextPOI={nextPOI}
              onPlay={audioPlayer.play}
            onPause={audioPlayer.pause}
            onSeek={audioPlayer.seek}
            onVolumeChange={audioPlayer.setVolume}
            onPlaybackRateChange={handleCyclePlaybackRate}
            onShuffleQueue={handleShuffleQueue}
            onToggleRepeat={handleToggleRepeat}
            onSkipNext={handleSkipNext}
            onSkipPrevious={handleSkipPrevious}
            onClose={() => setShowPlayerModal(false)}
          />
        </div>
      )}
      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        onSettingsChange={(newSettings) => {
          setSettings(newSettings);
          setIsAutoMode(newSettings.autoPlayEnabled);
          audioPlayer.setVolume(newSettings.volume);
        }}
        onClose={() => {
          setShowSettings(false);
          const params = new URLSearchParams(searchParams.toString());
          params.set('tab', activeTab);
          const nextUrl = params.toString() ? `/tour?${params.toString()}` : '/tour';
          router.replace(nextUrl, { scroll: false });
          // Reload settings
          loadSettings().then((s) => {
            setSettings(s);
            setIsAutoMode(s.autoPlayEnabled);
            audioPlayer.setVolume(s.volume);
          });
        }}
      />
      {/* History View */}
      <HistoryView
        isOpen={showHistory}
        onClose={() => {
          setShowHistory(false);
          const params = new URLSearchParams(searchParams.toString());
          params.set('tab', activeTab);
          const nextUrl = params.toString() ? `/tour?${params.toString()}` : '/tour';
          router.replace(nextUrl, { scroll: false });
        }}
        onPlayPOI={handlePlayPOI}
        onViewPOI={handleViewPOI}
      />
      {/* Toast Notifications */}
      {showToast && (
        <div className="fixed top-20 right-4 left-4 z-[60]">
          <Toast message={toastMessage} type="info" onClose={() => setShowToast(false)} />
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        className="fixed right-0 bottom-0 left-0 z-50"
      />
      {showNotifications && (
        <div className="fixed inset-0 z-[70] bg-black/70 p-4 backdrop-blur-sm">
          <div className="mx-auto mt-16 max-h-[70vh] max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#2a1e16] p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-white">{t('notifications.title')}</h3>
              <button
                onClick={() => setShowNotifications(false)}
                className="text-gray-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {notifications.length === 0 && (
              <p className="text-sm text-gray-400">{t('notifications.empty')}</p>
            )}

            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`rounded-lg border p-3 ${notification.read_at ? 'border-white/10' : 'border-primary/40 bg-primary/5'}`}
                >
                  <p className="text-sm font-semibold">{notification.title}</p>
                  <p className="mt-1 text-xs text-gray-300">{notification.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
import { useGeofencing } from '@/lib/hooks/useGeofencing';
import { useAudioPlayer } from '@/lib/hooks/useAudioPlayer';
import { usePOIManager } from '@/lib/hooks/usePOIManager';
import { useOfflineSync } from '@/lib/hooks/useOfflineSync';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useTranslations } from '@/lib/hooks/useTranslations';
import { InteractiveMap } from '@/components/tour/InteractiveMap';
import { NarrationOverlay } from '@/components/tour/NarrationOverlay';
import { AudioPlayer } from '@/components/tour/AudioPlayer';
import { POIListView } from '@/components/tour/POIListView';
import { HistoryView } from '@/components/tour/HistoryView';
import { BottomNav, type NavTab } from '@/components/layout/BottomNav';
import { SettingsPanel } from '@/components/layout/SettingsPanel';
import { OfflineIndicator } from '@/components/layout/OfflineIndicator';
import { AudioPreloadIndicator } from '@/components/layout/AudioPreloadIndicator';
import { OfflineDownloadPrompt } from '@/components/layout/OfflineDownloadPrompt';
import { Toast } from '@/components/ui/Toast';
import { NoiseFilter } from '@/lib/utils/noise-filter';
import { SpeedCalculator } from '@/lib/utils/speed';
import { isCooldownActive, setCooldown } from '@/lib/utils/cooldown';
import { logAutoPlay, logSkip, logTourEnd } from '@/lib/services/analytics';
import { saveVisit, loadSettings } from '@/lib/services/storage';
import { getLocalizedPOI } from '@/lib/utils/localization';
import type { POI, Coordinates, UserSettings } from '@/lib/types/index';
import { GEOFENCE_TRIGGER_RADIUS_M, MAX_WALKING_SPEED_KMH } from '@/lib/constants/index';

export default function TourPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const { t } = useTranslations();

  // Geolocation
  const { coordinates, accuracy, heading, error: geoError, permissionState } = useGeolocation();

  // Offline Sync
  const {
    isOfflineReady: offlineSyncReady,
  } = useOfflineSync({
    autoSync: true,
    onSyncSuccess: (count) => {
      if (count > 0) {
        showToastMessage(t('tour.syncedEvents', { count: String(count) }));
      }
    },
    onOfflineReady: () => {
      showToastMessage(t('tour.offlineReady'));
    },
  });

  // POI Management với offline support
  const {
    pois,
    isLoading: poisLoading,
    preloadNearbyAudio,
  } = usePOIManager({
    language,
    autoPreloadAudio: true,
    preloadRadius: 500,
    onOfflineReady: () => {
      setIsOfflineReady(true);
      showToastMessage(t('tour.dataSaved'));
    },
  });

  // UI State
  const [activeTab, setActiveTab] = useState<NavTab>('map');
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [visitedPOIs, setVisitedPOIs] = useState<Set<string>>(new Set());
  const [tourStartTime] = useState(Date.now());
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [showOfflinePrompt, setShowOfflinePrompt] = useState(false);
  const [shouldPreloadOffline, setShouldPreloadOffline] = useState(false);

  // Refs
  const noiseFilterRef = useRef<NoiseFilter>(new NoiseFilter({ windowSize: 5 })); // 5 samples moving average
  const speedCalculatorRef = useRef<SpeedCalculator>(new SpeedCalculator({ windowSize: 10 }));
  const [filteredPosition, setFilteredPosition] = useState<Coordinates | null>(null);
  const hasPreloadedRef = useRef(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings().then(s => {

      setSettings(s);
      setIsAutoMode(s.autoPlayEnabled);
    });

    // Check offline preference from localStorage
    const savedPreference = localStorage.getItem('flavorquest-offline-preference');
    if (savedPreference) {
      setShouldPreloadOffline(savedPreference === 'accepted');
    } else {
      // Chưa có preference, hiển thị prompt sau 2 giây
      setTimeout(() => {
        setShowOfflinePrompt(true);
      }, 2000);
    }
  }, []);



  // Toast helper
  const showToastMessage = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }, []);

  // Handle offline download acceptance
  const handleOfflineAccept = useCallback(() => {
    setShouldPreloadOffline(true);
    localStorage.setItem('flavorquest-offline-preference', 'accepted');
    setShowOfflinePrompt(false);
    showToastMessage(t('offline.downloadStarted') || 'Bắt đầu tải xuống nội dung offline...');
  }, [showToastMessage, t]);

  // Handle offline download decline
  const handleOfflineDecline = useCallback(() => {
    setShouldPreloadOffline(false);
    localStorage.setItem('flavorquest-offline-preference', 'declined');
    setShowOfflinePrompt(false);
  }, []);

  // Calculate estimated size
  const estimatedSize = Math.round((pois.length * 2.5)); // ~2.5MB per POI (audio + image)

  // Handle TTS fallback
  const handleTTSFallback = useCallback(() => {
    showToastMessage(t('tour.usingTTS'));
  }, [showToastMessage, t]);

  // Handle audio ended
  const handleAudioEnded = useCallback(async () => {
    // Log completion if needed
  }, []);

  // Handle audio error
  const handleAudioError = useCallback(async (error: string) => {
    console.error('Audio playback error:', error);
    // TTS fallback will be handled by useAudioPlayer
  }, []);

  // Audio Player with TTS fallback
  const audioPlayer = useAudioPlayer({
    autoPlay: true,
    enableTTSFallback: true,
    language,
    onEnded: handleAudioEnded,
    onError: handleAudioError,
    onTTSFallback: handleTTSFallback,
  });

  const { enqueue } = audioPlayer;

  // Preload audio when position changes
  useEffect(() => {
    if (filteredPosition && pois.length > 0 && !hasPreloadedRef.current) {
      preloadNearbyAudio(filteredPosition);
      hasPreloadedRef.current = true;
    }
  }, [filteredPosition, pois, preloadNearbyAudio]);

  // Handle POI entry event
  const handlePOIEnter = useCallback(async (event: { poi: POI; distance: number }) => {
    if (!isAutoMode) return; // Skip if manual mode

    const { poi } = event;

    // Check cooldown
    const onCooldown = await isCooldownActive(poi.id);
    if (onCooldown) {
      console.log(`POI ${poi.id} is on cooldown, skipping auto-play`);
      return;
    }

    // Check speed
    const currentSpeed = speedCalculatorRef.current.getSpeedKmh();
    if (currentSpeed !== null && currentSpeed > MAX_WALKING_SPEED_KMH) {
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

    enqueue({
      poi,
      audioUrl,
      title: localizedPOI.name,
      description: localizedPOI.description,
      language,
    });

    await setCooldown(poi.id);
    setVisitedPOIs(prev => new Set([...prev, poi.id]));
    await logAutoPlay(poi.id, language, undefined, { distance: event.distance });
    await saveVisit({
      poi_id: poi.id,
      poi_name: localizedPOI.name,
      visited_at: new Date().toISOString(),
      listened: true,
    });

    showToastMessage(t('tour.nowPlaying', { name: localizedPOI.name }));
  }, [isAutoMode, language, enqueue, showToastMessage, t]);

  // Geofencing - detect POI entry
  const { nearbyPOIs } = useGeofencing(
    filteredPosition,
    pois,
    {
      radius: settings?.geofenceRadius || GEOFENCE_TRIGGER_RADIUS_M,
      enabled: isAutoMode,
      onEnter: handlePOIEnter,
    }
  );

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

  // Handle tour end (on unmount)
  useEffect(() => {
    return () => {
      const duration = Date.now() - tourStartTime;
      logTourEnd(language, duration, visitedPOIs.size, filteredPosition || undefined);
    };
  }, [language, tourStartTime, visitedPOIs, filteredPosition]);

  // Handle permission denied
  useEffect(() => {
    if (permissionState === 'denied') {
      showToastMessage(t('tour.locationDenied'));
      setIsAutoMode(false);
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
      if (typeof window !== 'undefined' && window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        console.warn('Geolocation requires a secure context (HTTPS) or localhost.');
        showToastMessage(t('tour.httpsRequired'));
        return;
      }

      // Show toast for other errors
      // 1 = PERMISSION_DENIED (handled by permissionState effect)
      // 3 = TIMEOUT (suppressed per user request as it happens during idle)
      if (errorCode !== 1 && errorCode !== 3) {
        showToastMessage(t('tour.gpsError', { message: errorMsg }));
      } else if (errorCode === 3) {
        console.warn(`Geolocation timeout (background/idle): ${errorMsg}`);
      }
    }
  }, [geoError, showToastMessage, t]);

  // Handle skip
  const handleSkip = useCallback(async () => {
    if (audioPlayer.currentItem) {
      await logSkip(
        audioPlayer.currentItem.poi.id,
        language,
        audioPlayer.currentTime,
        audioPlayer.duration
      );
      audioPlayer.skip();
    }
  }, [audioPlayer, language]);

  // Handle POI selection from map
  const handleSelectPOI = useCallback((poi: POI | null) => {
    setSelectedPOI(poi);
  }, []);

  // Handle play POI from map card
  const handlePlayPOI = useCallback(async (poi: POI) => {
    const localizedPOI = getLocalizedPOI(poi, language);
    const audioUrl = localizedPOI.audio_url;



    if (!audioUrl) {
      showToastMessage(t('tour.noAudioForPOI'));
      return;
    }

    enqueue({
      poi,
      audioUrl,
      title: localizedPOI.name,
      description: localizedPOI.description, // For TTS fallback
      language, // For TTS fallback
    });

    // Track visited
    setVisitedPOIs(prev => new Set([...prev, poi.id]));

    // Log analytics & save visit
    await logAutoPlay(poi.id, language, undefined, {
      distance: 0,
      accuracy: accuracy ?? undefined,
    });
    await saveVisit({
      poi_id: poi.id,
      poi_name: localizedPOI.name,
      visited_at: new Date().toISOString(),
      listened: true,
    });

    showToastMessage(t('tour.nowPlaying', { name: localizedPOI.name }));
  }, [language, enqueue, showToastMessage, accuracy, t]);

  // Handle view POI detail
  const handleViewPOI = useCallback((poi: POI) => {
    router.push(`/tour/${poi.id}`);
  }, [router]);

  // Handle tab change
  const handleTabChange = useCallback((tab: NavTab) => {
    if (tab === 'settings') {
      setShowSettings(true);
    } else if (tab === 'history') {
      setShowHistory(true);
    } else {
      setActiveTab(tab);
    }
  }, []);

  // Toggle auto/manual mode
  const toggleAutoMode = useCallback(() => {
    setIsAutoMode(prev => {
      const newMode = !prev;
      showToastMessage(newMode ? t('tour.autoMode') : t('tour.manualMode'));
      return newMode;
    });
  }, [showToastMessage, t]);

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
  const nextPOI = nearbyPOIs.find(p => p.id !== audioPlayer.currentItem?.poi.id);



  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-background-dark">      {/* Header */}
      {/* Header Controls */}
      <div className="absolute top-0 left-0 right-0 z-50 pointer-events-none p-4">
        <div className="relative flex items-start justify-between">
          {/* Back Button */}
          <button
            onClick={() => router.push('/')}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white shadow-lg pointer-events-auto hover:bg-black/60 transition-colors -mt-1"
            aria-label={t('common.back')}
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>

          {/* Auto/Manual Mode Toggle */}
          <div className="pointer-events-auto -mt-2 absolute left-1/2 -translate-x-1/2">
            <button
              onClick={toggleAutoMode}
              className={`
                 relative flex items-center gap-2 px-4 py-2 rounded-full 
                 backdrop-blur-md border shadow-lg transition-all duration-300
                 ${isAutoMode
                  ? 'bg-primary/90 border-primary shadow-[0_4px_20px_rgba(242,108,13,0.4)]'
                  : 'bg-black/40 border-white/10 hover:bg-black/60'
                }
               `}
            >
              <span
                className={`material-symbols-outlined text-lg transition-transform ${isAutoMode ? 'scale-110' : ''}`}
                style={{ fontVariationSettings: isAutoMode ? "'FILL' 1" : "'FILL' 0" }}
              >
                {isAutoMode ? 'sensors' : 'touch_app'}
              </span>
              <div className="flex flex-col items-start leading-none">
                <span className={`text-xs font-bold uppercase tracking-wider ${isAutoMode ? 'text-white' : 'text-white/80'}`}>
                  {isAutoMode ? t('tour.auto') : t('tour.manual')}
                </span>
                {isAutoMode && (
                  <span className="text-[10px] text-white/80 font-medium mt-0.5">{t('tour.searchingPOIs')}</span>
                )}
              </div>

              {/* Active Pulse */}
              {isAutoMode && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-black animate-pulse"></span>
              )}
            </button>
          </div>

          {/* Offline Status */}
          <div className="pointer-events-auto">
            <OfflineIndicator compact className="shadow-lg border border-white/10 backdrop-blur-md !bg-black/40" />
          </div>
        </div>
      </div>
      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden pt-16 pb-16">
        {/* Map View */}
        {activeTab === 'map' && (
          <>
            <InteractiveMap
              userLocation={filteredPosition}
              heading={heading}
              accuracy={accuracy}
              pois={pois}
              selectedPOI={selectedPOI}
              onSelectPOI={handleSelectPOI}
              onPlayPOI={handlePlayPOI}

            />

            {/* Auto/Manual Mode Toggle */}


            {/* Offline Mode Indicator */}
            {/* Offline Banner below header if needed, but the indicator handles it. 
                  Removing extra centralized banner to clean up UI 
              */}
          </>
        )}

        {/* List View */}
        {activeTab === 'list' && (
          <POIListView
            pois={pois}
            userLocation={filteredPosition}
            onPlayPOI={handlePlayPOI}
            onViewPOI={handleViewPOI}
            playingPOIId={audioPlayer.currentItem?.poi.id}
            isOfflineReady={isOfflineReady || offlineSyncReady}
          />
        )}

        {/* Loading Overlay */}
        {poisLoading && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 text-white">
              <span className="material-symbols-outlined text-5xl animate-spin">sync</span>
              <p className="text-lg font-medium">{t('tour.loadingPOIs')}</p>
            </div>
          </div>
        )}

        {/* Narration Overlay (Mini Player) */}
        {audioPlayer.currentItem && !showPlayerModal && (
          <div className="absolute bottom-0 left-0 right-0 z-40 px-4 pb-20">
            <NarrationOverlay
              currentPOI={audioPlayer.currentItem.poi}
              distance={nearbyPOIs.find(p => p.id === audioPlayer.currentItem?.poi.id)?.distance}
              isPlaying={audioPlayer.isPlaying}
              currentTime={audioPlayer.currentTime}
              duration={audioPlayer.duration}
              onExpand={() => setShowPlayerModal(true)}
            />
          </div>
        )}
      </div>

      {/* Full Audio Player Modal */}
      {showPlayerModal && audioPlayer.currentItem && (
        <div className="fixed inset-0 z-50 bg-background-dark">
          <AudioPlayer
            currentPOI={audioPlayer.currentItem.poi}
            isPlaying={audioPlayer.isPlaying}
            isPaused={audioPlayer.isPaused}
            currentTime={audioPlayer.currentTime}
            duration={audioPlayer.duration}
            volume={audioPlayer.volume}
            nextPOI={nextPOI}
            onPlay={audioPlayer.play}
            onPause={audioPlayer.pause}
            onSeek={audioPlayer.seek}
            onVolumeChange={audioPlayer.setVolume}
            onSkipNext={handleSkip}
            onSkipPrevious={handleSkip}
            onClose={() => setShowPlayerModal(false)}
          />
        </div>
      )}

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => {
          setShowSettings(false);
          // Reload settings
          loadSettings().then(s => {
            setSettings(s);
            setIsAutoMode(s.autoPlayEnabled);
          });
        }}
      />

      {/* History View */}
      <HistoryView
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onPlayPOI={handlePlayPOI}
        onViewPOI={handleViewPOI}
      />

      {/* Toast Notifications */}
      {showToast && (
        <div className="fixed top-20 left-4 right-4 z-[60]">
          <Toast message={toastMessage} type="info" onClose={() => setShowToast(false)} />
        </div>
      )}

      {/* Audio Preload Indicator */}
      {pois.length > 0 && shouldPreloadOffline && (
        <AudioPreloadIndicator
          pois={pois}
          language={language}
          currentPosition={filteredPosition || undefined}
          preloadRadius={5000} // Tải hết tất cả POIs
          autoPreload={true}
          compact={false}
          showUI={true}
          onComplete={() => {
            setIsOfflineReady(true);
          }}
        />
      )}

      {/* Offline Download Prompt */}
      <OfflineDownloadPrompt
        isOpen={showOfflinePrompt}
        onAccept={handleOfflineAccept}
        onDecline={handleOfflineDecline}
        poisCount={pois.length}
        estimatedSize={estimatedSize}
      />

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        className="fixed bottom-0 left-0 right-0 z-50"
      />
    </div>
  );
}

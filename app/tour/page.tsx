/**
 * Main Tour Page
 * Auto narration logic với geofencing
 * Based on design_template/interactive_street_map/code.html
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
import { useGeofencing } from '@/lib/hooks/useGeofencing';
import { useAudioPlayer } from '@/lib/hooks/useAudioPlayer';
import { usePOIManager } from '@/lib/hooks/usePOIManager';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { InteractiveMap } from '@/components/tour/InteractiveMap';
import { NarrationOverlay } from '@/components/tour/NarrationOverlay';
import { AudioPlayer } from '@/components/tour/AudioPlayer';
import { Toast } from '@/components/ui/Toast';
import { NoiseFilter } from '@/lib/utils/noise-filter';
import { SpeedCalculator } from '@/lib/utils/speed';
import { isCooldownActive, setCooldown } from '@/lib/utils/cooldown';
import { logAutoPlay, logSkip, logTourEnd } from '@/lib/services/analytics';
import { getLocalizedPOI } from '@/lib/utils/localization';
import type { POI, Coordinates } from '@/lib/types/index';
import { GEOFENCE_TRIGGER_RADIUS_M, MAX_WALKING_SPEED_KMH } from '@/lib/constants/index';

export default function TourPage() {
  const router = useRouter();
  const { language } = useLanguage();

  // Geolocation
  const { coordinates, accuracy, heading, error: geoError, permissionState } = useGeolocation();

  // POI Management
  const { pois, isLoading: poisLoading } = usePOIManager({ language });

  // UI State
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [visitedPOIs, setVisitedPOIs] = useState<Set<string>>(new Set());
  const [tourStartTime] = useState(Date.now());
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [isOfflineReady, setIsOfflineReady] = useState(false);

  // Refs
  const noiseFilterRef = useRef<NoiseFilter>(new NoiseFilter({ windowSize: 5 })); // 5 samples moving average
  const speedCalculatorRef = useRef<SpeedCalculator>(new SpeedCalculator({ windowSize: 10 }));
  const [filteredPosition, setFilteredPosition] = useState<Coordinates | null>(null);

  // Toast helper
  const showToastMessage = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }, []);

  // Handle audio ended
  const handleAudioEnded = useCallback(async () => {
    // Log completion if needed
  }, []);

  // Handle audio error
  const handleAudioError = useCallback(async (error: string) => {
    console.error('Audio playback error:', error);
    showToastMessage('Không thể phát audio. Vui lòng thử lại sau.');
  }, [showToastMessage]);

  // Audio Player
  const audioPlayer = useAudioPlayer({
    autoPlay: true,
    onEnded: handleAudioEnded,
    onError: handleAudioError,
  });

  const { enqueue } = audioPlayer;

  // Handle POI entry event
  const handlePOIEnter = useCallback(async (event: { poi: POI; distance: number }) => {
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
      showToastMessage(`Bạn đang di chuyển quá nhanh (${currentSpeed.toFixed(1)} km/h). Vui lòng đi bộ để nhận thuyết minh.`);
      return;
    }

    // Priority sorting: if multiple POIs active, choose highest priority + closest
    // note: nearbyPOIs is not available here easily without circular dependency if we use it in dep array
    // effectively we trust the event passed the relevant POI

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
    });

    // Set cooldown
    await setCooldown(poi.id);

    // Track visited
    setVisitedPOIs(prev => new Set([...prev, poi.id]));

    // Log analytics
    await logAutoPlay(poi.id, language, undefined, {
      distance: event.distance,
      accuracy: undefined,
    });

    // Show toast
    showToastMessage(`Đang phát: ${localizedPOI.name}`);
  }, [language, enqueue, showToastMessage]);

  // Geofencing - detect POI entry
  const { nearbyPOIs } = useGeofencing(
    filteredPosition,
    pois,
    {
      radius: GEOFENCE_TRIGGER_RADIUS_M,
      enabled: true,
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
      showToastMessage('Vị trí bị từ chối. Chuyển sang chế độ thủ công.');
      setTimeout(() => {
        router.push('/browse');
      }, 3000);
    }
  }, [permissionState, router, showToastMessage]);

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
        showToastMessage('Lỗi: GPS yêu cầu HTTPS. Vui lòng dùng localhost hoặc cài đặt SSL.');
        return;
      }

      // Show toast for other errors
      // 1 = PERMISSION_DENIED (handled by permissionState effect)
      // 3 = TIMEOUT (suppressed per user request as it happens during idle)
      if (errorCode !== 1 && errorCode !== 3) {
        showToastMessage(`Lỗi GPS: ${errorMsg}`);
      } else if (errorCode === 3) {
        console.warn(`Geolocation timeout (background/idle): ${errorMsg}`);
      }
    }
  }, [geoError, showToastMessage]);

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

    console.log('[handlePlayPOI] POI:', poi.name_vi);
    console.log('[handlePlayPOI] Language:', language);
    console.log('[handlePlayPOI] Audio URL:', audioUrl);

    if (!audioUrl) {
      showToastMessage('Không có audio cho địa điểm này');
      return;
    }

    enqueue({
      poi,
      audioUrl,
      title: localizedPOI.name,
    });

    // Track visited
    setVisitedPOIs(prev => new Set([...prev, poi.id]));

    // Log analytics
    await logAutoPlay(poi.id, language, undefined, {
      distance: 0,
      accuracy: accuracy ?? undefined,
    });

    showToastMessage(`Đang phát: ${localizedPOI.name}`);
  }, [language, enqueue, showToastMessage, accuracy]);

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

  // Debug audio player state
  console.log('[TourPage] audioPlayer.currentItem:', audioPlayer.currentItem?.title);
  console.log('[TourPage] audioPlayer.isPlaying:', audioPlayer.isPlaying);

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-background-dark">
      {/* Interactive Map - Full Screen */}
      <div className="absolute inset-0 z-0">
        <InteractiveMap
          userLocation={filteredPosition}
          heading={heading}
          accuracy={accuracy}
          pois={pois}
          selectedPOI={selectedPOI}
          onSelectPOI={handleSelectPOI}
          onPlayPOI={handlePlayPOI}
          isOfflineReady={isOfflineReady}
        />
      </div>

      {/* Loading Overlay */}
      {poisLoading && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-white">
            <span className="material-symbols-outlined text-5xl animate-spin">sync</span>
            <p className="text-lg font-medium">Đang tải địa điểm...</p>
          </div>
        </div>
      )}

      {/* Narration Overlay (Mini Player) */}
      {audioPlayer.currentItem && !showPlayerModal && (
        <div className="absolute bottom-24 left-0 right-0 z-30 px-4">
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

      {/* Toast Notifications */}
      {showToast && (
        <div className="fixed top-20 left-4 right-4 z-50">
          <Toast
            message={toastMessage}
            type="info"
            onClose={() => setShowToast(false)}
          />
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#493222] bg-[#221710] px-2 pb-6 pt-2">
        <div className="flex justify-between items-end">
          <button className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-lg py-1 group transition-colors">
            <div className="flex h-7 w-12 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <span className="material-symbols-outlined text-primary text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>map</span>
            </div>
            <p className="text-primary text-[10px] font-semibold leading-none tracking-wide">Bản đồ</p>
          </button>
          <button
            onClick={() => router.push('/browse')}
            className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-lg py-1 group transition-colors"
          >
            <div className="flex h-7 w-12 items-center justify-center rounded-full bg-transparent group-hover:bg-white/5 transition-colors">
              <span className="material-symbols-outlined text-[#8d7b6f] text-[24px] group-hover:text-[#cba990] transition-colors">format_list_bulleted</span>
            </div>
            <p className="text-[#8d7b6f] text-[10px] font-medium leading-none tracking-wide group-hover:text-[#cba990] transition-colors">Danh sách</p>
          </button>
          <button className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-lg py-1 group transition-colors">
            <div className="flex h-7 w-12 items-center justify-center rounded-full bg-transparent group-hover:bg-white/5 transition-colors">
              <span className="material-symbols-outlined text-[#8d7b6f] text-[24px] group-hover:text-[#cba990] transition-colors">headphones</span>
            </div>
            <p className="text-[#8d7b6f] text-[10px] font-medium leading-none tracking-wide group-hover:text-[#cba990] transition-colors">Tour của tôi</p>
          </button>
          <button
            onClick={() => router.push('/settings')}
            className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-lg py-1 group transition-colors"
          >
            <div className="flex h-7 w-12 items-center justify-center rounded-full bg-transparent group-hover:bg-white/5 transition-colors">
              <span className="material-symbols-outlined text-[#8d7b6f] text-[24px] group-hover:text-[#cba990] transition-colors">person</span>
            </div>
            <p className="text-[#8d7b6f] text-[10px] font-medium leading-none tracking-wide group-hover:text-[#cba990] transition-colors">Hồ sơ</p>
          </button>
        </div>
      </nav>
    </div>
  );
}

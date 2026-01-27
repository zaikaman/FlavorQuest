/**
 * Main Tour Page
 * Auto narration logic với geofencing
 * Based on design_template/active_audio_tour_dashboard/code.html
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
import { useGeofencing } from '@/lib/hooks/useGeofencing';
import { useAudioPlayer } from '@/lib/hooks/useAudioPlayer';
import { usePOIManager } from '@/lib/hooks/usePOIManager';
import { useLanguage } from '@/lib/contexts/LanguageContext';
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
  const { coordinates, accuracy, error: geoError, permissionState } = useGeolocation();

  // POI Management
  const { pois, isLoading: poisLoading } = usePOIManager({ language });

  // UI State
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [visitedPOIs, setVisitedPOIs] = useState<Set<string>>(new Set());
  const [tourStartTime] = useState(Date.now());

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

  // Get next POI
  const nextPOI = nearbyPOIs.find(p => p.id !== audioPlayer.currentItem?.poi.id);

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-background-dark">
      {/* Top Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 pt-6 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <button
          onClick={() => router.push('/')}
          className="pointer-events-auto flex size-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-white text-base font-semibold tracking-wide drop-shadow-md opacity-90">Active Tour</h2>
        <button
          className="pointer-events-auto flex size-10 items-center justify-center rounded-full bg-black/40 text-seafood-green backdrop-blur-sm hover:bg-black/60 transition-colors"
          title="Offline Ready"
        >
          <span className="material-symbols-outlined text-[20px] fill-1">offline_pin</span>
        </button>
      </div>

      {/* Map Section (Placeholder for now) */}
      <div className="h-[40vh] w-full relative group/map">
        {/* Map Image Placeholder */}
        <div
          className="absolute inset-0 bg-cover bg-center grayscale-[20%] sepia-[10%]"
          style={{
            backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuD4wtbfZGczbsVLAR7s4-a9gAPKJvaVP59XVcin-TKFc062ZhzVWfNrpqniSnOIVpCjvDORKWrV_1iHqIszwXvlJzENMUTUnBUY_et14hjKxaU6geBUaXepZMdHQLLdQIbEMzGdvJqAWEZKo8BM_kHVO_ZtYC4KC17ryHMVGIFie6n3yxoadHyEoUsNKjgumvmScVnlpwpVkHi7U_39rmKoDV36G0sXciStusQ5UEhUVaAIUG-eT0LNms7hzvuZnnXAPkISU_ZAvNpJ')`,
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent"></div>

        {/* Loading State */}
        {poisLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2 text-white">
              <span className="material-symbols-outlined text-4xl animate-spin">sync</span>
              <p>Đang tải POIs...</p>
            </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24 relative z-10">
        <div className="px-4 py-6">
          <h3 className="text-xl font-bold text-white mb-4">POIs gần bạn</h3>

          {nearbyPOIs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <span className="material-symbols-outlined text-6xl opacity-30 mb-2 block">location_searching</span>
              <p>Không có POI nào gần bạn</p>
              <p className="text-sm mt-1">Di chuyển đến Vĩnh Khánh để bắt đầu tour</p>
            </div>
          ) : (
            <div className="space-y-3">
              {nearbyPOIs.map((poi) => (
                <div
                  key={poi.id}
                  className="bg-surface-dark/50 rounded-xl p-4 border border-white/5"
                >
                  <div className="flex items-start gap-3">
                    {poi.image_url && (
                      <img
                        src={poi.image_url}
                        alt={getLocalizedPOI(poi, language).name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-bold text-white">{getLocalizedPOI(poi, language).name}</h4>
                      <p className="text-sm text-gray-400 line-clamp-2">{getLocalizedPOI(poi, language).description}</p>
                      <p className="text-xs text-primary mt-1">{poi.distance}m away</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Narration Overlay (Mini Player) */}
      {audioPlayer.currentItem && !showPlayerModal && (
        <NarrationOverlay
          currentPOI={audioPlayer.currentItem.poi}
          distance={nearbyPOIs.find(p => p.id === audioPlayer.currentItem?.poi.id)?.distance}
          isPlaying={audioPlayer.isPlaying}
          currentTime={audioPlayer.currentTime}
          duration={audioPlayer.duration}
          onExpand={() => setShowPlayerModal(true)}
        />
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
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background-dark/95 backdrop-blur-lg border-t border-white/5 pb-safe">
        <div className="flex h-16 items-center justify-around px-2">
          <button className="flex flex-1 flex-col items-center justify-center gap-1 text-primary">
            <span className="material-symbols-outlined text-[24px] fill-1">map</span>
            <span className="text-[10px] font-medium">Tour</span>
          </button>
          <button
            onClick={() => router.push('/browse')}
            className="flex flex-1 flex-col items-center justify-center gap-1 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">format_list_bulleted</span>
            <span className="text-[10px] font-medium">List</span>
          </button>
          <button className="flex flex-1 flex-col items-center justify-center gap-1 text-gray-500 hover:text-gray-300 transition-colors">
            <span className="material-symbols-outlined text-[24px]">bookmark_border</span>
            <span className="text-[10px] font-medium">Saved</span>
          </button>
          <button
            onClick={() => router.push('/settings')}
            className="flex flex-1 flex-col items-center justify-center gap-1 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">person</span>
            <span className="text-[10px] font-medium">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

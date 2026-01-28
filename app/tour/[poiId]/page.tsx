/**
 * POI Detail Page
 * T091, T093 - Trang chi tiết POI với manual audio play
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useAudioPlayer } from '@/lib/hooks/useAudioPlayer';
import { usePOIManager } from '@/lib/hooks/usePOIManager';
import { getLocalizedPOI } from '@/lib/utils/localization';
import { logAutoPlay } from '@/lib/services/analytics';
import { saveVisit } from '@/lib/services/storage';
import { Spinner } from '@/components/ui/Spinner';
import { Toast } from '@/components/ui/Toast';
import type { POI } from '@/lib/types/index';

export default function POIDetailPage() {
  const params = useParams();
  const router = useRouter();
  const poiId = params.poiId as string;
  const { language } = useLanguage();
  
  const { pois, isLoading } = usePOIManager({ language });
  const [poi, setPoi] = useState<POI | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToastMsg = useCallback((msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }, []);

  const audioPlayer = useAudioPlayer({
    autoPlay: false,
    enableTTSFallback: true,
    language,
    onError: () => showToastMsg('Lỗi phát audio, đang dùng giọng đọc tổng hợp'),
  });

  // Tìm POI từ danh sách
  useEffect(() => {
    if (pois.length > 0 && poiId) {
      const found = pois.find(p => p.id === poiId);
      setPoi(found || null);
    }
  }, [pois, poiId]);

  // Phát audio
  const handlePlay = useCallback(async () => {
    if (!poi) return;
    
    const localized = getLocalizedPOI(poi, language);
    
    audioPlayer.enqueue({
      poi,
      audioUrl: localized.audio_url,
      title: localized.name,
      description: localized.description,
      language,
    });

    // Log analytics
    await logAutoPlay(poi.id, language);
    
    // Save visit
    await saveVisit({
      poi_id: poi.id,
      poi_name: localized.name,
      visited_at: new Date().toISOString(),
      listened: true,
    });

    showToastMsg(`Đang phát: ${localized.name}`);
  }, [poi, language, audioPlayer, showToastMsg]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-dark">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!poi) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background-dark text-white p-4">
        <span className="material-symbols-outlined text-6xl text-muted mb-4">location_off</span>
        <h1 className="text-xl font-bold mb-2">Không tìm thấy địa điểm</h1>
        <p className="text-muted text-center mb-6">Địa điểm này có thể đã bị xóa hoặc không tồn tại.</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-3 bg-primary text-white rounded-lg font-medium"
        >
          Quay lại
        </button>
      </div>
    );
  }

  const localized = getLocalizedPOI(poi, language);

  return (
    <div className="min-h-screen bg-background-dark text-white flex flex-col">
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-4 pt-12 bg-gradient-to-b from-black/60 to-transparent absolute top-0 left-0 right-0">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center size-10 rounded-full bg-white/10 backdrop-blur-md"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <button className="flex items-center justify-center size-10 rounded-full bg-white/10 backdrop-blur-md">
          <span className="material-symbols-outlined">share</span>
        </button>
      </header>

      {/* Hero Image */}
      <div className="relative w-full aspect-[4/3]">
        {poi.image_url ? (
          <img
            src={poi.image_url}
            alt={localized.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-[#2a1e16] flex items-center justify-center">
            <span className="material-symbols-outlined text-8xl text-primary/30">restaurant</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="flex-1 px-4 -mt-16 relative z-10">
        {/* Title & Meta */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            {poi.priority && poi.priority <= 3 && (
              <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-bold rounded">
                #{poi.priority}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold mb-2">{localized.name}</h1>
          {poi.signature_dish && (
            <p className="text-primary text-sm font-medium">🍴 {poi.signature_dish}</p>
          )}
        </div>

        {/* Audio Player Card */}
        <div className="bg-[#2a1e16] rounded-xl p-4 mb-4 border border-white/5">
          {audioPlayer.currentItem?.poi.id === poi.id ? (
            <>
              {/* Progress Bar */}
              <div className="mb-3">
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(audioPlayer.currentTime / (audioPlayer.duration || 1)) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted mt-1">
                  <span>{formatTime(audioPlayer.currentTime)}</span>
                  <span>{formatTime(audioPlayer.duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={() => audioPlayer.seek(Math.max(0, audioPlayer.currentTime - 15))}
                  className="text-white/60 hover:text-white"
                >
                  <span className="material-symbols-outlined text-3xl">replay_10</span>
                </button>
                <button
                  onClick={() => audioPlayer.isPlaying ? audioPlayer.pause() : audioPlayer.play()}
                  className="size-14 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30"
                >
                  <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {audioPlayer.isPlaying ? 'pause' : 'play_arrow'}
                  </span>
                </button>
                <button
                  onClick={() => audioPlayer.seek(Math.min(audioPlayer.duration, audioPlayer.currentTime + 15))}
                  className="text-white/60 hover:text-white"
                >
                  <span className="material-symbols-outlined text-3xl">forward_10</span>
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={handlePlay}
              className="w-full flex items-center justify-center gap-3 py-3 bg-primary rounded-lg font-bold"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
              Nghe thuyết minh
            </button>
          )}
        </div>

        {/* Description */}
        <div className="mb-4">
          <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">description</span>
            Giới thiệu
          </h2>
          <p className="text-white/80 leading-relaxed">
            {localized.description || 'Chưa có mô tả cho địa điểm này.'}
          </p>
        </div>

        {/* Fun Fact */}
        {poi.fun_fact && (
          <div className="bg-primary/10 rounded-xl p-4 mb-4 border border-primary/20">
            <h3 className="text-sm font-bold text-primary mb-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">lightbulb</span>
              Bạn có biết?
            </h3>
            <p className="text-white/80 text-sm">{poi.fun_fact}</p>
          </div>
        )}

        {/* Hours */}
        {poi.estimated_hours && (
          <div className="flex items-center gap-2 text-muted text-sm mb-6">
            <span className="material-symbols-outlined text-lg">schedule</span>
            {poi.estimated_hours}
          </div>
        )}
      </div>

      {/* Bottom Safe Area */}
      <div className="h-24" />

      {/* Toast */}
      {showToast && (
        <div className="fixed top-20 left-4 right-4 z-50">
          <Toast message={toastMessage} type="info" onClose={() => setShowToast(false)} />
        </div>
      )}
    </div>
  );
}

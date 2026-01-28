/**
 * AudioPreloadIndicator Component
 * 
 * Hiển thị trạng thái preload audio files cho chế độ offline
 * 
 * Features:
 * - Progress bar cho quá trình download
 * - Auto-preload khi online
 * - Hiển thị số lượng audio đã cache
 * - Manual trigger preload
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from '@/lib/hooks/useTranslations';
import type { POI, Language, Coordinates } from '@/lib/types/index';
import { audioPreloader, type PreloadProgress } from '@/lib/services/audio-preloader';
import { loadPreloadStatus, type PreloadStatus } from '@/lib/services/storage';
import { Toast } from '@/components/ui/Toast';

export interface AudioPreloadIndicatorProps {
  /** POIs cần preload */
  pois: POI[];
  /** Ngôn ngữ hiện tại */
  language: Language;
  /** Vị trí hiện tại (để preload theo bán kính) */
  currentPosition?: Coordinates;
  /** Bán kính preload (meters) */
  preloadRadius?: number;
  /** Tự động preload khi online */
  autoPreload?: boolean;
  /** Compact mode (chỉ hiển thị icon) */
  compact?: boolean;
  /** Hiển thị UI (nếu false, chạy ngầm) */
  showUI?: boolean;
  /** Callback khi preload hoàn thành */
  onComplete?: () => void;
}

export function AudioPreloadIndicator({
  pois,
  language,
  currentPosition,
  preloadRadius = 500,
  autoPreload = true,
  compact = false,
  showUI = true,
  onComplete,
}: AudioPreloadIndicatorProps) {
  const { t } = useTranslations();

  const [progress, setProgress] = useState<PreloadProgress | null>(null);
  const [preloadStatus, setPreloadStatus] = useState<PreloadStatus | null>(null);
  const [isPreloading, setIsPreloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Load preload status on mount
  useEffect(() => {
    loadPreloadStatus().then(setPreloadStatus);
  }, []);

  // Auto preload khi online và có POIs
  useEffect(() => {
    if (!autoPreload || pois.length === 0 || isPreloading) return;
    if (!navigator.onLine) return;

    const shouldPreload = async () => {
      const status = await loadPreloadStatus();

      // Chỉ preload nếu:
      // 1. Chưa có status (lần đầu)
      // 2. Hoặc đã lâu không preload (> 24h)
      // 3. Hoặc số POIs thay đổi
      if (!status) return true;

      const daysSinceLastPreload = (Date.now() - status.lastPreloadTime) / (1000 * 60 * 60 * 24);
      if (daysSinceLastPreload > 1) return true;

      if (status.totalPOIs !== pois.length) return true;

      return false;
    };

    shouldPreload().then((should) => {
      if (should) {
        handlePreload();
      }
    });
  }, [pois, autoPreload, isPreloading]);

  const handlePreload = useCallback(async () => {
    if (isPreloading || pois.length === 0) return;

    setIsPreloading(true);
    setError(null);
    setShowSuccessToast(false);

    // Calculate total: audio + images
    const totalItems = pois.length * 2; // audio + image per POI
    setProgress({
      total: totalItems,
      completed: 0,
      pending: totalItems,
      failed: 0,
      percent: 0,
    });

    try {
      let completedCount = 0;

      // 1. Preload Audio
      await audioPreloader.preload(pois, {
        language,
        currentPosition,
        preloadRadius,
        preloadAll: preloadRadius > 2000,
        onProgress: (prog) => {
          completedCount = prog.completed;
          setProgress({
            total: totalItems,
            completed: completedCount,
            pending: totalItems - completedCount,
            failed: prog.failed,
            percent: Math.round((completedCount / totalItems) * 100),
          });
        },
        onComplete: async (result) => {
          console.log('Audio preload hoàn thành:', result);
        },
        onError: (err) => {
          console.error('Audio preload error:', err);
        },
      });

      // 2. Preload Images
      await audioPreloader.preloadImages(pois, {
        onProgress: (prog) => {
          completedCount = pois.length + prog.completed;
          setProgress({
            total: totalItems,
            completed: completedCount,
            pending: totalItems - completedCount,
            failed: prog.failed,
            percent: Math.round((completedCount / totalItems) * 100),
          });
        },
        onComplete: async (result) => {
          console.log('Image preload hoàn thành:', result);

          // Update status
          const status = await loadPreloadStatus();
          setPreloadStatus(status);
          onComplete?.();

          // Verify cache sau khi download
          await verifyCache();

          // Khi hoàn thành, ẩn progress và hiện toast
          setProgress(null);
          setIsPreloading(false);
          setShowSuccessToast(true);
        },
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
      setIsPreloading(false);
    }
  }, [pois, language, currentPosition, preloadRadius, isPreloading, onComplete]);

  // Verify cache để đảm bảo files thực sự có
  const verifyCache = async () => {
    try {
      // Verify audio cache
      const audioCache = await caches.open('flavorquest-audio-v1');
      const audioKeys = await audioCache.keys();
      console.log(`[Verify] Audio cache có ${audioKeys.length} files`);

      // Verify image cache
      const imageCache = await caches.open('flavorquest-images-v1');
      const imageKeys = await imageCache.keys();
      console.log(`[Verify] Image cache có ${imageKeys.length} files`);
    } catch (err) {
      console.error('[Verify] Lỗi khi verify cache:', err);
    }
  };

  // Nếu không hiển thị UI, return null
  if (!showUI) {
    return null;
  }

  // Toast Success
  if (showSuccessToast) {
    return (
      <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4">
        <Toast
          type="success"
          title={t('offline.successTitle') || 'Ready for Offline'}
          message={t('offline.successMessage') || 'Content downloaded successfully.'}
          onClose={() => setShowSuccessToast(false)}
          duration={4000}
        />
      </div>
    );
  }

  // Nếu đang preload, hiển thị progress
  if (progress && progress.total > 0) {
    return (
      <div className={`fixed ${compact ? 'bottom-20 right-4 w-auto' : 'bottom-24 left-4 right-4 md:left-auto md:right-4 md:w-80'} 
        bg-white/95 dark:bg-[#221710]/95 backdrop-blur-md rounded-2xl shadow-xl shadow-black/10 p-4 z-50 
        border border-orange-100 dark:border-orange-900/30 animate-slideInUp`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-5 h-5">
              <svg className="animate-spin text-orange-600 dark:text-orange-500 w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              {t('offline.downloadingContent') || 'Downloading assets...'}
            </span>
          </div>
          <span className="text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded-md">
            {progress.completed}/{progress.total}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mb-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-orange-500 to-amber-500 h-1.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress.percent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-medium">
          <span className="text-gray-500 dark:text-gray-400">
            {progress.percent}% Completed
          </span>
          {progress.failed > 0 && (
            <span className="text-red-500 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              {progress.failed} errors
            </span>
          )}
        </div>
      </div>
    );
  }

  // Nếu có lỗi
  if (error) {
    return (
      <div className="fixed bottom-24 right-4 bg-white dark:bg-[#221710] rounded-xl 
        shadow-xl shadow-red-500/10 p-4 z-50 border border-red-100 dark:border-red-900/30 max-w-xs animate-shake">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
              {t('offline.downloadError') || 'Download Failed'}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 break-words leading-relaxed">
              {error}
            </p>
            <button
              onClick={handlePreload}
              className="text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 4v6h-6"></path>
                <path d="M1 20v-6h6"></path>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              {t('offline.retry') || 'Try Again'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Nếu offline và chưa có cache, hiển thị warning
  if (!navigator.onLine && (!preloadStatus || preloadStatus.preloadedAudio.length === 0)) {
    return (
      <div className="fixed bottom-24 right-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl 
        shadow-xl p-4 z-50 border border-amber-200 dark:border-amber-800/50 max-w-xs animate-bounce-subtle">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 dark:text-amber-400">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
              Offline Mode
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              {t('offline.noAudioCache') || 'Connection lost. Some content may be unavailable.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

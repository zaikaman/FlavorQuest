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
  onComplete,
}: AudioPreloadIndicatorProps) {
  const { t } = useTranslations();
  
  const [progress, setProgress] = useState<PreloadProgress | null>(null);
  const [preloadStatus, setPreloadStatus] = useState<PreloadStatus | null>(null);
  const [isPreloading, setIsPreloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

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
    setProgress({
      total: 0,
      completed: 0,
      pending: 0,
      failed: 0,
      percent: 0,
    });

    try {
      await audioPreloader.preload(pois, {
        language,
        currentPosition,
        preloadRadius,
        preloadAll: false,
        onProgress: (prog) => {
          setProgress(prog);
        },
        onComplete: async (result) => {
          console.log('Preload hoàn thành:', result);
          const status = await loadPreloadStatus();
          setPreloadStatus(status);
          onComplete?.();
          
          // Tự động ẩn sau 5 giây khi thành công
          setTimeout(() => {
            setProgress(null);
            setIsPreloading(false);
          }, 5000);
        },
        onError: (err) => {
          setError(err.message);
          setIsPreloading(false);
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
      setIsPreloading(false);
    }
  }, [pois, language, currentPosition, preloadRadius, isPreloading, onComplete]);

  // Nếu đang preload, hiển thị progress
  if (progress && progress.total > 0) {
    return (
      <div className={`fixed ${compact ? 'bottom-20 right-4' : 'bottom-24 left-4 right-4'} 
        bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 z-50 
        border border-gray-200 dark:border-gray-700`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="material-icons text-blue-500 animate-spin">sync</span>
            <span className="font-medium text-sm">
              {t('offline.downloadingAudio') || 'Đang tải audio offline'}
            </span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {progress.completed}/{progress.total}
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600 dark:text-gray-400">
            {progress.percent}%
          </span>
          {progress.failed > 0 && (
            <span className="text-red-500">
              {progress.failed} lỗi
            </span>
          )}
        </div>
      </div>
    );
  }

  // Nếu không preload, hiển thị trạng thái cached
  if (!isPreloading && preloadStatus && preloadStatus.preloadedAudio.length > 0) {
    if (compact) {
      return (
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="fixed bottom-20 right-4 bg-green-500 text-white rounded-full p-3 shadow-lg z-50
            hover:bg-green-600 transition-colors"
          title={t('offline.audioReady') || 'Audio đã sẵn sàng offline'}
        >
          <span className="material-icons text-sm">download_done</span>
        </button>
      );
    }

    return (
      <div className={`fixed bottom-24 right-4 bg-green-50 dark:bg-green-900/20 
        rounded-lg shadow-lg p-3 z-50 border border-green-200 dark:border-green-800
        ${showDetails ? 'w-64' : 'w-auto'}`}>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 w-full text-left"
        >
          <span className="material-icons text-green-600 dark:text-green-400 text-sm">
            download_done
          </span>
          <span className="text-xs font-medium text-green-700 dark:text-green-300">
            {t('offline.audioReady') || 'Sẵn sàng offline'}
          </span>
        </button>
        
        {showDetails && (
          <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-800 text-xs">
            <div className="text-gray-700 dark:text-gray-300 space-y-1">
              <div>Audio: {preloadStatus.preloadedAudio.length}/{preloadStatus.totalPOIs}</div>
              <div>Hình ảnh: {preloadStatus.preloadedImages?.length || 0}/{preloadStatus.totalPOIs}</div>
              <div className="text-gray-500 dark:text-gray-400 text-xs">
                Cập nhật: {new Date(preloadStatus.lastPreloadTime).toLocaleDateString()}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePreload();
              }}
              className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white 
                py-1 px-2 rounded text-xs transition-colors"
            >
              {t('offline.updateCache') || 'Cập nhật cache'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Nếu có lỗi
  if (error) {
    return (
      <div className="fixed bottom-24 right-4 bg-red-50 dark:bg-red-900/20 rounded-lg 
        shadow-lg p-3 z-50 border border-red-200 dark:border-red-800 max-w-xs">
        <div className="flex items-start gap-2">
          <span className="material-icons text-red-600 dark:text-red-400 text-sm">error</span>
          <div className="flex-1">
            <div className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">
              {t('offline.downloadError') || 'Lỗi tải xuống'}
            </div>
            <div className="text-xs text-red-600 dark:text-red-400">{error}</div>
            <button
              onClick={handlePreload}
              className="mt-2 text-xs text-red-700 dark:text-red-300 underline"
            >
              {t('offline.retry') || 'Thử lại'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Nếu offline và chưa có cache, hiển thị warning
  if (!navigator.onLine && (!preloadStatus || preloadStatus.preloadedAudio.length === 0)) {
    return (
      <div className="fixed bottom-24 right-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg 
        shadow-lg p-3 z-50 border border-yellow-200 dark:border-yellow-800 max-w-xs">
        <div className="flex items-start gap-2">
          <span className="material-icons text-yellow-600 dark:text-yellow-400 text-sm">warning</span>
          <div className="text-xs text-yellow-700 dark:text-yellow-300">
            {t('offline.noAudioCache') || 'Chưa có audio offline. Kết nối mạng để tải xuống.'}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

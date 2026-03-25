/**
 * NarrationOverlay Component
 * Hiển thị POI info khi đang phát audio tự động
 * Based on design_template/active_audio_tour_dashboard/code.html
 */

'use client';

import { useEffect, useState } from 'react';
import type { POI } from '@/lib/types/index';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useTranslations } from '@/lib/hooks/useTranslations';
import { formatDistance } from '@/lib/utils/distance';
import { getLocalizedPOI } from '@/lib/utils/localization';

export interface NarrationOverlayProps {
  currentPOI: POI;
  distance?: number;
  isPlaying: boolean;
  isLoading?: boolean;
  currentTime: number;
  duration: number;
  onExpand?: () => void;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function NarrationOverlay({
  currentPOI,
  distance,
  isPlaying,
  isLoading = false,
  currentTime,
  duration,
  onExpand,
}: NarrationOverlayProps) {
  const { language } = useLanguage();
  const { t } = useTranslations();
  const localizedPOI = getLocalizedPOI(currentPOI, language);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const nextDistanceLabel = distance == null ? '' : formatDistance(distance, language);
  const [stableDistanceLabel, setStableDistanceLabel] = useState(nextDistanceLabel);

  useEffect(() => {
    if (!nextDistanceLabel) {
      setStableDistanceLabel('');
      return;
    }

    if (!stableDistanceLabel || stableDistanceLabel === nextDistanceLabel) {
      setStableDistanceLabel(nextDistanceLabel);
      return;
    }

    const timer = window.setTimeout(() => {
      setStableDistanceLabel(nextDistanceLabel);
    }, 900);

    return () => {
      window.clearTimeout(timer);
    };
  }, [nextDistanceLabel, stableDistanceLabel]);

  return (
    <div onClick={onExpand} className="fixed right-4 bottom-20 left-4 z-40 cursor-pointer">
      {/* Glass Panel */}
      <div className="flex transform items-center gap-3 rounded-xl border border-white/5 bg-[rgba(45,36,30,0.7)] p-3 shadow-lg backdrop-blur-md transition-all hover:scale-[1.02]">
        {/* POI Indicator Icon */}
        <div className="bg-seafood-green/20 text-seafood-green flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
          <span
            className={`material-symbols-outlined text-[20px] ${isLoading ? 'animate-spin' : ''}`}
          >
            {isLoading ? 'sync' : isPlaying ? 'graphic_eq' : 'location_on'}
          </span>
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-seafood-green text-[10px] font-bold tracking-wider uppercase">
            {isLoading ? t('audio.loading') : isPlaying ? t('audio.play') : t('tour.nearbyPOIs')}
          </span>
          <span className="truncate text-sm font-semibold text-white">{localizedPOI.name}</span>

          {/* Progress Bar */}
          {isPlaying && !isLoading && duration > 0 && (
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="font-mono text-[9px] text-white/60 tabular-nums">
                {formatTime(currentTime)}
              </span>
            </div>
          )}
        </div>

        {/* Distance Badge */}
        {stableDistanceLabel && (
          <div className="min-w-[4.5rem] rounded-full bg-white/10 px-2.5 py-1 text-center text-xs font-semibold text-white/70 tabular-nums">
            {stableDistanceLabel}
          </div>
        )}

        {/* Play/Pause Indicator */}
        {(isPlaying || isLoading) && (
          <div className="flex size-8 items-center justify-center">
            <span
              className={`material-symbols-outlined text-primary ${isLoading ? 'animate-spin' : 'animate-pulse'}`}
            >
              {isLoading ? 'sync' : 'graphic_eq'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

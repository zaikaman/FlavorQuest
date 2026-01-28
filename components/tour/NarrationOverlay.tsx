/**
 * NarrationOverlay Component
 * Hiển thị POI info khi đang phát audio tự động
 * Based on design_template/active_audio_tour_dashboard/code.html
 */

'use client';

import type { POI } from '@/lib/types/index';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useTranslations } from '@/lib/hooks/useTranslations';
import { getLocalizedPOI } from '@/lib/utils/localization';

export interface NarrationOverlayProps {
  currentPOI: POI;
  distance?: number;
  isPlaying: boolean;
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
  currentTime,
  duration,
  onExpand,
}: NarrationOverlayProps) {
  const { language } = useLanguage();
  const { t } = useTranslations();
  const localizedPOI = getLocalizedPOI(currentPOI, language);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      onClick={onExpand}
      className="fixed bottom-20 left-4 right-4 z-40 cursor-pointer"
    >
      {/* Glass Panel */}
      <div className="bg-[rgba(45,36,30,0.7)] backdrop-blur-md border border-white/5 rounded-xl p-3 flex items-center gap-3 shadow-lg transform transition-all hover:scale-[1.02]">
        {/* POI Indicator Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-seafood-green/20 text-seafood-green">
          <span className="material-symbols-outlined text-[20px]">
            {isPlaying ? 'graphic_eq' : 'location_on'}
          </span>
        </div>

        {/* Content */}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-seafood-green">
            {isPlaying ? t('audio.play') : t('tour.nearbyPOIs')}
          </span>
          <span className="truncate text-sm font-semibold text-white">
            {localizedPOI.name}
          </span>

          {/* Progress Bar */}
          {isPlaying && duration > 0 && (
            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="text-[9px] text-white/60 font-mono tabular-nums">
                {formatTime(currentTime)}
              </span>
            </div>
          )}
        </div>

        {/* Distance Badge */}
        {distance !== undefined && (
          <div className="text-xs font-medium text-white/60 bg-white/10 px-2 py-1 rounded">
            {distance}{t('units.meters')}
          </div>
        )}

        {/* Play/Pause Indicator */}
        {isPlaying && (
          <div className="flex size-8 items-center justify-center">
            <span className="material-symbols-outlined text-primary animate-pulse">
              graphic_eq
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

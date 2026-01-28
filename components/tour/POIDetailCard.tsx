/**
 * POIDetailCard Component  
 * T092 - Card hiển thị chi tiết POI
 */

'use client';

import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useTranslations } from '@/lib/hooks/useTranslations';
import { getLocalizedPOI } from '@/lib/utils/localization';
import type { POI } from '@/lib/types/index';

interface POIDetailCardProps {
  poi: POI;
  distance?: number | null;
  isPlaying?: boolean;
  onPlay: () => void;
  onClose: () => void;
  onViewDetail?: () => void;
}

export function POIDetailCard({
  poi,
  distance,
  isPlaying = false,
  onPlay,
  onClose,
  onViewDetail,
}: POIDetailCardProps) {
  const { language } = useLanguage();
  const { t } = useTranslations();
  const localized = getLocalizedPOI(poi, language);

  const formatDistance = (meters: number | null | undefined): string => {
    if (meters == null) return '';
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <div className="relative flex items-center gap-4 rounded-xl bg-[#2a1e16]/95 backdrop-blur-xl border border-white/5 p-3 shadow-2xl">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#493222] text-white shadow border border-white/10 hover:bg-[#5a4030] transition-colors active:scale-95"
        aria-label={t('common.close')}
      >
        <span className="material-symbols-outlined text-[16px]">close</span>
      </button>

      {/* POI Image */}
      <div 
        className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-700 relative shadow-inner cursor-pointer"
        onClick={onViewDetail}
      >
        {poi.image_url ? (
          <img
            src={poi.image_url}
            alt={localized.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#3a2d25]">
            <span className="material-symbols-outlined text-primary text-2xl">restaurant</span>
          </div>
        )}
      </div>

      {/* POI Content */}
      <div 
        className="flex flex-1 flex-col justify-center min-w-0 cursor-pointer"
        onClick={onViewDetail}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-white text-base font-bold leading-tight truncate">
            {localized.name}
          </h3>
          {poi.priority && poi.priority <= 3 && (
            <span className="flex h-5 items-center rounded bg-primary/20 px-1.5 text-[10px] font-bold text-primary uppercase">
              #{poi.priority}
            </span>
          )}
        </div>
        <p className="text-[#cba990] text-xs font-normal leading-relaxed truncate mt-0.5">
          Ẩm thực {distance != null && `• ${formatDistance(distance)}`}
        </p>
        {poi.signature_dish && (
          <p className="text-[10px] text-[#8d7b6f] truncate mt-1">
            🍴 {poi.signature_dish}
          </p>
        )}
      </div>

      {/* Play Button */}
      <button
        onClick={onPlay}
        className="group flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition-all active:scale-95 hover:bg-primary/90"
        aria-label={isPlaying ? t('audio.pause') : t('audio.play')}
      >
        <span
          className="material-symbols-outlined text-[28px] ml-0.5 group-hover:scale-110 transition-transform"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {isPlaying ? 'pause' : 'play_arrow'}
        </span>
      </button>
    </div>
  );
}

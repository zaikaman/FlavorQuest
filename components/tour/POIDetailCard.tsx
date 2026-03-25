'use client';

import Image from 'next/image';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useTranslations } from '@/lib/hooks/useTranslations';
import { formatDistance } from '@/lib/utils/distance';
import { getLocalizedPOI } from '@/lib/utils/localization';
import type { POI } from '@/lib/types/index';

interface POIDetailCardProps {
  poi: POI;
  distance?: number | null;
  isPlaying?: boolean;
  isLoading?: boolean;
  onPlay: () => void;
  onClose: () => void;
  onViewDetail?: () => void;
}

export function POIDetailCard({
  poi,
  distance,
  isPlaying = false,
  isLoading = false,
  onPlay,
  onClose,
  onViewDetail,
}: POIDetailCardProps) {
  const { language } = useLanguage();
  const { t } = useTranslations();
  const localized = getLocalizedPOI(poi, language);
  const distanceLabel = distance == null ? '' : formatDistance(distance, language);

  return (
    <div className="relative flex items-center gap-4 rounded-xl border border-white/5 bg-[#2a1e16]/95 p-3 shadow-2xl backdrop-blur-xl">
      <button
        onClick={onClose}
        className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-[#493222] text-white shadow transition-colors hover:bg-[#5a4030] active:scale-95"
        aria-label={t('common.close')}
      >
        <span className="material-symbols-outlined text-[16px]">close</span>
      </button>

      <div
        className="relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-lg bg-gray-700 shadow-inner"
        onClick={onViewDetail}
      >
        {poi.image_url ? (
          <Image
            src={poi.image_url}
            alt={localized.name}
            fill
            unoptimized
            className="absolute inset-0 object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#3a2d25]">
            <span className="material-symbols-outlined text-primary text-2xl">restaurant</span>
          </div>
        )}
      </div>

      <div
        className="flex min-w-0 flex-1 cursor-pointer flex-col justify-center"
        onClick={onViewDetail}
      >
        <div className="flex items-center gap-2">
          <h3 className="truncate text-base leading-tight font-bold text-white">
            {localized.name}
          </h3>
        </div>
        <p className="mt-0.5 truncate text-xs leading-relaxed font-normal text-[#cba990]">
          {t('poi.cuisine')}
          {distanceLabel ? ` | ${distanceLabel}` : ''}
        </p>
        {poi.signature_dish && (
          <p className="mt-1 truncate text-[10px] text-[#8d7b6f]">{poi.signature_dish}</p>
        )}
      </div>

      <button
        onClick={onPlay}
        className="group bg-primary shadow-primary/30 hover:bg-primary/90 flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-lg transition-all active:scale-95"
        aria-label={isLoading ? t('audio.loading') : isPlaying ? t('audio.pause') : t('audio.play')}
        disabled={isLoading}
      >
        <span
          className={`material-symbols-outlined text-[28px] transition-transform ${isLoading ? 'animate-spin' : 'ml-0.5 group-hover:scale-110'}`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {isLoading ? 'sync' : isPlaying ? 'pause' : 'play_arrow'}
        </span>
      </button>
    </div>
  );
}

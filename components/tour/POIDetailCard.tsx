'use client';

import Image from 'next/image';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useTranslations } from '@/lib/hooks/useTranslations';
import { formatDistance } from '@/lib/utils/distance';
import { getLocalizedPOI } from '@/lib/utils/localization';
import type { DeviceDetailCardVariant, POI } from '@/lib/types/index';

interface POIDetailCardProps {
  poi: POI;
  distance?: number | null;
  isPlaying?: boolean;
  isLoading?: boolean;
  onPlay: () => void;
  onClose: () => void;
  onViewDetail?: () => void;
  variant?: DeviceDetailCardVariant;
}

export function POIDetailCard({
  poi,
  distance,
  isPlaying = false,
  isLoading = false,
  onPlay,
  onClose,
  onViewDetail,
  variant = 'compact',
}: POIDetailCardProps) {
  const { language } = useLanguage();
  const { t } = useTranslations();
  const localized = getLocalizedPOI(poi, language);
  const distanceLabel = distance == null ? '' : formatDistance(distance, language);
  const isRich = variant === 'rich';

  return (
    <div
      className={`relative rounded-xl border shadow-2xl backdrop-blur-xl ${
        isRich
          ? 'border-primary/20 bg-[linear-gradient(135deg,rgba(53,36,25,0.96),rgba(32,22,16,0.94))] p-4'
          : 'border-white/5 bg-[#2a1e16]/95 p-3'
      }`}
    >
      <button
        onClick={onClose}
        className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-[#493222] text-white shadow transition-colors hover:bg-[#5a4030] active:scale-95"
        aria-label={t('common.close')}
      >
        <span className="material-symbols-outlined text-[16px]">close</span>
      </button>

      <div className={`flex items-center gap-4 ${isRich ? 'pr-10' : ''}`}>
        <div
          className={`relative shrink-0 cursor-pointer overflow-hidden bg-gray-700 shadow-inner ${
            isRich ? 'h-20 w-20 rounded-2xl' : 'h-16 w-16 rounded-lg'
          }`}
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
            <h3
              className={`leading-tight font-bold text-white ${isRich ? 'line-clamp-2 text-[1.02rem]' : 'truncate text-base'}`}
            >
              {localized.name}
            </h3>
          </div>
          <p
            className={`mt-0.5 leading-relaxed font-normal text-[#cba990] ${
              isRich ? 'text-sm' : 'truncate text-xs'
            }`}
          >
            {t('poi.cuisine')}
            {distanceLabel ? ` | ${distanceLabel}` : ''}
          </p>
          {poi.signature_dish && (
            <p
              className={`mt-1 text-[#d9b28f] ${isRich ? 'line-clamp-2 text-xs leading-relaxed' : 'truncate text-[10px]'}`}
            >
              {poi.signature_dish}
            </p>
          )}
          {isRich && localized.description && (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-white/68">
              {localized.description}
            </p>
          )}
        </div>

        <button
          onClick={onPlay}
          className={`group bg-primary shadow-primary/30 hover:bg-primary/90 flex shrink-0 items-center justify-center rounded-full text-white shadow-lg transition-all active:scale-95 ${
            isRich ? 'h-14 w-14' : 'h-12 w-12'
          }`}
          aria-label={isLoading ? t('audio.loading') : isPlaying ? t('audio.pause') : t('audio.play')}
          disabled={isLoading}
        >
          <span
            className={`material-symbols-outlined transition-transform ${isLoading ? 'animate-spin' : 'ml-0.5 group-hover:scale-110'} ${isRich ? 'text-[30px]' : 'text-[28px]'}`}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {isLoading ? 'sync' : isPlaying ? 'pause' : 'play_arrow'}
          </span>
        </button>
      </div>
    </div>
  );
}

/**
 * POIListView Component
 * Hiển thị danh sách POI dạng list/browse
 */

'use client';

import Image from 'next/image';
import { useState, useMemo } from 'react';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useTranslations } from '@/lib/hooks/useTranslations';
import { getLocalizedPOI } from '@/lib/utils/localization';
import { calculateDistance, formatDistance } from '@/lib/utils/distance';
import { CardSkeleton, Skeleton } from '@/components/ui/Loading';
import { type POICategoryTag } from '@/lib/constants/poiCategories';
import type { POI, Coordinates } from '@/lib/types/index';

interface POIListViewProps {
  pois: POI[];
  userLocation: Coordinates | null;
  onPlayPOI: (poi: POI) => void;
  onViewPOI: (poi: POI) => void;
  playingPOIId?: string | null;
  audioLoadingPOIId?: string | null;
  isOfflineReady?: boolean;
  isLoading?: boolean;
}

type SortOption = 'distance' | 'name';

const NEAR_ME_RADIUS_METERS = 3000;

const CATEGORY_KEYWORDS: Record<POICategoryTag, string[]> = {
  snails: ['ốc', 'oc', 'snail', 'snails', 'shellfish', 'escargot'],
  seafood: [
    'hải sản',
    'hai san',
    'seafood',
    'fish',
    'shrimp',
    'prawn',
    'crab',
    'squid',
    'octopus',
    'clam',
    'oyster',
    'mussel',
  ],
  grill: ['nướng', 'nuong', 'grill', 'grilled', 'bbq', 'barbecue', 'barbeque', 'roasted'],
};

export function POIListView({
  pois,
  userLocation,
  onPlayPOI,
  onViewPOI,
  playingPOIId,
  audioLoadingPOIId,
  isOfflineReady = false,
  isLoading = false,
}: POIListViewProps) {
  const { language } = useLanguage();
  const { t } = useTranslations();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('distance');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Sort and filter POIs
  const sortedPOIs = useMemo(() => {
    let filtered = [...pois];

    if (filterCategory === 'nearMe') {
      filtered = userLocation
        ? filtered.filter((poi) => {
            const distance = calculateDistance(userLocation, { lat: poi.lat, lng: poi.lng });
            return distance <= NEAR_ME_RADIUS_METERS;
          })
        : [];
    } else if (filterCategory !== 'all') {
      const selectedCategory = filterCategory as POICategoryTag;
      const keywords = CATEGORY_KEYWORDS[selectedCategory] ?? [];

      filtered = filtered.filter((poi) => {
        if (poi.category_tags?.includes(selectedCategory)) {
          return true;
        }

        const localized = getLocalizedPOI(poi, language);
        const haystack = [
          localized.name,
          localized.description,
          poi.signature_dish,
          poi.name_vi,
          poi.description_vi,
          poi.name_en,
          poi.description_en,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return keywords.some((keyword) => haystack.includes(keyword));
      });
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((poi) => {
        const localized = getLocalizedPOI(poi, language);
        return (
          localized.name.toLowerCase().includes(query) ||
          localized.description?.toLowerCase().includes(query) ||
          poi.signature_dish?.toLowerCase().includes(query)
        );
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          if (!userLocation) {
            return getLocalizedPOI(a, language).name.localeCompare(
              getLocalizedPOI(b, language).name
            );
          }
          const distA = calculateDistance(userLocation, { lat: a.lat, lng: a.lng });
          const distB = calculateDistance(userLocation, { lat: b.lat, lng: b.lng });
          return distA - distB;
        case 'name':
          return getLocalizedPOI(a, language).name.localeCompare(getLocalizedPOI(b, language).name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [filterCategory, pois, searchQuery, sortBy, userLocation, language]);

  const getDistanceLabel = (poi: POI): string => {
    if (!userLocation) return '';
    const meters = calculateDistance(userLocation, { lat: poi.lat, lng: poi.lng });
    return formatDistance(meters, language);
  };

  return (
    <div className="bg-background-dark flex h-full flex-col">
      {/* Header */}
      <div className="bg-background-dark/95 border-b border-white/5 px-4 py-3 backdrop-blur-md">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">{t('splash.subtitle')}</h1>
          <button
            onClick={() => setSortBy(sortBy === 'distance' ? 'name' : 'distance')}
            className="text-primary flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-lg">sort</span>
            <span className="text-sm font-bold uppercase">
              {sortBy === 'distance' ? t('tour.distance') : t('sort.az')}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <span className="material-symbols-outlined text-muted absolute top-1/2 left-3 -translate-y-1/2">
            search
          </span>
          <input
            type="text"
            placeholder={t('list.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="focus:ring-primary/50 h-11 w-full rounded-lg border-none bg-[#493222] pr-4 pl-10 text-white placeholder-[#cba990] focus:ring-2 focus:outline-none"
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="scrollbar-hide flex gap-2 overflow-x-auto px-4 py-3">
        {(isLoading
          ? ['1', '2', '3', '4', '5']
          : ['all', 'snails', 'seafood', 'grill', 'nearMe']
        ).map((catKey) =>
          isLoading ? (
            <Skeleton key={catKey} className="h-10 w-24 shrink-0 rounded-lg" />
          ) : (
            <button
              key={catKey}
              onClick={() => setFilterCategory(catKey)}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                filterCategory === catKey
                  ? 'bg-primary text-white'
                  : 'bg-[#493222] text-white hover:bg-[#5a4030]'
              }`}
            >
              {t(`categories.${catKey}`)}
            </button>
          )
        )}
      </div>

      {/* POI List */}
      <div className="flex-1 overflow-y-auto px-4 pb-20">
        {isLoading ? (
          <div className="space-y-4">
            <CardSkeleton lines={3} />
            <CardSkeleton lines={3} />
            <CardSkeleton lines={3} />
          </div>
        ) : sortedPOIs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="material-symbols-outlined text-muted mb-4 text-6xl">search_off</span>
            <h3 className="mb-2 text-lg font-bold text-white">{t('list.notFoundTitle')}</h3>
            <p className="text-muted text-sm">{t('list.notFoundDesc')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedPOIs.map((poi) => {
              const localized = getLocalizedPOI(poi, language);
              const isPlaying = playingPOIId === poi.id;
              const isAudioLoading = audioLoadingPOIId === poi.id;
              const distance = getDistanceLabel(poi);

              return (
                <div
                  key={poi.id}
                  className="group relative flex flex-col overflow-hidden rounded-xl border border-white/5 bg-[#2a1e16] shadow-md"
                >
                  {/* Image */}
                  <div
                    className="relative aspect-[16/9] w-full cursor-pointer overflow-hidden"
                    onClick={() => onViewPOI(poi)}
                  >
                    {poi.image_url ? (
                      <Image
                        src={poi.image_url}
                        alt={localized.name}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#3a2d25]">
                        <span className="material-symbols-outlined text-primary/30 text-6xl">
                          restaurant
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                    {/* Offline Badge */}
                    {isOfflineReady && (
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md">
                        <span className="material-symbols-outlined text-sm text-green-400">
                          check_circle
                        </span>
                        {t('list.offlineBadge')}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="relative p-4 pt-5">
                    {/* Play Button */}
                    <button
                      onClick={() => onPlayPOI(poi)}
                      disabled={isAudioLoading}
                      className={`absolute -top-6 right-4 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-all active:scale-95 ${
                        isPlaying ? 'bg-green-500' : 'bg-primary hover:bg-primary/90'
                      }`}
                      aria-label={
                        isAudioLoading
                          ? t('audio.loading')
                          : isPlaying
                            ? t('audio.pause')
                            : t('audio.play')
                      }
                    >
                      <span
                        className={`material-symbols-outlined text-2xl ${isAudioLoading ? 'animate-spin' : ''}`}
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {isAudioLoading ? 'sync' : isPlaying ? 'pause' : 'play_arrow'}
                      </span>
                    </button>

                    {/* Text Content */}
                    <div className="cursor-pointer pr-12" onClick={() => onViewPOI(poi)}>
                      <div className="mb-1 flex items-center gap-2">
                        <h3 className="truncate text-lg font-bold text-white">{localized.name}</h3>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[#cba990]">
                        {distance && <span className="text-primary font-bold">{distance}</span>}
                        {poi.signature_dish && (
                          <>
                            <span className="text-white/30">•</span>
                            <span className="truncate">{poi.signature_dish}</span>
                          </>
                        )}
                      </div>
                      {localized.description && (
                        <p className="mt-2 line-clamp-2 text-sm text-white/60">
                          {localized.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

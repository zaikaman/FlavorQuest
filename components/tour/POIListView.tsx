/**
 * POIListView Component
 * Hiển thị danh sách POI dạng list/browse
 */

'use client';

import { useState, useMemo } from 'react';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useTranslations } from '@/lib/hooks/useTranslations';
import { getLocalizedPOI } from '@/lib/utils/localization';
import { calculateDistance } from '@/lib/utils/distance';
import type { POI, Coordinates } from '@/lib/types/index';

interface POIListViewProps {
  pois: POI[];
  userLocation: Coordinates | null;
  onPlayPOI: (poi: POI) => void;
  onViewPOI: (poi: POI) => void;
  playingPOIId?: string | null;
  isOfflineReady?: boolean;
}

type SortOption = 'distance' | 'priority' | 'name';

export function POIListView({
  pois,
  userLocation,
  onPlayPOI,
  onViewPOI,
  playingPOIId,
  isOfflineReady = false,
}: POIListViewProps) {
  const { language } = useLanguage();
  const { t } = useTranslations();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('distance');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Sort and filter POIs
  const sortedPOIs = useMemo(() => {
    let filtered = [...pois];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(poi => {
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
          if (!userLocation) return 0;
          const distA = calculateDistance(userLocation, { lat: a.lat, lng: a.lng });
          const distB = calculateDistance(userLocation, { lat: b.lat, lng: b.lng });
          return distA - distB;
        case 'priority':
          return (a.priority || 99) - (b.priority || 99);
        case 'name':
          return getLocalizedPOI(a, language).name.localeCompare(getLocalizedPOI(b, language).name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [pois, searchQuery, sortBy, userLocation, language]);

  const formatDistance = (poi: POI): string => {
    if (!userLocation) return '';
    const meters = calculateDistance(userLocation, { lat: poi.lat, lng: poi.lng });
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <div className="flex flex-col h-full bg-background-dark pt-16">
      {/* Header */}
      <div className="sticky top-16 z-20 bg-background-dark/95 backdrop-blur-md border-b border-white/5 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-white">{t('splash.subtitle')}</h1>
          <button 
            onClick={() => setSortBy(sortBy === 'distance' ? 'priority' : sortBy === 'priority' ? 'name' : 'distance')}
            className="flex items-center gap-1.5 text-primary"
          >
            <span className="material-symbols-outlined text-lg">sort</span>
            <span className="text-sm font-bold uppercase">
              {sortBy === 'distance' ? t('tour.distance') : sortBy === 'priority' ? t('tour.priority') : 'A-Z'}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-muted">
            search
          </span>
          <input
            type="text"
            placeholder="Tìm ốc, hải sản, bánh mì..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-lg bg-[#493222] border-none text-white placeholder-[#cba990] focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
        {['all', 'Ốc', 'Hải sản', 'Nướng', 'Gần tôi'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterCategory === cat
                ? 'bg-primary text-white'
                : 'bg-[#493222] text-white hover:bg-[#5a4030]'
            }`}
          >
            {cat === 'all' ? 'Tất cả' : cat}
          </button>
        ))}
      </div>

      {/* POI List */}
      <div className="flex-1 overflow-y-auto px-4 pb-20">
        {sortedPOIs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="material-symbols-outlined text-6xl text-muted mb-4">search_off</span>
            <h3 className="text-white font-bold text-lg mb-2">Không tìm thấy</h3>
            <p className="text-muted text-sm">Thử tìm kiếm với từ khóa khác</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedPOIs.map((poi) => {
              const localized = getLocalizedPOI(poi, language);
              const isPlaying = playingPOIId === poi.id;
              const distance = formatDistance(poi);
              
              return (
                <div
                  key={poi.id}
                  className="group relative flex flex-col overflow-hidden rounded-xl bg-[#2a1e16] border border-white/5 shadow-md"
                >
                  {/* Image */}
                  <div 
                    className="relative aspect-[16/9] w-full overflow-hidden cursor-pointer"
                    onClick={() => onViewPOI(poi)}
                  >
                    {poi.image_url ? (
                      <img
                        src={poi.image_url}
                        alt={localized.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#3a2d25] flex items-center justify-center">
                        <span className="material-symbols-outlined text-6xl text-primary/30">restaurant</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    
                    {/* Offline Badge */}
                    {isOfflineReady && (
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-xs font-medium text-white">
                        <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
                        Offline
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="relative p-4 pt-5">
                    {/* Play Button */}
                    <button
                      onClick={() => onPlayPOI(poi)}
                      className={`absolute -top-6 right-4 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-all active:scale-95 ${
                        isPlaying ? 'bg-green-500' : 'bg-primary hover:bg-primary/90'
                      }`}
                    >
                      <span 
                        className="material-symbols-outlined text-2xl"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {isPlaying ? 'pause' : 'play_arrow'}
                      </span>
                    </button>

                    {/* Text Content */}
                    <div 
                      className="pr-12 cursor-pointer"
                      onClick={() => onViewPOI(poi)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-white truncate">{localized.name}</h3>
                        {poi.priority && poi.priority <= 3 && (
                          <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded">
                            #{poi.priority}
                          </span>
                        )}
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
                        <p className="mt-2 text-sm text-white/60 line-clamp-2">
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

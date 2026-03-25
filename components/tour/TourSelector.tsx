'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useTranslations } from '@/lib/hooks/useTranslations';
import { getLocalizedTour } from '@/lib/utils/localization';
import { CardSkeleton, Skeleton } from '@/components/ui/Loading';
import type { Tour } from '@/lib/types/index';

const TOUR_SELECTOR_COLLAPSED_KEY = 'flavorquest-tour-selector-collapsed';

interface TourSelectorProps {
  tours: Tour[];
  selectedTourId: string | null;
  onSelectTour: (tourId: string | null) => void;
  filteredPOICount: number;
  totalPOICount: number;
  isLoading?: boolean;
}

export function TourSelector({
  tours,
  selectedTourId,
  onSelectTour,
  filteredPOICount,
  totalPOICount,
  isLoading = false,
}: TourSelectorProps) {
  const { language } = useLanguage();
  const { t } = useTranslations();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      return window.localStorage.getItem(TOUR_SELECTOR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const selectedTour = useMemo(
    () => tours.find((tour) => tour.id === selectedTourId) ?? null,
    [selectedTourId, tours]
  );

  const localizedTours = useMemo(
    () => tours.map((tour) => ({ ...tour, localized: getLocalizedTour(tour, language) })),
    [language, tours]
  );

  const selectedLocalizedTour = useMemo(
    () => localizedTours.find((tour) => tour.id === selectedTourId) ?? null,
    [localizedTours, selectedTourId]
  );

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const nextValue = !prev;

      try {
        window.localStorage.setItem(TOUR_SELECTOR_COLLAPSED_KEY, String(nextValue));
      } catch {
        // noop
      }

      return nextValue;
    });
  };

  return (
    <div className="px-4 pt-2 pb-3">
      <div className="rounded-2xl border border-white/10 bg-black/25 p-4 shadow-lg backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">{t('tourSelector.title')}</p>
            <p className="mt-1 text-xs text-white/60">{t('tourSelector.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedTour && !isCollapsed && (
              <button
                onClick={() => onSelectTour(null)}
                className="border-primary/30 bg-primary/10 text-primary rounded-full border px-3 py-1 text-xs font-semibold"
              >
                {t('tourSelector.clear')}
              </button>
            )}
            <button
              onClick={toggleCollapsed}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10"
              aria-expanded={!isCollapsed}
            >
              <span className="material-symbols-outlined text-base leading-none">
                {isCollapsed ? 'expand_more' : 'expand_less'}
              </span>
              {isCollapsed ? t('tourSelector.show') : t('tourSelector.hide')}
            </button>
          </div>
        </div>

        <div className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-xs text-white/70">
          {selectedTour
            ? t('tourSelector.selectedSummary', { count: String(filteredPOICount) })
            : t('tourSelector.allSummary', { count: String(totalPOICount) })}
        </div>

        {isCollapsed && selectedLocalizedTour && (
          <div className="border-primary/20 bg-primary/10 mt-3 flex items-center justify-between gap-3 rounded-xl border px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {selectedLocalizedTour.localized.name}
              </p>
              <p className="text-xs text-white/60">{t('tourSelector.collapsedHint')}</p>
            </div>
            <button
              onClick={() => onSelectTour(null)}
              className="border-primary/30 bg-primary/10 text-primary shrink-0 rounded-full border px-3 py-1 text-xs font-semibold"
            >
              {t('tourSelector.clear')}
            </button>
          </div>
        )}

        {isCollapsed && !selectedTour && (
          <p className="mt-3 text-xs text-white/50">{t('tourSelector.collapsedHint')}</p>
        )}

        {!isCollapsed && (
          <>
            <div className="scrollbar-hide mt-3 flex gap-3 overflow-x-auto pb-1">
              {isLoading && tours.length === 0 ? (
                <>
                  <div className="min-w-[220px] shrink-0 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="mt-3 h-3 w-full rounded-full" />
                    <Skeleton className="mt-2 h-3 w-2/3 rounded-full" />
                  </div>
                  <CardSkeleton className="min-w-[260px] shrink-0" lines={2} />
                  <CardSkeleton className="min-w-[260px] shrink-0" lines={2} />
                </>
              ) : (
                <>
                  <button
                    onClick={() => onSelectTour(null)}
                    className={`min-w-[220px] shrink-0 rounded-2xl border p-4 text-left transition-colors ${
                      !selectedTourId
                        ? 'border-primary bg-primary/15 text-white'
                        : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{t('tourSelector.allOption')}</p>
                      <span className="text-primary rounded-full bg-black/30 px-2 py-1 text-[11px] font-semibold">
                        {t('tourSelector.poiCount', { count: String(totalPOICount) })}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-white/60">{t('tourSelector.allDescription')}</p>
                  </button>

                  {localizedTours.map((tour) => {
                    const isSelected = selectedTourId === tour.id;

                    return (
                      <button
                        key={tour.id}
                        onClick={() => onSelectTour(tour.id)}
                        className={`min-w-[260px] shrink-0 overflow-hidden rounded-2xl border text-left transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary/15 text-white'
                            : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
                        }`}
                      >
                        <div className="relative aspect-[16/9] w-full bg-[#2c1e16]">
                          {tour.localized.cover_image_url ? (
                            <Image
                              src={tour.localized.cover_image_url}
                              alt={tour.localized.name}
                              fill
                              unoptimized
                              className="object-cover"
                            />
                          ) : (
                            <div className="from-primary/20 text-primary/60 flex h-full w-full items-center justify-center bg-gradient-to-br to-[#2c1e16]">
                              <span className="material-symbols-outlined text-5xl">route</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          <div className="absolute right-3 bottom-3 left-3 flex items-end justify-between gap-3">
                            <p className="line-clamp-2 font-semibold text-white">
                              {tour.localized.name}
                            </p>
                            <span
                              className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${isSelected ? 'bg-primary/20 text-primary' : 'bg-black/40 text-white/80'}`}
                            >
                              {t('tourSelector.poiCount', { count: String(tour.poi_ids.length) })}
                            </span>
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                            {typeof tour.localized.estimated_duration_min === 'number' &&
                              tour.localized.estimated_duration_min > 0 && (
                                <span className="rounded-full bg-white/5 px-2.5 py-1">
                                  {t('tourSelector.duration', {
                                    count: String(tour.localized.estimated_duration_min),
                                  })}
                                </span>
                              )}
                          </div>
                          {tour.localized.description && (
                            <p className="mt-3 line-clamp-2 text-sm text-white/60">
                              {tour.localized.description}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            {!isLoading && tours.length === 0 && (
              <p className="mt-3 text-sm text-white/60">{t('tourSelector.empty')}</p>
            )}
          </>
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

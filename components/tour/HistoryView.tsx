/**
 * HistoryView Component
 * T099-T101 - Hiển thị visited POIs với replay
 */

'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useTranslations } from '@/lib/hooks/useTranslations';
import { usePOIManager } from '@/lib/hooks/usePOIManager';
import { loadVisitHistory } from '@/lib/services/storage';
import { getLocalizedPOI } from '@/lib/utils/localization';
import { FeedSkeleton } from '@/components/ui/Loading';
import type { VisitHistoryEntry, POI } from '@/lib/types/index';

interface HistoryViewProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayPOI: (poi: POI) => void;
  onViewPOI?: (poi: POI) => void;
}

interface HistoryItemWithPOI extends VisitHistoryEntry {
  poi?: POI;
}

export function HistoryView({ isOpen, onClose, onPlayPOI, onViewPOI }: HistoryViewProps) {
  const { language } = useLanguage();
  const { t } = useTranslations();
  const { pois } = usePOIManager({ language });
  const [history, setHistory] = useState<HistoryItemWithPOI[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load history
  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const entries = await loadVisitHistory();

        // Merge with POI data
        const withPOI = entries.map((entry) => ({
          ...entry,
          poi: pois.find((p) => p.id === entry.poi_id),
        }));

        // Sort by visited_at descending (most recent first)
        withPOI.sort((a, b) => new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime());

        // Remove duplicates (keep most recent for each POI)
        const seen = new Set<string>();
        const unique = withPOI.filter((item) => {
          if (seen.has(item.poi_id)) return false;
          seen.add(item.poi_id);
          return true;
        });

        setHistory(unique);
      } catch (error) {
        console.error('Failed to load history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen && pois.length > 0) {
      load();
    }
  }, [isOpen, pois]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // Less than 1 hour
    if (diff < 60 * 60 * 1000) {
      const mins = Math.floor(diff / 60000);
      return mins <= 1 ? t('history.justNow') : t('history.minsAgo', { mins });
    }

    // Today
    if (date.toDateString() === now.toDateString()) {
      return t('history.today', {
        time: date.toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      });
    }

    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return t('history.yesterday', {
        time: date.toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      });
    }

    // Older
    return date.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="animate-slideUp relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-[32px] border-t border-white/5 bg-[#150f0d] shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab Handle */}
        <div className="absolute top-0 right-0 left-0 z-20 flex justify-center py-3">
          <div className="h-1.5 w-12 rounded-full bg-white/10" />
        </div>

        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-white/5 bg-[#150f0d]/90 px-6 pt-8 pb-5 backdrop-blur-xl">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-3xl font-black tracking-tight text-white drop-shadow-sm">
                {t('history.title')}
              </h2>
              <div className="flex items-center gap-2">
                <span className="bg-primary flex h-1.5 w-1.5 animate-pulse rounded-full shadow-[0_0_8px_var(--primary)]"></span>
                <p className="text-[11px] font-bold tracking-[0.2em] text-[#a68a77] uppercase">
                  {history.length} {t('history.visited')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="group mt-1 flex h-10 w-10 items-center justify-center rounded-full border border-white/5 bg-white/5 text-white/70 transition-all hover:bg-white/10 hover:text-white active:scale-95"
            >
              <span className="material-symbols-outlined text-xl transition-transform duration-300 group-hover:rotate-90">
                close
              </span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-4 py-6 pb-[calc(env(safe-area-inset-bottom,20px)+40px)]">
          {isLoading ? (
            <FeedSkeleton items={4} className="py-4" />
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
              <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/5 to-transparent shadow-2xl backdrop-blur-md">
                <span className="material-symbols-outlined text-5xl text-white/30 drop-shadow-lg">
                  headphones_off
                </span>
                <div className="bg-primary/10 absolute inset-0 rounded-[2rem] opacity-30 blur-xl"></div>
              </div>
              <h3 className="mb-2 text-xl font-bold tracking-tight text-white">
                {t('history.empty')}
              </h3>
              <p className="max-w-[260px] text-sm leading-relaxed text-[#a68a77]">
                {t('welcome.step3')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item) => {
                if (!item.poi) return null;
                const localized = getLocalizedPOI(item.poi, language);

                return (
                  <div
                    key={`${item.poi_id}-${item.visited_at}`}
                    className="group relative flex items-center gap-4 overflow-hidden rounded-3xl border border-white/[0.04] bg-white/[0.02] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/10 hover:bg-white/[0.06]"
                  >
                    {/* Decorative ambient glow on hover */}
                    <div className="from-primary/10 pointer-events-none absolute inset-0 bg-gradient-to-r via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                    {/* Image - FIXED BUG HERE WITH `relative` */}
                    <div
                      className="relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-[1.25rem] border border-white/5 bg-[#2a1d17] shadow-[0_8px_16px_-6px_rgba(0,0,0,0.5)] transition-all duration-300 group-hover:shadow-[0_8px_20px_-6px_var(--primary-glow,rgba(234,88,12,0.3))]"
                      onClick={() => onViewPOI?.(item.poi!)}
                    >
                      {item.poi.image_url ? (
                        <Image
                          src={item.poi.image_url}
                          alt={localized.name}
                          fill
                          unoptimized
                          className="object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#3a2d25] to-[#2a1d17]">
                          <span className="material-symbols-outlined text-2xl text-white/20">
                            restaurant
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div
                      className="min-w-0 flex-1 cursor-pointer py-1"
                      onClick={() => onViewPOI?.(item.poi!)}
                    >
                      <h4 className="group-hover:text-primary truncate text-lg font-bold tracking-tight text-white transition-colors duration-300">
                        {localized.name}
                      </h4>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] text-white/30">
                          schedule
                        </span>
                        <p className="text-[13px] font-medium text-white/50">
                          {formatDate(item.visited_at)}
                        </p>
                      </div>

                      {item.listened && (
                        <div className="mt-2.5 flex w-max items-center gap-1 rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 shadow-sm">
                          <span className="material-symbols-outlined text-[10px] text-green-400">
                            graphic_eq
                          </span>
                          <span className="text-[9px] font-black tracking-widest text-green-400 uppercase">
                            {t('history.listened')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Replay Button */}
                    <button
                      onClick={() => onPlayPOI(item.poi!)}
                      className="hover:bg-primary hover:border-primary relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80 shadow-sm transition-all duration-300 group-hover:shadow-md hover:scale-[1.05] hover:text-[#1a1311] active:scale-95"
                      aria-label="Phát lại"
                    >
                      <span
                        className="material-symbols-outlined text-2xl"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        replay
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slideUp {
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}

/**
 * HistoryView Component
 * T099-T101 - Hiển thị visited POIs với replay
 */

'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { usePOIManager } from '@/lib/hooks/usePOIManager';
import { loadVisitHistory } from '@/lib/services/storage';
import { getLocalizedPOI } from '@/lib/utils/localization';
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
        const withPOI = entries.map(entry => ({
          ...entry,
          poi: pois.find(p => p.id === entry.poi_id),
        }));
        
        // Sort by visited_at descending (most recent first)
        withPOI.sort((a, b) => new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime());
        
        // Remove duplicates (keep most recent for each POI)
        const seen = new Set<string>();
        const unique = withPOI.filter(item => {
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
      return mins <= 1 ? 'Vừa xong' : `${mins} phút trước`;
    }
    
    // Today
    if (date.toDateString() === now.toDateString()) {
      return `Hôm nay, ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Hôm qua, ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Older
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="absolute bottom-0 left-0 right-0 bg-background-dark rounded-t-2xl max-h-[85vh] overflow-hidden animate-slideUp"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background-dark border-b border-white/5 px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Lịch sử</h2>
              <p className="text-sm text-muted">{history.length} địa điểm đã nghe</p>
            </div>
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white hover:bg-white/10"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 pb-12">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <span className="material-symbols-outlined text-primary animate-spin text-3xl">sync</span>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="material-symbols-outlined text-6xl text-muted mb-4">headphones_off</span>
              <h3 className="text-white font-bold text-lg mb-2">Chưa có lịch sử</h3>
              <p className="text-muted text-sm">
                Bắt đầu tour để nghe thuyết minh về các địa điểm ẩm thực.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => {
                if (!item.poi) return null;
                
                const localized = getLocalizedPOI(item.poi, language);
                
                return (
                  <div
                    key={`${item.poi_id}-${item.visited_at}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5"
                  >
                    {/* Image */}
                    <div 
                      className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#3a2d25] cursor-pointer"
                      onClick={() => onViewPOI?.(item.poi!)}
                    >
                      {item.poi.image_url ? (
                        <img
                          src={item.poi.image_url}
                          alt={localized.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary text-xl">restaurant</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => onViewPOI?.(item.poi!)}
                    >
                      <h4 className="text-white font-medium truncate">{localized.name}</h4>
                      <p className="text-xs text-muted mt-0.5">{formatDate(item.visited_at)}</p>
                      {item.listened && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-500 mt-1">
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          Đã nghe
                        </span>
                      )}
                    </div>

                    {/* Replay Button */}
                    <button
                      onClick={() => onPlayPOI(item.poi!)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary hover:bg-primary hover:text-white transition-colors"
                      aria-label="Phát lại"
                    >
                      <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
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
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

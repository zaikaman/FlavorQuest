/**
 * AudioPlayer Component
 * Now Playing UI với playback controls
 * Based on design_template/now_playing_detailed_player/code.html
 */

'use client';

import { useCallback } from 'react';
import type { POI } from '@/lib/types/index';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useTranslations } from '@/lib/hooks/useTranslations';
import { getLocalizedPOI } from '@/lib/utils/localization';

export interface AudioPlayerProps {
  currentPOI: POI | null;
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  nextPOI?: POI | null;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onSkipNext: () => void;
  onSkipPrevious: () => void;
  onClose?: () => void;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function AudioPlayer({
  currentPOI,
  isPlaying,
  currentTime,
  duration,
  volume,
  nextPOI,
  onPlay,
  onPause,
  onSeek,
  onVolumeChange,
  onSkipNext,
  onClose,
}: AudioPlayerProps) {
  const { language } = useLanguage();
  const { t } = useTranslations();

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    onSeek(newTime);
  }, [duration, onSeek]);

  const handleVolumeChange = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    onVolumeChange(Math.max(0, Math.min(1, percent)));
  }, [onVolumeChange]);

  if (!currentPOI) {
    return null;
  }

  const localizedPOI = getLocalizedPOI(currentPOI, language);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="relative flex flex-col h-screen w-full max-w-md mx-auto bg-background-light dark:bg-background-dark shadow-2xl overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute top-0 left-0 w-full h-[60vh] bg-gradient-to-b from-[#3a281e] to-background-dark opacity-40 pointer-events-none z-0"></div>

      {/* Navigation Header */}
      <header className="relative z-10 flex items-center justify-between p-4 pt-6 bg-gradient-to-b from-black/50 to-transparent">
        <button
          onClick={onClose}
          className="flex items-center justify-center size-10 rounded-full bg-white/5 active:bg-white/10 transition-colors text-white"
        >
          <span className="material-symbols-outlined text-3xl">keyboard_arrow_down</span>
        </button>
        <div className="flex flex-col items-center">
          <span className="text-xs font-medium text-white/60 uppercase tracking-widest">{t('audio.play')}</span>
          <span className="text-sm font-bold text-white">{t('app.tagline')}</span>
        </div>
        <button className="flex items-center justify-center size-10 rounded-full bg-white/5 active:bg-white/10 transition-colors text-white">
          <span className="material-symbols-outlined">queue_music</span>
        </button>
      </header>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide relative z-10 pb-32">
        {/* Hero Visual */}
        <div className="px-6 pt-2 pb-6 w-full">
          <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden shadow-2xl border border-white/5 group">
            {/* Image */}
            {currentPOI.image_url ? (
              <img
                src={currentPOI.image_url}
                alt={localizedPOI.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-background-dark"></div>
            )}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

            {/* Location Badge */}
            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-white/10">
              <span className="material-symbols-outlined text-primary text-sm">location_on</span>
              <span className="text-xs font-medium text-white">{t('poi.district4')}</span>
            </div>
          </div>
        </div>

        {/* Meta Information */}
        <div className="px-6 flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white leading-tight mb-1">{localizedPOI.name}</h1>
            <p className="text-primary font-medium text-sm">{localizedPOI.description}</p>
          </div>
          <div className="flex flex-col gap-3">
            <button className="text-white/70 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[28px]">favorite_border</span>
            </button>
            <button className="text-white/70 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[28px]">share</span>
            </button>
          </div>
        </div>

        {/* Audio Controls Section */}
        <div className="px-6 mt-8">
          {/* Seeker */}
          <div className="w-full group/seeker cursor-pointer" onClick={handleSeek}>
            <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="absolute top-0 left-0 h-full bg-primary rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
            {/* Thumb */}
            <div className="relative w-full h-0">
              <div
                className="absolute -top-3 size-4 bg-white rounded-full shadow-md scale-0 group-hover/seeker:scale-100 transition-transform duration-200"
                style={{ left: `${progress}%`, transform: 'translateX(-50%)' }}
              ></div>
            </div>
            <div className="flex justify-between items-center mt-2 text-xs font-medium text-white/50">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Main Buttons */}
          <div className="flex items-center justify-between mt-6 mb-8">
            <button className="text-white/40 hover:text-white transition-colors opacity-30 cursor-not-allowed">
              <span className="material-symbols-outlined text-2xl">shuffle</span>
            </button>
            <div className="flex items-center gap-6">
              <button
                onClick={onSkipNext}
                className="text-white hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-4xl fill-1">skip_previous</span>
              </button>
              <button
                onClick={isPlaying ? onPause : onPlay}
                className="size-16 rounded-full bg-primary text-white flex items-center justify-center shadow-[0_4px_20px_rgba(242,108,13,0.4)] hover:scale-105 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-4xl fill-1">
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
              </button>
              <button
                onClick={onSkipNext}
                className="text-white hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-4xl fill-1">skip_next</span>
              </button>
            </div>
            <button className="text-primary hover:text-primary/80 transition-colors opacity-30 cursor-not-allowed relative">
              <span className="material-symbols-outlined text-2xl">repeat</span>
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center justify-center gap-8 mb-6">
            <button className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-xs font-semibold text-white/80 hover:bg-white/10">
              1.0x
            </button>
            <div
              className="flex items-center gap-2 w-24 group/vol cursor-pointer"
              onClick={handleVolumeChange}
            >
              <span className="material-symbols-outlined text-white/50 text-sm">volume_up</span>
              <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/40 group-hover/vol:bg-primary transition-colors"
                  style={{ width: `${volume * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Transcript Drawer */}
        {localizedPOI.description && (
          <div className="px-6 mt-4">
            <div className="bg-surface-dark/50 rounded-xl p-5 border border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-primary text-lg">description</span>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">{t('poi.transcript')}</h3>
              </div>
              <div className="prose prose-invert prose-sm max-w-none">
                <p className="text-white/70 leading-relaxed whitespace-pre-line">
                  {localizedPOI.description}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Up Next Preview */}
      {nextPOI && (
        <div className="absolute bottom-0 left-0 w-full z-30">
          <div className="bg-[rgba(46,33,26,0.6)] backdrop-blur-md border-t border-white/10 p-4 pb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{t('poi.upNext')}</span>
              <span className="text-[10px] font-medium text-white/40">{t('poi.estimatedWalk')}</span>
            </div>
            <div className="flex items-center gap-3 bg-white/5 p-2 rounded-lg border border-white/5 hover:bg-white/10 transition-colors cursor-pointer">
              {/* Thumbnail */}
              {nextPOI.image_url ? (
                <img
                  src={nextPOI.image_url}
                  alt={getLocalizedPOI(nextPOI, language).name}
                  className="size-12 rounded bg-cover bg-center shrink-0 object-cover"
                />
              ) : (
                <div className="size-12 rounded bg-primary/20 shrink-0"></div>
              )}

              {/* Text Info */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white truncate">
                  {getLocalizedPOI(nextPOI, language).name}
                </h4>
                <p className="text-xs text-white/50 truncate">
                  {getLocalizedPOI(nextPOI, language).description}
                </p>
              </div>

              {/* Action */}
              <button className="size-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-primary hover:text-white transition-colors">
                <span className="material-symbols-outlined text-lg">play_arrow</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

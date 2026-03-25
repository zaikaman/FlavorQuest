/**
 * AudioPlayer Component
 * Now Playing UI với playback controls
 * Based on design_template/now_playing_detailed_player/code.html
 */

'use client';

import Image from 'next/image';
import { useCallback } from 'react';
import type { POI } from '@/lib/types/index';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useTranslations } from '@/lib/hooks/useTranslations';
import { getLocalizedPOI } from '@/lib/utils/localization';

export interface AudioPlayerProps {
  currentPOI: POI | null;
  isPlaying: boolean;
  isPaused: boolean;
  isLoading?: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isRepeatEnabled: boolean;
  nextPOI?: POI | null;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onPlaybackRateChange: () => void;
  onShuffleQueue: () => void;
  onToggleRepeat: () => void;
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
  isLoading = false,
  currentTime,
  duration,
  volume,
  playbackRate,
  isRepeatEnabled,
  nextPOI,
  onPlay,
  onPause,
  onSeek,
  onVolumeChange,
  onPlaybackRateChange,
  onShuffleQueue,
  onToggleRepeat,
  onSkipNext,
  onSkipPrevious,
  onClose,
}: AudioPlayerProps) {
  const { language } = useLanguage();
  const { t } = useTranslations();

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const newTime = percent * duration;
      onSeek(newTime);
    },
    [duration, onSeek]
  );

  const handleVolumeChange = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      onVolumeChange(Math.max(0, Math.min(1, percent)));
    },
    [onVolumeChange]
  );

  if (!currentPOI) {
    return null;
  }

  const localizedPOI = getLocalizedPOI(currentPOI, language);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-background-light dark:bg-background-dark relative mx-auto flex h-screen w-full max-w-md flex-col overflow-hidden shadow-2xl">
      {/* Background Gradient */}
      <div className="to-background-dark pointer-events-none absolute top-0 left-0 z-0 h-[60vh] w-full bg-gradient-to-b from-[#3a281e] opacity-40"></div>

      {/* Navigation Header */}
      <header className="relative z-10 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent p-4 pt-6">
        <button
          onClick={onClose}
          className="flex size-10 items-center justify-center rounded-full bg-white/5 text-white transition-colors active:bg-white/10"
        >
          <span className="material-symbols-outlined text-3xl">keyboard_arrow_down</span>
        </button>
        <div className="flex flex-col items-center">
          <span className="text-xs font-medium tracking-widest text-white/60 uppercase">
            {t('audio.play')}
          </span>
          <span className="text-sm font-bold text-white">{t('app.tagline')}</span>
        </div>
        <div className="size-10" aria-hidden="true" />
      </header>

      {/* Main Scrollable Content */}
      <div className="scrollbar-hide relative z-10 flex-1 overflow-y-auto pb-32">
        {/* Hero Visual */}
        <div className="w-full px-6 pt-2 pb-6">
          <div className="group relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-white/5 shadow-2xl">
            {/* Image */}
            {currentPOI.image_url ? (
              <Image
                src={currentPOI.image_url}
                alt={localizedPOI.name}
                fill
                unoptimized
                className="absolute inset-0 object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="from-primary/20 to-background-dark absolute inset-0 bg-gradient-to-br"></div>
            )}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

            {/* Location Badge */}
            <div className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 backdrop-blur-md">
              <span className="material-symbols-outlined text-primary text-sm">location_on</span>
              <span className="text-xs font-medium text-white">{t('poi.district4')}</span>
            </div>
          </div>
        </div>

        {/* Meta Information */}
        <div className="flex items-start justify-between gap-4 px-6">
          <div className="min-w-0 flex-1">
            <h1 className="mb-1 text-2xl leading-tight font-bold text-white">
              {localizedPOI.name}
            </h1>
            <p className="text-primary text-sm font-medium">{localizedPOI.description}</p>
          </div>
        </div>

        {/* Audio Controls Section */}
        <div className="mt-8 px-6">
          {/* Seeker */}
          <div className="group/seeker w-full cursor-pointer" onClick={handleSeek}>
            <div className="relative h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="bg-primary absolute top-0 left-0 h-full rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            {/* Thumb */}
            <div className="relative h-0 w-full">
              <div
                className="absolute -top-3 size-4 scale-0 rounded-full bg-white shadow-md transition-transform duration-200 group-hover/seeker:scale-100"
                style={{ left: `${progress}%`, transform: 'translateX(-50%)' }}
              ></div>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs font-medium text-white/50">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Main Buttons */}
          <div className="mt-6 mb-8 flex items-center justify-between">
            <button
              onClick={onShuffleQueue}
              className="hover:text-primary text-white/70 transition-colors"
              aria-label="Shuffle queue"
            >
              <span className="material-symbols-outlined text-2xl">shuffle</span>
            </button>
            <div className="flex items-center gap-6">
              <button
                onClick={onSkipPrevious}
                className="hover:text-primary text-white transition-colors"
              >
                <span className="material-symbols-outlined fill-1 text-4xl">replay_10</span>
              </button>
              <button
                onClick={isPlaying ? onPause : onPlay}
                disabled={isLoading}
                className="bg-primary flex size-16 items-center justify-center rounded-full text-white shadow-[0_4px_20px_rgba(242,108,13,0.4)] transition-all hover:scale-105 active:scale-95"
              >
                <span
                  className={`material-symbols-outlined fill-1 text-4xl ${isLoading ? 'animate-spin' : ''}`}
                >
                  {isLoading ? 'sync' : isPlaying ? 'pause' : 'play_arrow'}
                </span>
              </button>
              <button
                onClick={onSkipNext}
                className="hover:text-primary text-white transition-colors"
              >
                <span className="material-symbols-outlined fill-1 text-4xl">forward_10</span>
              </button>
            </div>
            <button
              onClick={onToggleRepeat}
              className={`relative transition-colors ${isRepeatEnabled ? 'text-primary' : 'hover:text-primary text-white/70'}`}
              aria-label="Toggle repeat"
            >
              <span className="material-symbols-outlined text-2xl">repeat</span>
              {isRepeatEnabled && (
                <span className="bg-primary absolute -top-1.5 -right-3 rounded-full px-1.5 py-0.5 text-[9px] leading-none font-bold text-white">
                  ON
                </span>
              )}
            </button>
          </div>

          {/* Volume Control */}
          <div className="mb-6 flex items-center justify-center gap-8">
            <button
              onClick={onPlaybackRateChange}
              className="rounded-full border border-white/5 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80 hover:bg-white/10"
            >
              {playbackRate}x
            </button>
            <div
              className="group/vol flex w-24 cursor-pointer items-center gap-2"
              onClick={handleVolumeChange}
            >
              <span className="material-symbols-outlined text-sm text-white/50">volume_up</span>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="group-hover/vol:bg-primary h-full bg-white/40 transition-colors"
                  style={{ width: `${volume * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Transcript Drawer */}
        {localizedPOI.description && (
          <div className="mt-4 px-6">
            <div className="bg-surface-dark/50 rounded-xl border border-white/5 p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">description</span>
                <h3 className="text-sm font-bold tracking-wider text-white uppercase">
                  {t('poi.transcript')}
                </h3>
              </div>
              <div className="prose prose-invert prose-sm max-w-none">
                <p className="leading-relaxed whitespace-pre-line text-white/70">
                  {localizedPOI.description}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Up Next Preview */}
      {nextPOI && (
        <div className="absolute bottom-0 left-0 z-30 w-full">
          <div className="border-t border-white/10 bg-[rgba(46,33,26,0.6)] p-4 pb-8 backdrop-blur-md">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-primary text-[10px] font-bold tracking-wider uppercase">
                {t('poi.upNext')}
              </span>
              <span className="text-[10px] font-medium text-white/40">
                {t('poi.estimatedWalk')}
              </span>
            </div>
            <div className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/5 bg-white/5 p-2 transition-colors hover:bg-white/10">
              {/* Thumbnail */}
              {nextPOI.image_url ? (
                <Image
                  src={nextPOI.image_url}
                  alt={getLocalizedPOI(nextPOI, language).name}
                  width={48}
                  height={48}
                  unoptimized
                  className="size-12 shrink-0 rounded bg-cover bg-center object-cover"
                />
              ) : (
                <div className="bg-primary/20 size-12 shrink-0 rounded"></div>
              )}

              {/* Text Info */}
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-sm font-bold text-white">
                  {getLocalizedPOI(nextPOI, language).name}
                </h4>
                <p className="truncate text-xs text-white/50">
                  {getLocalizedPOI(nextPOI, language).description}
                </p>
              </div>

              {/* Action */}
              <button className="hover:bg-primary flex size-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:text-white">
                <span className="material-symbols-outlined text-lg">play_arrow</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

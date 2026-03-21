/**
 * useAudioPlayer Hook
 * HTML5 Audio + Queue Manager
 *
 * Features:
 * - Audio playback control (play, pause, stop, seek)
 * - Queue management (enqueue, dequeue, skip)
 * - Playback state tracking
 * - Error handling với TTS fallback
 * - Offline audio support
 */

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { POI, Language } from '@/lib/types/index';
import { getLocalizedPOI } from '@/lib/utils/localization';

type WindowWithWebkitAudioContext = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

export interface AudioQueueItem {
  poi: POI;
  audioUrl: string;
  title: string;
  duration?: number;
  description?: string;
  language?: Language;
}

export interface AudioPlayerState {
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  currentItem: AudioQueueItem | null;
  queue: AudioQueueItem[];
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isRepeatEnabled: boolean;
  error: string | null;
  isTTSFallback: boolean;
}

export interface UseAudioPlayerOptions {
  autoPlay?: boolean;
  volume?: number;
  playbackRate?: number;
  enableTTSFallback?: boolean;
  language?: Language;
  onEnded?: (item: AudioQueueItem) => void;
  onError?: (error: string, item: AudioQueueItem) => void;
  onPlay?: (item: AudioQueueItem) => void;
  onPause?: (item: AudioQueueItem) => void;
  onTTSFallback?: (item: AudioQueueItem) => void;
}

const DEFAULT_OPTIONS: UseAudioPlayerOptions = {
  autoPlay: false,
  volume: 1,
  playbackRate: 1,
  enableTTSFallback: true,
  language: 'vi',
};

export function useAudioPlayer(options: UseAudioPlayerOptions = {}) {
  const opts = useMemo(
    () => ({ ...DEFAULT_OPTIONS, ...options }),
    [options]
  );

  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    isPaused: false,
    isLoading: false,
    currentItem: null,
    queue: [],
    currentTime: 0,
    duration: 0,
    volume: opts.volume ?? 1,
    playbackRate: opts.playbackRate ?? 1,
    isRepeatEnabled: false,
    error: null,
    isTTSFallback: false,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const isUnlockedRef = useRef(false);
  const playRequestIdRef = useRef(0);
  const currentItemRef = useRef<AudioQueueItem | null>(null);
  const isPlayingRef = useRef(false);
  const isRepeatEnabledRef = useRef(false);
  const optionsRef = useRef<UseAudioPlayerOptions>(opts);
  const ttsUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const playNextRef = useRef<() => void>(() => {});
  const playWithTTSRef = useRef<(item: AudioQueueItem) => void>(() => {});
  const languageRef = useRef<Language | undefined>(opts.language);
  const pendingInteractionItemRef = useRef<AudioQueueItem | null>(null);
  const interactionRetryHandlerRef = useRef<(() => void) | null>(null);
  const playRef = useRef<(item?: AudioQueueItem) => Promise<void>>(async () => {});

  useEffect(() => {
    currentItemRef.current = state.currentItem;
  }, [state.currentItem]);

  useEffect(() => {
    isPlayingRef.current = state.isPlaying;
  }, [state.isPlaying]);

  useEffect(() => {
    isRepeatEnabledRef.current = state.isRepeatEnabled;
  }, [state.isRepeatEnabled]);

  useEffect(() => {
    optionsRef.current = opts;
  }, [opts]);

  const detachInteractionRetryListeners = useCallback(() => {
    if (typeof window === 'undefined' || !interactionRetryHandlerRef.current) {
      return;
    }

    const handler = interactionRetryHandlerRef.current;
    window.removeEventListener('pointerdown', handler, true);
    window.removeEventListener('keydown', handler, true);
    window.removeEventListener('touchstart', handler, true);
    interactionRetryHandlerRef.current = null;
  }, []);

  const getLangCode = useCallback((lang?: Language): string => {
    const langMap: Record<Language, string> = {
      vi: 'vi-VN',
      en: 'en-US',
      ja: 'ja-JP',
      fr: 'fr-FR',
      ko: 'ko-KR',
      zh: 'zh-CN',
    };

    return langMap[lang || 'vi'] || 'vi-VN';
  }, []);

  const playWithTTS = useCallback((item: AudioQueueItem) => {
    if (typeof speechSynthesis === 'undefined') {
      setState(prev => ({
        ...prev,
        isPlaying: false,
        isLoading: false,
        error: 'TTS not supported',
      }));
      optionsRef.current.onError?.('TTS not supported', item);
      return;
    }

    speechSynthesis.cancel();

    const text = item.description || item.title || '';
    if (!text) {
      playNextRef.current();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getLangCode(item.language || opts.language);
    utterance.rate = state.playbackRate;
    utterance.pitch = 1;
    utterance.volume = state.volume;

    utterance.onstart = () => {
      setState(prev => ({
        ...prev,
        isPlaying: true,
        isPaused: false,
        isLoading: false,
        isTTSFallback: true,
      }));
      optionsRef.current.onTTSFallback?.(item);
    };

    utterance.onend = () => {
      if (isRepeatEnabledRef.current) {
        playWithTTSRef.current(item);
        return;
      }

      setState(prev => ({
        ...prev,
        isPlaying: false,
        isPaused: false,
        isTTSFallback: false,
        currentTime: 0,
      }));
      ttsUtteranceRef.current = null;
      optionsRef.current.onEnded?.(item);
      playNextRef.current();
    };

    utterance.onerror = event => {
      const errorMessage = `TTS error: ${event.error}`;
      setState(prev => ({
        ...prev,
        isPlaying: false,
        isLoading: false,
        isTTSFallback: false,
        error: errorMessage,
      }));
      ttsUtteranceRef.current = null;
      optionsRef.current.onError?.(errorMessage, item);
      playNextRef.current();
    };

    ttsUtteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
  }, [getLangCode, opts.language, state.playbackRate, state.volume]);

  useEffect(() => {
    playWithTTSRef.current = playWithTTS;
  }, [playWithTTS]);

  const unlockAudio = useCallback(async () => {
    if (isUnlockedRef.current || !audioRef.current) return;

    try {
      const AudioContextClass = window.AudioContext || (window as WindowWithWebkitAudioContext).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        await ctx.close();
      }
      isUnlockedRef.current = true;
    } catch (error) {
      console.warn('Failed to unlock audio context:', error);
    }
  }, []);

  const registerInteractionRetry = useCallback((item: AudioQueueItem) => {
    if (typeof window === 'undefined') {
      return;
    }

    pendingInteractionItemRef.current = item;

    if (interactionRetryHandlerRef.current) {
      return;
    }

    const handler = () => {
      const nextItem = pendingInteractionItemRef.current;
      pendingInteractionItemRef.current = null;
      detachInteractionRetryListeners();

      if (!nextItem) {
        return;
      }

      void (async () => {
        await unlockAudio();
        await playRef.current(nextItem);
      })();
    };

    interactionRetryHandlerRef.current = handler;
    window.addEventListener('pointerdown', handler, { capture: true, once: true });
    window.addEventListener('keydown', handler, { capture: true, once: true });
    window.addEventListener('touchstart', handler, { capture: true, once: true });
  }, [detachInteractionRetryListeners, unlockAudio]);

  const safePause = useCallback(async () => {
    if (!audioRef.current) return;

    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.cancel();
    }
    ttsUtteranceRef.current = null;

    if (playPromiseRef.current) {
      try {
        await playPromiseRef.current;
      } catch {
        // Bỏ qua lỗi từ promise play cũ.
      }
      playPromiseRef.current = null;
    }

    audioRef.current.pause();
  }, []);

  const play = useCallback(async (item?: AudioQueueItem) => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    let targetItem = item;

    if (playPromiseRef.current) {
      try {
        await playPromiseRef.current;
      } catch {
        // Bỏ qua vì request phát cũ có thể đã bị hủy.
      }
      playPromiseRef.current = null;
    }

    if (!targetItem && currentItemRef.current && optionsRef.current.language) {
      const currentItem = currentItemRef.current;
      const nextLanguage = optionsRef.current.language;

      if (currentItem.language !== nextLanguage) {
        const localizedPOI = getLocalizedPOI(currentItem.poi, nextLanguage);
        targetItem = {
          poi: currentItem.poi,
          audioUrl: localizedPOI.audio_url,
          title: localizedPOI.name,
          description: localizedPOI.description,
          language: nextLanguage,
        };
      }
    }

    if (targetItem) {
      console.log('[useAudioPlayer] play requested:', {
        poiId: targetItem.poi.id,
        title: targetItem.title,
        language: targetItem.language ?? optionsRef.current.language ?? 'vi',
        hasAudioUrl: Boolean(targetItem.audioUrl),
      });

      const requestId = ++playRequestIdRef.current;

      setState(prev => ({
        ...prev,
        currentItem: targetItem ?? null,
        isLoading: true,
        error: null,
        isTTSFallback: false,
        currentTime: 0,
        duration: 0,
      }));

      audio.pause();
      audio.src = '';
      audio.load();
      audio.src = targetItem.audioUrl;
      audio.load();

      try {
        await new Promise<void>((resolve, reject) => {
          const handleCanPlay = () => {
            cleanup();
            resolve();
          };
          const handleError = () => {
            cleanup();
            reject(new Error('Failed to load audio'));
          };
          const cleanup = () => {
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('error', handleError);
          };

          if (playRequestIdRef.current !== requestId) {
            resolve();
            return;
          }

          if (audio.readyState >= 3) {
            resolve();
            return;
          }

          audio.addEventListener('canplay', handleCanPlay, { once: true });
          audio.addEventListener('error', handleError, { once: true });
        });
      } finally {
        if (playRequestIdRef.current === requestId) {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      }

      if (playRequestIdRef.current !== requestId) {
        return;
      }
    }

    if (!isUnlockedRef.current) {
      await unlockAudio();
    }

    try {
      playPromiseRef.current = audio.play();
      await playPromiseRef.current;
      playPromiseRef.current = null;
    } catch (error) {
      playPromiseRef.current = null;
      if ((error as Error).name === 'AbortError') {
        return;
      }

      if ((error as Error).name === 'NotAllowedError') {
        const blockedItem = targetItem ?? currentItemRef.current;

        console.warn('[useAudioPlayer] autoplay blocked by browser:', {
          poiId: blockedItem?.poi.id ?? null,
          title: blockedItem?.title ?? null,
        });

        if (blockedItem) {
          registerInteractionRetry(blockedItem);
        }

        setState(prev => ({
          ...prev,
          isPlaying: false,
          isPaused: true,
          isLoading: false,
          error: null,
        }));
        return;
      }

      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to play audio',
        isLoading: false,
      }));
      console.error('[useAudioPlayer] play failed:', error);
    }
  }, [registerInteractionRetry, unlockAudio]);

  useEffect(() => {
    playRef.current = play;
  }, [play]);

  const playNow = useCallback(async (item: AudioQueueItem, clearQueue = false) => {
    if (clearQueue) {
      setState(prev => ({ ...prev, queue: [] }));
    }
    await safePause();
    await play(item);
  }, [play, safePause]);

  const pause = useCallback(() => {
    void safePause();
  }, [safePause]);

  useEffect(() => {
    const previousLanguage = languageRef.current;
    const nextLanguage = opts.language;

    if (!nextLanguage) {
      languageRef.current = nextLanguage;
      return;
    }

    if (!previousLanguage || previousLanguage === nextLanguage) {
      languageRef.current = nextLanguage;
      return;
    }

    languageRef.current = nextLanguage;

    const currentItem = currentItemRef.current;
    if (!currentItem || currentItem.language === nextLanguage || !isPlayingRef.current) {
      return;
    }

    const localizedPOI = getLocalizedPOI(currentItem.poi, nextLanguage);
    const switchedItem: AudioQueueItem = {
      poi: currentItem.poi,
      audioUrl: localizedPOI.audio_url,
      title: localizedPOI.name,
      description: localizedPOI.description,
      language: nextLanguage,
    };

    let cancelled = false;

    void (async () => {
      await safePause();
      if (cancelled) return;

      if (!switchedItem.audioUrl) {
        playWithTTSRef.current(switchedItem);
        return;
      }

      await play(switchedItem);
    })();

    return () => {
      cancelled = true;
    };
  }, [opts.language, play, safePause]);

  const stop = useCallback(async () => {
    if (!audioRef.current) return;
    pendingInteractionItemRef.current = null;
    detachInteractionRetryListeners();
    await safePause();
    audioRef.current.currentTime = 0;
    setState(prev => ({
      ...prev,
      currentItem: null,
      isPlaying: false,
      isPaused: false,
      isLoading: false,
      isTTSFallback: false,
      currentTime: 0,
      duration: 0,
      error: null,
    }));
  }, [detachInteractionRetryListeners, safePause]);

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(time, audioRef.current.duration));
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (!audioRef.current) return;
    const clampedVolume = Math.max(0, Math.min(1, volume));
    audioRef.current.volume = clampedVolume;
    setState(prev => ({ ...prev, volume: clampedVolume }));
  }, []);

  const setPlaybackRate = useCallback((playbackRate: number) => {
    if (!audioRef.current) return;
    const clampedRate = Math.max(0.5, Math.min(2, playbackRate));
    audioRef.current.playbackRate = clampedRate;
    setState(prev => ({ ...prev, playbackRate: clampedRate }));
  }, []);

  const toggleRepeat = useCallback(() => {
    setState(prev => ({ ...prev, isRepeatEnabled: !prev.isRepeatEnabled }));
  }, []);

  const shuffleQueue = useCallback(() => {
    setState(prev => {
      if (prev.queue.length <= 1) {
        return prev;
      }

      const shuffled = [...prev.queue];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const current = shuffled[i];
        const target = shuffled[j];
        if (!current || !target) continue;
        shuffled[i] = target;
        shuffled[j] = current;
      }

      return {
        ...prev,
        queue: shuffled,
      };
    });
  }, []);

  const enqueue = useCallback((item: AudioQueueItem) => {
    setState(prev => {
      const currentLanguage = prev.currentItem?.language ?? opts.language;
      const itemLanguage = item.language ?? opts.language;
      const isCurrentItemDuplicate =
        prev.currentItem?.poi.id === item.poi.id && currentLanguage === itemLanguage;
      const isQueuedDuplicate = prev.queue.some(
        queuedItem =>
          queuedItem.poi.id === item.poi.id &&
          (queuedItem.language ?? opts.language) === itemLanguage
      );

      if (isCurrentItemDuplicate || isQueuedDuplicate) {
        return prev;
      }

      const shouldAutoPlay = !prev.currentItem && opts.autoPlay;

      console.log('[useAudioPlayer] enqueue:', {
        poiId: item.poi.id,
        title: item.title,
        language: item.language ?? opts.language ?? 'vi',
        shouldAutoPlay,
        queueLengthBefore: prev.queue.length,
        hasCurrentItem: Boolean(prev.currentItem),
      });

      if (shouldAutoPlay) {
        window.setTimeout(() => {
          void play(item);
        }, 0);
        return prev;
      }

      return {
        ...prev,
        queue: [...prev.queue, item],
      };
    });
  }, [opts.autoPlay, opts.language, play]);

  const playNext = useCallback(() => {
    setState(prev => {
      const [nextItem, ...restQueue] = prev.queue;

      if (nextItem) {
        void play(nextItem);
        return {
          ...prev,
          queue: restQueue,
        };
      }

      return {
        ...prev,
        currentItem: null,
        isPlaying: false,
      };
    });
  }, [play]);

  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const audio = new Audio();
    audio.preload = 'auto';
    audio.volume = opts.volume ?? 1;
    audio.playbackRate = opts.playbackRate ?? 1;
    audio.style.display = 'none';
    document.body.appendChild(audio);
    audioRef.current = audio;

    const onLoadedMetadata = () => {
      setState(prev => ({ ...prev, duration: audio.duration, isLoading: false }));
    };
    const onTimeUpdate = () => {
      setState(prev => ({ ...prev, currentTime: audio.currentTime }));
    };
    const onEnded = () => {
      const currentItem = currentItemRef.current;
      if (currentItem && isRepeatEnabledRef.current) {
        void audio.play().catch(error => {
          console.error('[useAudioPlayer] Failed to replay audio:', error);
        });
        return;
      }

      setState(prev => ({ ...prev, isPlaying: false, isPaused: false, currentTime: 0 }));
      if (currentItem) {
        optionsRef.current.onEnded?.(currentItem);
      }
      playNextRef.current();
    };
    const onError = (event: Event) => {
      const error = (event.target as HTMLAudioElement).error;
      const errorMessage = error?.message || 'Unknown audio error';
      const currentItem = currentItemRef.current;

      if (optionsRef.current.enableTTSFallback && currentItem) {
        playWithTTSRef.current(currentItem);
        return;
      }

      setState(prev => ({ ...prev, isPlaying: false, isLoading: false, error: errorMessage }));
      if (currentItem) {
        optionsRef.current.onError?.(errorMessage, currentItem);
      }
    };
    const onPlay = () => {
      setState(prev => ({ ...prev, isPlaying: true, isPaused: false }));
      if (currentItemRef.current) {
        optionsRef.current.onPlay?.(currentItemRef.current);
      }
    };
    const onPause = () => {
      setState(prev => ({ ...prev, isPlaying: false, isPaused: true }));
      if (currentItemRef.current) {
        optionsRef.current.onPause?.(currentItemRef.current);
      }
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      pendingInteractionItemRef.current = null;
      detachInteractionRetryListeners();
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.pause();
      if (audio.parentNode) {
        audio.parentNode.removeChild(audio);
      }
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
    };
  }, [detachInteractionRetryListeners, opts.playbackRate, opts.volume]);

  useEffect(() => {
    if (!audioRef.current || typeof opts.volume !== 'number') return;
    audioRef.current.volume = opts.volume;
    setState(prev => ({ ...prev, volume: opts.volume ?? 1 }));
  }, [opts.volume]);

  useEffect(() => {
    if (!audioRef.current || typeof opts.playbackRate !== 'number') return;
    const clampedRate = Math.max(0.5, Math.min(2, opts.playbackRate));
    audioRef.current.playbackRate = clampedRate;
    setState(prev => ({ ...prev, playbackRate: clampedRate }));
  }, [opts.playbackRate]);

  const skip = useCallback(() => {
    void stop();
    playNext();
  }, [playNext, stop]);

  const clearQueue = useCallback(() => {
    setState(prev => ({ ...prev, queue: [] }));
  }, []);

  return {
    ...state,
    play,
    playNow,
    pause,
    stop,
    seek,
    setVolume,
    setPlaybackRate,
    toggleRepeat,
    shuffleQueue,
    enqueue,
    skip,
    clearQueue,
    playNext,
    unlockAudio,
    playWithTTS,
    isTTSFallback: state.isTTSFallback,
  };
}

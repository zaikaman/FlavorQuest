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
import {
  getSharedAudioElement,
  isSharedAudioPriming,
  isSharedAudioPrimed,
  primeSharedAudioElement,
  warmAudioUrl,
} from '@/lib/services/audio-session';

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
  const [interactionRequiredItem, setInteractionRequiredItem] = useState<AudioQueueItem | null>(null);

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
  const isSwitchingSourceRef = useRef(false);

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

  const ensureAudioElement = useCallback(() => {
    const audio = audioRef.current ?? getSharedAudioElement();

    if (!audio) {
      return null;
    }

    audioRef.current = audio;
    return audio;
  }, []);

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
    const audio = ensureAudioElement();
    if (isUnlockedRef.current || !audio) return;

    const didPrime = await primeSharedAudioElement();
    isUnlockedRef.current = didPrime || isSharedAudioPrimed();
    console.info('[useAudioPlayer] unlock result', {
      didPrime,
      isUnlocked: isUnlockedRef.current,
      sharedPrimed: isSharedAudioPrimed(),
    });
  }, [ensureAudioElement]);

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
      setInteractionRequiredItem(null);

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
    const audio = ensureAudioElement();
    if (!audio) return;

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

    audio.pause();
  }, [ensureAudioElement]);

  const play = useCallback(async (item?: AudioQueueItem) => {
    const audio = ensureAudioElement();
    if (!audio) return;
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

    if (!isUnlockedRef.current) {
      await unlockAudio();
    }

    setInteractionRequiredItem(null);

    if (targetItem) {
      if (!targetItem.audioUrl) {
        playWithTTSRef.current(targetItem);
        return;
      }

      console.log('[useAudioPlayer] play requested:', {
        poiId: targetItem.poi.id,
        title: targetItem.title,
        language: targetItem.language ?? optionsRef.current.language ?? 'vi',
        hasAudioUrl: Boolean(targetItem.audioUrl),
      });

      const requestId = ++playRequestIdRef.current;
      const currentSrc = audio.currentSrc || audio.src;
      const currentNormalizedUrl = currentSrc
        ? new URL(currentSrc, window.location.href).href
        : '';
      const targetNormalizedUrl = new URL(targetItem.audioUrl, window.location.href).href;
      const isSourceChanged = currentNormalizedUrl !== targetNormalizedUrl;

      void warmAudioUrl(targetItem.audioUrl);

      setState(prev => ({
        ...prev,
        currentItem: targetItem ?? null,
        isLoading: true,
        error: null,
        isTTSFallback: false,
        isPaused: false,
        currentTime: isSourceChanged ? 0 : prev.currentTime,
        duration: isSourceChanged ? 0 : prev.duration,
      }));

      if (isSourceChanged) {
        isSwitchingSourceRef.current = true;
        audio.pause();
        audio.currentTime = 0;
        audio.src = targetItem.audioUrl;
        audio.load();
        isSwitchingSourceRef.current = false;
      }

      if (playRequestIdRef.current !== requestId) {
        return;
      }
    }

    console.info('[useAudioPlayer] play attempt', {
      poiId: targetItem?.poi.id ?? currentItemRef.current?.poi.id ?? null,
      isUnlocked: isUnlockedRef.current,
      sharedPrimed: isSharedAudioPrimed(),
    });

    try {
      playPromiseRef.current = audio.play();
      await playPromiseRef.current;
      playPromiseRef.current = null;
      setState(prev => ({ ...prev, isPlaying: true, isPaused: false, isLoading: false }));
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
          sharedPrimed: isSharedAudioPrimed(),
        });

        if (blockedItem) {
          registerInteractionRetry(blockedItem);
        }

        setInteractionRequiredItem(blockedItem ?? null);

        setState(prev => ({
          ...prev,
          currentItem: null,
          isPlaying: false,
          isPaused: false,
          isLoading: false,
          currentTime: 0,
          duration: 0,
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
  }, [ensureAudioElement, registerInteractionRetry, unlockAudio]);

  useEffect(() => {
    playRef.current = play;
  }, [play]);

  const playNow = useCallback(async (item: AudioQueueItem, clearQueue = false) => {
    if (clearQueue) {
      setState(prev => ({ ...prev, queue: [] }));
    }
    setInteractionRequiredItem(null);
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
    const audio = ensureAudioElement();
    if (!audio) return;
    pendingInteractionItemRef.current = null;
    detachInteractionRetryListeners();
    setInteractionRequiredItem(null);
    await safePause();
    audio.currentTime = 0;
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
  }, [detachInteractionRetryListeners, ensureAudioElement, safePause]);

  const seek = useCallback((time: number) => {
    const audio = ensureAudioElement();
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(time, audio.duration));
  }, [ensureAudioElement]);

  const setVolume = useCallback((volume: number) => {
    const audio = ensureAudioElement();
    if (!audio) return;
    const clampedVolume = Math.max(0, Math.min(1, volume));
    audio.volume = clampedVolume;
    setState(prev => ({ ...prev, volume: clampedVolume }));
  }, [ensureAudioElement]);

  const setPlaybackRate = useCallback((playbackRate: number) => {
    const audio = ensureAudioElement();
    if (!audio) return;
    const clampedRate = Math.max(0.5, Math.min(2, playbackRate));
    audio.playbackRate = clampedRate;
    setState(prev => ({ ...prev, playbackRate: clampedRate }));
  }, [ensureAudioElement]);

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

    const audio = getSharedAudioElement();
    if (!audio) return;
    audio.preload = 'auto';
    audio.volume = opts.volume ?? 1;
    audio.playbackRate = opts.playbackRate ?? 1;
    audioRef.current = audio;

    const onLoadedMetadata = () => {
      if (isSharedAudioPriming()) {
        return;
      }
      setState(prev => ({ ...prev, duration: audio.duration }));
    };
    const onTimeUpdate = () => {
      if (isSharedAudioPriming()) {
        return;
      }
      setState(prev => ({ ...prev, currentTime: audio.currentTime }));
    };
    const onLoadStart = () => {
      if (isSharedAudioPriming()) {
        return;
      }
      setState(prev => ({ ...prev, isLoading: true, error: null }));
    };
    const onCanPlay = () => {
      if (isSharedAudioPriming()) {
        return;
      }
      setState(prev => ({ ...prev, isLoading: false }));
    };
    const onWaiting = () => {
      if (isSharedAudioPriming()) {
        return;
      }
      setState(prev => ({ ...prev, isLoading: true }));
    };
    const onEnded = () => {
      if (isSharedAudioPriming()) {
        return;
      }
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
      if (isSharedAudioPriming()) {
        return;
      }
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
      if (isSharedAudioPriming()) {
        return;
      }
      setState(prev => ({ ...prev, isPlaying: true, isPaused: false, isLoading: false }));
    };
    const onPlaying = () => {
      if (isSharedAudioPriming()) {
        return;
      }
      setState(prev => ({ ...prev, isPlaying: true, isPaused: false, isLoading: false }));
      console.info('[useAudioPlayer] audio started', {
        poiId: currentItemRef.current?.poi.id ?? null,
        currentSrc: audio.currentSrc,
      });
      if (currentItemRef.current) {
        optionsRef.current.onPlay?.(currentItemRef.current);
      }
    };
    const onPause = () => {
      if (isSharedAudioPriming() || isSwitchingSourceRef.current) {
        return;
      }
      setState(prev => ({ ...prev, isPlaying: false, isPaused: true, isLoading: false }));
      if (currentItemRef.current) {
        optionsRef.current.onPause?.(currentItemRef.current);
      }
    };

    audio.addEventListener('loadstart', onLoadStart);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);

    return () => {
      pendingInteractionItemRef.current = null;
      detachInteractionRetryListeners();
      audio.removeEventListener('loadstart', onLoadStart);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.pause();
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

  const resumeBlockedPlayback = useCallback(async () => {
    const nextItem = pendingInteractionItemRef.current ?? interactionRequiredItem;
    if (!nextItem) {
      return;
    }

    setInteractionRequiredItem(null);
    await play(nextItem);
  }, [interactionRequiredItem, play]);

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
    interactionRequiredItem,
    resumeBlockedPlayback,
    isTTSFallback: state.isTTSFallback,
  };
}

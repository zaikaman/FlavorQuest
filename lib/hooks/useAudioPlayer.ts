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

import { useState, useEffect, useCallback, useRef } from 'react';
import type { POI, Language } from '@/lib/types/index';
import { getLocalizedPOI } from '@/lib/utils/localization';

export interface AudioQueueItem {
  poi: POI;
  audioUrl: string;
  title: string;
  duration?: number;
  description?: string; // For TTS fallback
  language?: Language; // For TTS fallback
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
  error: string | null;
  isTTSFallback: boolean; // Using TTS instead of audio file
}

export interface UseAudioPlayerOptions {
  autoPlay?: boolean;
  volume?: number;
  playbackRate?: number;
  /** Enable TTS fallback khi audio không load được */
  enableTTSFallback?: boolean;
  /** Language mặc định cho TTS */
  language?: Language;
  onEnded?: (item: AudioQueueItem) => void;
  onError?: (error: string, item: AudioQueueItem) => void;
  onPlay?: (item: AudioQueueItem) => void;
  onPause?: (item: AudioQueueItem) => void;
  /** Callback khi sử dụng TTS fallback */
  onTTSFallback?: (item: AudioQueueItem) => void;
}

const DEFAULT_OPTIONS: UseAudioPlayerOptions = {
  autoPlay: false,
  volume: 1.0,
  playbackRate: 1.0,
  enableTTSFallback: true,
  language: 'vi',
};

export function useAudioPlayer(options: UseAudioPlayerOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    isPaused: false,
    isLoading: false,
    currentItem: null,
    queue: [],
    currentTime: 0,
    duration: 0,
    volume: opts.volume!,
    playbackRate: opts.playbackRate!,
    error: null,
    isTTSFallback: false,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isUnlockedRef = useRef(false);
  const isLoadingRef = useRef(false); // Lock to prevent double loading
  const playRequestIdRef = useRef(0);
  const currentItemRef = useRef<AudioQueueItem | null>(null);
  const isPlayingRef = useRef(false);
  const optionsRef = useRef<UseAudioPlayerOptions>(opts);
  const ttsUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const playNextRef = useRef<() => void>(() => {});
  const languageRef = useRef<Language | undefined>(opts.language);

  useEffect(() => {
    currentItemRef.current = state.currentItem;
  }, [state.currentItem]);

  useEffect(() => {
    isPlayingRef.current = state.isPlaying;
  }, [state.isPlaying]);

  useEffect(() => {
    optionsRef.current = opts;
  }, [opts]);

  // Initialize audio element
  useEffect(() => {
    if (typeof window === 'undefined') return;

    audioRef.current = new Audio();
    audioRef.current.preload = 'auto';
    audioRef.current.volume = opts.volume!;
    audioRef.current.playbackRate = opts.playbackRate!;
    
    // Append to DOM to ensure proper loading in some browsers
    audioRef.current.style.display = 'none';
    document.body.appendChild(audioRef.current);

    const audio = audioRef.current;

    // Event listeners
    const onLoadedMetadata = () => {
      setState(prev => ({ ...prev, duration: audio.duration, isLoading: false }));
    };

    const onCanPlay = () => {};

    const onLoadStart = () => {};

    const onTimeUpdate = () => {
      setState(prev => ({ ...prev, currentTime: audio.currentTime }));
    };

    const onEnded = () => {
      const currentItem = currentItemRef.current;
      
      setState(prev => ({
        ...prev,
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
      }));

      if (currentItem && optionsRef.current.onEnded) {
        optionsRef.current.onEnded(currentItem);
      }

      // Auto-play next in queue
      playNext();
    };

    const onError = (e: Event) => {
      const error = (e.target as HTMLAudioElement).error;
      const errorMessage = error?.message || 'Unknown audio error';
      
      // Try TTS fallback if enabled
      const currentItem = currentItemRef.current;
      if (optionsRef.current.enableTTSFallback && currentItem) {
        playWithTTS(currentItem);
        return;
      }
      
      setState(prev => ({
        ...prev,
        isPlaying: false,
        isLoading: false,
        error: errorMessage,
      }));

      if (currentItem && optionsRef.current.onError) {
        optionsRef.current.onError(errorMessage, currentItem);
      }
    };

    const onPlay = () => {
      setState(prev => ({ ...prev, isPlaying: true, isPaused: false }));
      if (currentItemRef.current && optionsRef.current.onPlay) {
        optionsRef.current.onPlay(currentItemRef.current);
      }
    };

    const onPause = () => {
      setState(prev => ({ ...prev, isPlaying: false, isPaused: true }));
      if (currentItemRef.current && optionsRef.current.onPause) {
        optionsRef.current.onPause(currentItemRef.current);
      }
    };

    audio.addEventListener('loadstart', onLoadStart);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('loadstart', onLoadStart);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.pause();
      
      // Remove from DOM on cleanup
      if (audio.parentNode) {
        audio.parentNode.removeChild(audio);
      }
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    if (typeof opts.volume === 'number') {
      audioRef.current.volume = opts.volume;
      setState(prev => ({ ...prev, volume: opts.volume! }));
    }
  }, [opts.volume]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (typeof opts.playbackRate === 'number') {
      const clampedRate = Math.max(0.5, Math.min(2, opts.playbackRate));
      audioRef.current.playbackRate = clampedRate;
      setState(prev => ({ ...prev, playbackRate: clampedRate }));
    }
  }, [opts.playbackRate]);

  // Track play promise to avoid AbortError
  const playPromiseRef = useRef<Promise<void> | null>(null);

  // Unlock audio context (required for autoplay on mobile)
  const unlockAudio = useCallback(async () => {
    if (isUnlockedRef.current || !audioRef.current) return;

    try {
      // Create a silent audio context instead of play/pause trick
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
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

  // Safe pause that waits for play promise
  const safePause = useCallback(async () => {
    if (!audioRef.current) return;
    
    // Cancel any TTS
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.cancel();
    }
    ttsUtteranceRef.current = null;
    
    // Wait for any pending play promise to resolve
    if (playPromiseRef.current) {
      try {
        await playPromiseRef.current;
      } catch (e) {
        // Ignore - play might have failed
      }
      playPromiseRef.current = null;
    }
    
    audioRef.current.pause();
  }, []);

  // Language code mapping for TTS
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

  // Play using TTS (fallback when audio file fails)
  const playWithTTS = useCallback((item: AudioQueueItem) => {
    if (typeof speechSynthesis === 'undefined') {
      console.error('Speech synthesis not supported');
      setState(prev => ({
        ...prev,
        isPlaying: false,
        isLoading: false,
        error: 'TTS not supported',
      }));
      return;
    }

    // Cancel any existing speech
    speechSynthesis.cancel();

    // Get text to speak
    const text = item.description || item.title || '';
    if (!text) {
      console.error('No text for TTS');
      playNextRef.current();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getLangCode(item.language || opts.language);
    utterance.rate = state.playbackRate;
    utterance.pitch = 1.0;
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

    utterance.onerror = (event) => {
      console.error('TTS error:', event.error);
      setState(prev => ({
        ...prev,
        isPlaying: false,
        isLoading: false,
        isTTSFallback: false,
        error: 'TTS error: ' + event.error,
      }));
      ttsUtteranceRef.current = null;
      playNextRef.current();
    };

    ttsUtteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
  }, [opts.language, state.volume, getLangCode]);

  // Play audio
  const play = useCallback(async (item?: AudioQueueItem) => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    let targetItem = item;

    // Wait for any pending play to finish first
    if (playPromiseRef.current) {
      try {
        await playPromiseRef.current;
      } catch (e) {
        // Ignore
      }
      playPromiseRef.current = null;
    }

    // Nếu chỉ resume mà language đã đổi, tạo lại item theo language mới
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

    // If item provided, load it first
    if (targetItem) {
      const requestId = ++playRequestIdRef.current;
      isLoadingRef.current = true;

      setState(prev => ({
        ...prev,
        currentItem: targetItem,
        isLoading: true,
        error: null,
        isTTSFallback: false,
        currentTime: 0,
        duration: 0,
      }));

      // Dừng audio hiện tại (nếu có) trước khi đổi source để tránh tiếp tục phát POI cũ.
      audio.pause();

      // Reset source để buộc browser load URL mới.
      audio.src = '';
      audio.load();

      // Không thêm query cache-busting để không phá offline cache/Service Worker.
      audio.src = targetItem.audioUrl;
      audio.load();

      // Wait for audio to be ready (hỗ trợ tap nhanh: request mới sẽ thắng)
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

          // Nếu request đã bị thay thế bởi lần bấm khác, bỏ qua.
          if (playRequestIdRef.current !== requestId) {
            resolve();
            return;
          }

          if (audio.readyState && audio.readyState >= 3) {
            resolve();
            return;
          }

          audio.addEventListener('canplay', handleCanPlay, { once: true });
          audio.addEventListener('error', handleError, { once: true });
        });
      } finally {
        // Chỉ mở lock nếu đây vẫn là request mới nhất.
        if (playRequestIdRef.current === requestId) {
          isLoadingRef.current = false;
          setState(prev => ({ ...prev, isLoading: false }));
        }
      }

      // Nếu trong lúc load user bấm POI khác, không play request cũ nữa.
      if (playRequestIdRef.current !== requestId) {
        return;
      }
    }

    // Ensure audio context is unlocked
    if (!isUnlockedRef.current) {
      await unlockAudio();
    }

    try {
      playPromiseRef.current = audio.play();
      await playPromiseRef.current;
      playPromiseRef.current = null;
    } catch (error) {
      playPromiseRef.current = null;
      isLoadingRef.current = false;
      // Ignore AbortError - it's expected when pause is called during play
      if ((error as Error).name === 'AbortError') {
        // Silent - this is normal behavior
        return;
      }
      console.error('[useAudioPlayer] Failed to play audio:', error);
      setState(prev => ({ ...prev, error: (error as Error).message, isLoading: false }));
    }
  }, [unlockAudio]);

  // Phát ngay item (ưu tiên) - dừng cái đang phát và play item mới lập tức
  const playNow = useCallback(async (item: AudioQueueItem, clearQueue: boolean = false) => {
    if (clearQueue) {
      setState(prev => ({ ...prev, queue: [] }));
    }
    await safePause();
    await play(item);
  }, [play, safePause]);

  // Pause audio
  const pause = useCallback(() => {
    safePause();
  }, [safePause]);

  // Khi đổi ngôn ngữ trong lúc đang phát, tự dừng và chuyển sang audio theo ngôn ngữ mới.
  useEffect(() => {
    const previousLanguage = languageRef.current;
    const nextLanguage = opts.language;

    if (!nextLanguage) {
      languageRef.current = nextLanguage;
      return;
    }

    if (!previousLanguage) {
      languageRef.current = nextLanguage;
      return;
    }

    if (previousLanguage === nextLanguage) {
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

    (async () => {
      await safePause();
      if (cancelled) return;

      if (!switchedItem.audioUrl) {
        playWithTTS(switchedItem);
        return;
      }

      await play(switchedItem);
    })();

    return () => {
      cancelled = true;
    };
  }, [opts.language, play, playWithTTS, safePause]);

  // Stop audio
  const stop = useCallback(async () => {
    if (!audioRef.current) return;
    await safePause();
    audioRef.current.currentTime = 0;
    setState(prev => ({ ...prev, isPlaying: false, isPaused: false, currentTime: 0 }));
  }, [safePause]);

  // Seek to time
  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(time, audioRef.current.duration));
  }, []);

  // Set volume
  const setVolume = useCallback((volume: number) => {
    if (!audioRef.current) return;
    const clampedVolume = Math.max(0, Math.min(1, volume));
    audioRef.current.volume = clampedVolume;
    setState(prev => ({ ...prev, volume: clampedVolume }));
  }, []);

  // Set playback rate
  const setPlaybackRate = useCallback((playbackRate: number) => {
    if (!audioRef.current) return;
    const clampedRate = Math.max(0.5, Math.min(2, playbackRate));
    audioRef.current.playbackRate = clampedRate;
    setState(prev => ({ ...prev, playbackRate: clampedRate }));
  }, []);

  // Add to queue
  const enqueue = useCallback((item: AudioQueueItem) => {
    setState(prev => {
      const shouldAutoPlay = !prev.currentItem && opts.autoPlay;
      
      if (shouldAutoPlay) {
        // Play immediately - don't add to queue
        setTimeout(() => play(item), 0); // Use setTimeout to avoid race condition
        return prev;
      }
      
      return {
        ...prev,
        queue: [...prev.queue, item],
      };
    });
  }, [opts.autoPlay, play]);

  // Play next in queue
  const playNext = useCallback(() => {
    setState(prev => {
      const [nextItem, ...restQueue] = prev.queue;
      
      if (nextItem) {
        play(nextItem);
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

  // Update playNextRef after playNext is defined
  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  // Skip current
  const skip = useCallback(() => {
    stop();
    playNext();
  }, [stop, playNext]);

  // Clear queue
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
    enqueue,
    skip,
    clearQueue,
    playNext,
    unlockAudio,
    playWithTTS,
    isTTSFallback: state.isTTSFallback,
  };
}

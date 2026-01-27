/**
 * useAudioPlayer Hook
 * HTML5 Audio + Queue Manager
 * 
 * Features:
 * - Audio playback control (play, pause, stop, seek)
 * - Queue management (enqueue, dequeue, skip)
 * - Playback state tracking
 * - Error handling với TTS fallback
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { POI } from '@/lib/types/index';

export interface AudioQueueItem {
  poi: POI;
  audioUrl: string;
  title: string;
  duration?: number;
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
  error: string | null;
}

export interface UseAudioPlayerOptions {
  autoPlay?: boolean;
  volume?: number;
  onEnded?: (item: AudioQueueItem) => void;
  onError?: (error: string, item: AudioQueueItem) => void;
  onPlay?: (item: AudioQueueItem) => void;
  onPause?: (item: AudioQueueItem) => void;
}

const DEFAULT_OPTIONS: UseAudioPlayerOptions = {
  autoPlay: false,
  volume: 1.0,
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
    error: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isUnlockedRef = useRef(false);

  // Initialize audio element
  useEffect(() => {
    if (typeof window === 'undefined') return;

    audioRef.current = new Audio();
    audioRef.current.preload = 'auto';
    audioRef.current.volume = opts.volume!;

    const audio = audioRef.current;

    // Event listeners
    const onLoadedMetadata = () => {
      setState(prev => ({ ...prev, duration: audio.duration, isLoading: false }));
    };

    const onTimeUpdate = () => {
      setState(prev => ({ ...prev, currentTime: audio.currentTime }));
    };

    const onEnded = () => {
      const currentItem = state.currentItem;
      
      setState(prev => ({
        ...prev,
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
      }));

      if (currentItem && opts.onEnded) {
        opts.onEnded(currentItem);
      }

      // Auto-play next in queue
      playNext();
    };

    const onError = (e: Event) => {
      const error = (e.target as HTMLAudioElement).error;
      const errorMessage = error?.message || 'Unknown audio error';
      
      setState(prev => ({
        ...prev,
        isPlaying: false,
        isLoading: false,
        error: errorMessage,
      }));

      if (state.currentItem && opts.onError) {
        opts.onError(errorMessage, state.currentItem);
      }
    };

    const onPlay = () => {
      setState(prev => ({ ...prev, isPlaying: true, isPaused: false }));
      if (state.currentItem && opts.onPlay) {
        opts.onPlay(state.currentItem);
      }
    };

    const onPause = () => {
      setState(prev => ({ ...prev, isPlaying: false, isPaused: true }));
      if (state.currentItem && opts.onPause) {
        opts.onPause(state.currentItem);
      }
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.pause();
    };
  }, [opts, state.currentItem]);

  // Unlock audio context (required for autoplay on mobile)
  const unlockAudio = useCallback(async () => {
    if (isUnlockedRef.current || !audioRef.current) return;

    try {
      await audioRef.current.play();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      isUnlockedRef.current = true;
    } catch (error) {
      console.warn('Failed to unlock audio context:', error);
    }
  }, []);

  // Play audio
  const play = useCallback(async (item?: AudioQueueItem) => {
    if (!audioRef.current) return;

    // If item provided, load it first
    if (item) {
      setState(prev => ({ ...prev, currentItem: item, isLoading: true, error: null }));
      audioRef.current.src = item.audioUrl;
    }

    // Ensure audio context is unlocked
    if (!isUnlockedRef.current) {
      await unlockAudio();
    }

    try {
      await audioRef.current.play();
    } catch (error) {
      console.error('Failed to play audio:', error);
      setState(prev => ({ ...prev, error: (error as Error).message, isLoading: false }));
    }
  }, [unlockAudio]);

  // Pause audio
  const pause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
  }, []);

  // Stop audio
  const stop = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setState(prev => ({ ...prev, isPlaying: false, isPaused: false, currentTime: 0 }));
  }, []);

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

  // Add to queue
  const enqueue = useCallback((item: AudioQueueItem) => {
    setState(prev => ({
      ...prev,
      queue: [...prev.queue, item],
    }));

    // Auto-play if nothing is playing
    if (!state.currentItem && opts.autoPlay) {
      play(item);
    }
  }, [state.currentItem, opts.autoPlay, play]);

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
    pause,
    stop,
    seek,
    setVolume,
    enqueue,
    skip,
    clearQueue,
    playNext,
    unlockAudio,
  };
}

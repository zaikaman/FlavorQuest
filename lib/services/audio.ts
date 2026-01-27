/**
 * Audio Service
 * AudioPlayer class với queue management
 * 
 * Features:
 * - HTML5 Audio wrapper
 * - Queue management
 * - Event callbacks
 * - Error handling
 */

export interface AudioPlayerOptions {
  volume?: number;
  autoPlay?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
}

export interface AudioTrack {
  id: string;
  url: string;
  title: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export type AudioPlayerEvent = 
  | 'play'
  | 'pause'
  | 'ended'
  | 'error'
  | 'timeupdate'
  | 'loadedmetadata'
  | 'volumechange';

export class AudioPlayer {
  private audio: HTMLAudioElement;
  private queue: AudioTrack[] = [];
  private currentTrack: AudioTrack | null = null;
  private listeners: Map<AudioPlayerEvent, Set<Function>> = new Map();
  private isUnlocked = false;

  constructor(options: AudioPlayerOptions = {}) {
    this.audio = new Audio();
    this.audio.preload = options.preload || 'auto';
    this.audio.volume = options.volume ?? 1.0;

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.audio.addEventListener('play', () => this.emit('play'));
    this.audio.addEventListener('pause', () => this.emit('pause'));
    this.audio.addEventListener('ended', () => {
      this.emit('ended');
      this.playNext();
    });
    this.audio.addEventListener('error', () => this.emit('error', this.audio.error));
    this.audio.addEventListener('timeupdate', () => this.emit('timeupdate'));
    this.audio.addEventListener('loadedmetadata', () => this.emit('loadedmetadata'));
    this.audio.addEventListener('volumechange', () => this.emit('volumechange'));
  }

  /**
   * Unlock audio context (required for autoplay on mobile)
   */
  async unlock(): Promise<void> {
    if (this.isUnlocked) return;

    try {
      await this.audio.play();
      this.audio.pause();
      this.audio.currentTime = 0;
      this.isUnlocked = true;
    } catch (error) {
      console.warn('Failed to unlock audio context:', error);
    }
  }

  /**
   * Play audio
   */
  async play(track?: AudioTrack): Promise<void> {
    if (track) {
      this.currentTrack = track;
      this.audio.src = track.url;
    }

    if (!this.isUnlocked) {
      await this.unlock();
    }

    try {
      await this.audio.play();
    } catch (error) {
      console.error('Failed to play audio:', error);
      throw error;
    }
  }

  /**
   * Pause audio
   */
  pause(): void {
    this.audio.pause();
  }

  /**
   * Stop audio
   */
  stop(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  /**
   * Seek to time (seconds)
   */
  seek(time: number): void {
    this.audio.currentTime = Math.max(0, Math.min(time, this.audio.duration));
  }

  /**
   * Set volume (0-1)
   */
  setVolume(volume: number): void {
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Get current time (seconds)
   */
  getCurrentTime(): number {
    return this.audio.currentTime;
  }

  /**
   * Get duration (seconds)
   */
  getDuration(): number {
    return this.audio.duration;
  }

  /**
   * Get volume (0-1)
   */
  getVolume(): number {
    return this.audio.volume;
  }

  /**
   * Get current track
   */
  getCurrentTrack(): AudioTrack | null {
    return this.currentTrack;
  }

  /**
   * Check if playing
   */
  isPlaying(): boolean {
    return !this.audio.paused;
  }

  /**
   * Add track to queue
   */
  enqueue(track: AudioTrack): void {
    this.queue.push(track);
  }

  /**
   * Add track to front of queue
   */
  enqueueFront(track: AudioTrack): void {
    this.queue.unshift(track);
  }

  /**
   * Remove track from queue
   */
  dequeue(trackId: string): void {
    this.queue = this.queue.filter(t => t.id !== trackId);
  }

  /**
   * Get queue
   */
  getQueue(): AudioTrack[] {
    return [...this.queue];
  }

  /**
   * Clear queue
   */
  clearQueue(): void {
    this.queue = [];
  }

  /**
   * Play next track in queue
   */
  async playNext(): Promise<void> {
    const nextTrack = this.queue.shift();
    if (nextTrack) {
      await this.play(nextTrack);
    } else {
      this.currentTrack = null;
    }
  }

  /**
   * Skip current track
   */
  async skip(): Promise<void> {
    this.stop();
    await this.playNext();
  }

  /**
   * Add event listener
   */
  on(event: AudioPlayerEvent, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Remove event listener
   */
  off(event: AudioPlayerEvent, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  /**
   * Emit event
   */
  private emit(event: AudioPlayerEvent, ...args: unknown[]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(...args));
    }
  }

  /**
   * Destroy player
   */
  destroy(): void {
    this.stop();
    this.listeners.clear();
    this.audio.src = '';
  }
}

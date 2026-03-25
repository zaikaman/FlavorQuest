/**
 * Text-to-Speech Service
 * Web Speech API wrapper
 *
 * Features:
 * - Fallback khi audio file không available
 * - Multi-language support
 * - Voice selection
 * - Rate/pitch control
 */

import type { Language } from '@/lib/types/index';
import { LANGUAGE_CONFIG_MAP } from '@/lib/constants';

export interface TTSOptions {
  lang?: Language;
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice | null;
}

export const DEFAULT_TTS_OPTIONS: TTSOptions = {
  lang: 'vi',
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
};

// Language code mapping
export class TTSService {
  private synthesis: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window === 'undefined') {
      throw new Error('TTS is only available in browser');
    }

    if (!('speechSynthesis' in window)) {
      throw new Error('Speech Synthesis not supported');
    }

    this.synthesis = window.speechSynthesis;
    this.loadVoices();

    // Voices may not be loaded immediately
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.loadVoices();
      };
    }
  }

  private loadVoices() {
    this.voices = this.synthesis.getVoices();
  }

  /**
   * Get available voices for a language
   */
  getVoicesForLanguage(lang: Language): SpeechSynthesisVoice[] {
    const langCode = LANGUAGE_CONFIG_MAP[lang]?.ttsLang ?? 'vi-VN';
    return this.voices.filter((voice) => voice.lang.startsWith(langCode.split('-')[0]!));
  }

  /**
   * Get best voice for language
   */
  getBestVoice(lang: Language): SpeechSynthesisVoice | null {
    const langCode = LANGUAGE_CONFIG_MAP[lang]?.ttsLang ?? 'vi-VN';
    const voices = this.getVoicesForLanguage(lang);

    // Prefer exact match
    let voice = voices.find((v) => v.lang === langCode);
    if (voice) return voice;

    // Prefer local voices
    voice = voices.find((v) => !v.localService);
    if (voice) return voice;

    // Return first available
    return voices[0] || null;
  }

  /**
   * Speak text
   */
  speak(text: string, options: TTSOptions = {}): Promise<void> {
    const opts = { ...DEFAULT_TTS_OPTIONS, ...options };

    return new Promise((resolve, reject) => {
      // Cancel any ongoing speech
      this.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = LANGUAGE_CONFIG_MAP[opts.lang!]?.ttsLang ?? 'vi-VN';
      utterance.rate = opts.rate!;
      utterance.pitch = opts.pitch!;
      utterance.volume = opts.volume!;

      // Set voice if specified, otherwise use best match
      if (opts.voice) {
        utterance.voice = opts.voice;
      } else {
        const bestVoice = this.getBestVoice(opts.lang!);
        if (bestVoice) {
          utterance.voice = bestVoice;
        }
      }

      utterance.onend = () => {
        resolve();
      };

      utterance.onerror = (event) => {
        reject(new Error(`TTS error: ${event.error}`));
      };

      this.synthesis.speak(utterance);
    });
  }

  /**
   * Pause speech
   */
  pause(): void {
    this.synthesis.pause();
  }

  /**
   * Resume speech
   */
  resume(): void {
    this.synthesis.resume();
  }

  /**
   * Cancel speech
   */
  cancel(): void {
    this.synthesis.cancel();
  }

  /**
   * Check if speaking
   */
  isSpeaking(): boolean {
    return this.synthesis.speaking;
  }

  /**
   * Check if paused
   */
  isPaused(): boolean {
    return this.synthesis.paused;
  }
}

// Singleton instance
let ttsInstance: TTSService | null = null;

/**
 * Get TTS service instance
 */
export function getTTSService(): TTSService {
  if (!ttsInstance) {
    ttsInstance = new TTSService();
  }
  return ttsInstance;
}

/**
 * Speak text (convenience function)
 */
export async function speak(text: string, options?: TTSOptions): Promise<void> {
  const tts = getTTSService();
  return tts.speak(text, options);
}

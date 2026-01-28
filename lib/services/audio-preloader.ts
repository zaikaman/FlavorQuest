/**
 * Audio Preloader Service
 * 
 * Preload audio files cho offline use
 * 
 * Features:
 * - Preload audio files trong bán kính gần
 * - Progress tracking
 * - Priority-based preloading
 * - Service Worker integration
 * - Bandwidth-aware preloading
 */

import type { POI, Language, Coordinates } from '@/lib/types/index';
import { filterPOIsWithinRadius } from '@/lib/utils/distance';
import {
  savePreloadStatus,
  loadPreloadStatus,
  type PreloadStatus,
} from '@/lib/services/storage';

export interface PreloadOptions {
  /** Ngôn ngữ hiện tại */
  language: Language;
  /** Vị trí hiện tại (nếu có) */
  currentPosition?: Coordinates;
  /** Bán kính preload (meters) */
  preloadRadius?: number;
  /** Có preload tất cả POIs không (bỏ qua radius) */
  preloadAll?: boolean;
  /** Callback khi progress thay đổi */
  onProgress?: (progress: PreloadProgress) => void;
  /** Callback khi hoàn thành */
  onComplete?: (result: PreloadResult) => void;
  /** Callback khi có lỗi */
  onError?: (error: Error) => void;
}

export interface PreloadProgress {
  /** Tổng số files cần preload */
  total: number;
  /** Số files đã preload */
  completed: number;
  /** Số files đang preload */
  pending: number;
  /** Số files bị lỗi */
  failed: number;
  /** Phần trăm hoàn thành */
  percent: number;
  /** POI đang preload */
  currentPOI?: string;
}

export interface PreloadResult {
  /** Tổng số files đã preload thành công */
  successCount: number;
  /** Tổng số files bị lỗi */
  failedCount: number;
  /** Tổng số files đã có trong cache */
  alreadyCachedCount: number;
  /** Danh sách POI IDs đã preload */
  preloadedPOIIds: string[];
  /** Thời điểm hoàn thành */
  completedAt: number;
}

/**
 * Lấy audio URL cho ngôn ngữ cụ thể
 */
function getAudioUrlForLanguage(poi: POI, language: Language): string | undefined {
  const audioKey = `audio_url_${language}` as keyof POI;
  const audioUrl = poi[audioKey] as string | undefined;

  // Fallback to English if not available
  if (!audioUrl && language !== 'en') {
    return poi.audio_url_en;
  }

  return audioUrl;
}

/**
 * Lấy tất cả audio URLs từ POI (tất cả ngôn ngữ)
 */
function getAllAudioUrls(poi: POI): string[] {
  const languages: Language[] = ['vi', 'en', 'ja', 'fr', 'ko', 'zh'];
  const urls: string[] = [];

  for (const lang of languages) {
    const url = getAudioUrlForLanguage(poi, lang);
    if (url && !urls.includes(url)) {
      urls.push(url);
    }
  }

  return urls;
}

/**
 * Preload audio files thông qua Service Worker
 */
async function preloadViaServiceWorker(urls: string[]): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker not supported');
  }

  const registration = await navigator.serviceWorker.ready;

  if (!registration.active) {
    throw new Error('No active Service Worker');
  }

  return new Promise((resolve, reject) => {
    const messageChannel = new MessageChannel();

    messageChannel.port1.onmessage = (event) => {
      if (event.data.type === 'PRELOAD_COMPLETE') {
        resolve();
      } else if (event.data.type === 'PRELOAD_ERROR') {
        reject(new Error(event.data.error));
      }
    };

    registration.active!.postMessage(
      {
        type: 'PRELOAD_AUDIO',
        urls,
      },
      [messageChannel.port2]
    );

    // Timeout fallback
    setTimeout(resolve, 30000);
  });
}

/**
 * Preload audio files directly (fallback khi SW không available)
 */
async function preloadDirectly(
  urls: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<{ success: number; failed: number; alreadyCached: number }> {
  let success = 0;
  let failed = 0;
  let alreadyCached = 0;

  // Check cache first
  const cache = await caches.open('flavorquest-audio-v1');

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    if (!url) continue;

    try {
      // Check if already cached
      const cached = await cache.match(url);
      if (cached) {
        alreadyCached++;
        onProgress?.(i + 1, urls.length);
        continue;
      }

      // Fetch and cache
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
        success++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`Failed to preload audio: ${url}`, error);
      failed++;
    }

    onProgress?.(i + 1, urls.length);
  }

  return { success, failed, alreadyCached };
}

/**
 * Audio Preloader Class
 */
export class AudioPreloader {
  private isPreloading = false;
  private abortController: AbortController | null = null;

  /**
   * Preload audio files cho các POIs
   */
  async preload(pois: POI[], options: PreloadOptions): Promise<PreloadResult> {
    if (this.isPreloading) {
      throw new Error('Preload already in progress');
    }

    this.isPreloading = true;
    this.abortController = new AbortController();

    const {
      language,
      currentPosition,
      preloadRadius = 500,
      preloadAll = false,
      onProgress,
      onComplete,
      onError,
    } = options;

    try {
      // Filter POIs based on position and radius
      let poisToPreload = pois;

      if (!preloadAll && currentPosition) {
        const nearbyResults = filterPOIsWithinRadius(currentPosition, pois, preloadRadius);
        poisToPreload = nearbyResults.map((item) => item.poi);
      }

      // Sort by priority
      poisToPreload.sort((a, b) => b.priority - a.priority);

      // Collect audio URLs
      const audioUrls: string[] = [];
      const poiUrlMap: Map<string, string[]> = new Map();

      for (const poi of poisToPreload) {
        // Get audio URL for current language
        const audioUrl = getAudioUrlForLanguage(poi, language);
        if (audioUrl) {
          audioUrls.push(audioUrl);
          poiUrlMap.set(poi.id, [audioUrl]);
        }
      }

      if (audioUrls.length === 0) {
        const result: PreloadResult = {
          successCount: 0,
          failedCount: 0,
          alreadyCachedCount: 0,
          preloadedPOIIds: [],
          completedAt: Date.now(),
        };
        onComplete?.(result);
        return result;
      }

      // Initial progress
      const progress: PreloadProgress = {
        total: audioUrls.length,
        completed: 0,
        pending: audioUrls.length,
        failed: 0,
        percent: 0,
      };
      onProgress?.(progress);

      // Try Service Worker first, fallback to direct fetch
      let preloadResult: { success: number; failed: number; alreadyCached: number };

      try {
        await preloadViaServiceWorker(audioUrls);
        // SW handles its own tracking, assume all successful
        preloadResult = {
          success: audioUrls.length,
          failed: 0,
          alreadyCached: 0,
        };
      } catch {
        // Fallback to direct preload
        preloadResult = await preloadDirectly(audioUrls, (completed, total) => {
          const updatedProgress: PreloadProgress = {
            total,
            completed,
            pending: total - completed,
            failed: progress.failed,
            percent: Math.round((completed / total) * 100),
          };
          onProgress?.(updatedProgress);
        });
      }

      // Determine preloaded POI IDs
      const preloadedPOIIds = poisToPreload
        .filter((poi) => {
          const url = getAudioUrlForLanguage(poi, language);
          return url && audioUrls.includes(url);
        })
        .map((poi) => poi.id);

      // Save preload status
      const currentStatus = await loadPreloadStatus();
      const newStatus: PreloadStatus = {
        totalPOIs: pois.length,
        preloadedPOIs: preloadedPOIIds.length,
        preloadedAudio: [
          ...(currentStatus?.preloadedAudio || []),
          ...preloadedPOIIds.filter(
            (id) => !currentStatus?.preloadedAudio?.includes(id)
          ),
        ],
        preloadedImages: currentStatus?.preloadedImages || [],
        lastPreloadTime: Date.now(),
      };
      await savePreloadStatus(newStatus);

      const result: PreloadResult = {
        successCount: preloadResult.success,
        failedCount: preloadResult.failed,
        alreadyCachedCount: preloadResult.alreadyCached,
        preloadedPOIIds,
        completedAt: Date.now(),
      };

      onComplete?.(result);
      return result;
    } catch (error) {
      const err = error as Error;
      onError?.(err);
      throw err;
    } finally {
      this.isPreloading = false;
      this.abortController = null;
    }
  }

  /**
   * Preload tất cả audio files (tất cả ngôn ngữ)
   */
  async preloadAll(
    pois: POI[],
    options: Omit<PreloadOptions, 'language' | 'preloadAll'>
  ): Promise<PreloadResult> {
    if (this.isPreloading) {
      throw new Error('Preload already in progress');
    }

    this.isPreloading = true;

    const { onProgress, onComplete, onError } = options;

    try {
      // Collect all audio URLs from all POIs
      const audioUrls: string[] = [];

      for (const poi of pois) {
        const urls = getAllAudioUrls(poi);
        audioUrls.push(...urls.filter((url) => !audioUrls.includes(url)));
      }

      if (audioUrls.length === 0) {
        const result: PreloadResult = {
          successCount: 0,
          failedCount: 0,
          alreadyCachedCount: 0,
          preloadedPOIIds: [],
          completedAt: Date.now(),
        };
        onComplete?.(result);
        return result;
      }

      // Preload
      const preloadResult = await preloadDirectly(audioUrls, (completed, total) => {
        onProgress?.({
          total,
          completed,
          pending: total - completed,
          failed: 0,
          percent: Math.round((completed / total) * 100),
        });
      });

      const result: PreloadResult = {
        successCount: preloadResult.success,
        failedCount: preloadResult.failed,
        alreadyCachedCount: preloadResult.alreadyCached,
        preloadedPOIIds: pois.map((p) => p.id),
        completedAt: Date.now(),
      };

      // Update preload status
      const currentStatus = await loadPreloadStatus();
      await savePreloadStatus({
        totalPOIs: pois.length,
        preloadedPOIs: pois.length,
        preloadedAudio: pois.map((p) => p.id),
        preloadedImages: currentStatus?.preloadedImages || [],
        lastPreloadTime: Date.now(),
      });

      onComplete?.(result);
      return result;
    } catch (error) {
      const err = error as Error;
      onError?.(err);
      throw err;
    } finally {
      this.isPreloading = false;
    }
  }

  /**
   * Preload images cho POIs
   */
  async preloadImages(
    pois: POI[],
    options?: {
      onProgress?: (progress: PreloadProgress) => void;
      onComplete?: (result: PreloadResult) => void;
    }
  ): Promise<PreloadResult> {
    const { onProgress, onComplete } = options || {};

    // Collect image URLs
    const imageUrls: string[] = pois
      .filter((poi) => poi.image_url)
      .map((poi) => poi.image_url!);

    if (imageUrls.length === 0) {
      const result: PreloadResult = {
        successCount: 0,
        failedCount: 0,
        alreadyCachedCount: 0,
        preloadedPOIIds: [],
        completedAt: Date.now(),
      };
      onComplete?.(result);
      return result;
    }

    // Try Service Worker first
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        registration.active?.postMessage({
          type: 'PRELOAD_IMAGES',
          urls: imageUrls,
        });
      }
    } catch (error) {
      console.error('Failed to preload images via SW:', error);
    }

    // Direct preload as fallback
    const cache = await caches.open('flavorquest-images-v1');
    let success = 0;
    let failed = 0;
    let alreadyCached = 0;

    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];
      if (!url) continue;

      try {
        const cached = await cache.match(url);
        if (cached) {
          alreadyCached++;
        } else {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
            success++;
          } else {
            failed++;
          }
        }
      } catch {
        failed++;
      }

      onProgress?.({
        total: imageUrls.length,
        completed: i + 1,
        pending: imageUrls.length - i - 1,
        failed,
        percent: Math.round(((i + 1) / imageUrls.length) * 100),
      });
    }

    // Update preload status
    const currentStatus = await loadPreloadStatus();
    const preloadedImageIds = pois.filter((p) => p.image_url).map((p) => p.id);
    await savePreloadStatus({
      totalPOIs: currentStatus?.totalPOIs || pois.length,
      preloadedPOIs: currentStatus?.preloadedPOIs || 0,
      preloadedAudio: currentStatus?.preloadedAudio || [],
      preloadedImages: [
        ...(currentStatus?.preloadedImages || []),
        ...preloadedImageIds.filter(
          (id) => !currentStatus?.preloadedImages?.includes(id)
        ),
      ],
      lastPreloadTime: Date.now(),
    });

    const result: PreloadResult = {
      successCount: success,
      failedCount: failed,
      alreadyCachedCount: alreadyCached,
      preloadedPOIIds: preloadedImageIds,
      completedAt: Date.now(),
    };

    onComplete?.(result);
    return result;
  }

  /**
   * Hủy preload đang chạy
   */
  abort(): void {
    this.abortController?.abort();
    this.isPreloading = false;
  }

  /**
   * Kiểm tra trạng thái preload
   */
  get isActive(): boolean {
    return this.isPreloading;
  }
}

/**
 * Singleton instance
 */
export const audioPreloader = new AudioPreloader();

/**
 * Check if a specific audio URL is cached
 */
export async function isAudioCached(url: string): Promise<boolean> {
  try {
    const cache = await caches.open('flavorquest-audio-v1');
    const cached = await cache.match(url);
    return !!cached;
  } catch {
    return false;
  }
}

/**
 * Get cached audio URLs for a POI
 */
export async function getCachedAudioForPOI(
  poi: POI,
  language: Language
): Promise<string | null> {
  const url = getAudioUrlForLanguage(poi, language);
  if (!url) return null;

  const isCached = await isAudioCached(url);
  return isCached ? url : null;
}

/**
 * Clear all preloaded audio
 */
export async function clearPreloadedAudio(): Promise<void> {
  try {
    await caches.delete('flavorquest-audio-v1');
    await savePreloadStatus({
      totalPOIs: 0,
      preloadedPOIs: 0,
      preloadedAudio: [],
      preloadedImages: [],
      lastPreloadTime: 0,
    });
  } catch (error) {
    console.error('Failed to clear preloaded audio:', error);
  }
}

/**
 * GPS Noise Filter
 * 
 * Lọc nhiễu GPS drift sử dụng Simple Moving Average (SMA)
 * 
 * Problem: GPS coordinates có thể jump/drift ngay cả khi đứng yên
 * Solution: Smooth coordinates bằng cách tính trung bình N samples gần nhất
 * 
 * Benefits:
 * - Giảm false positive trong geofencing detection
 * - Smoother animation cho user location marker
 * - Tăng accuracy cho distance calculations
 * 
 * Trade-offs:
 * - Độ trễ: ~3-5 giây (tùy window size)
 * - Memory: ~1KB per 100 samples
 */

import type { Coordinates } from '@/lib/types/index';

/**
 * GPS Sample - một coordinate reading từ GPS
 */
interface GPSSample {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy?: number; // meters
}

/**
 * Noise Filter Configuration
 */
export interface NoiseFilterConfig {
  /**
   * Window size for moving average
   * Lớn hơn = smoother nhưng lag hơn
   * Nhỏ hơn = responsive hơn nhưng nhiều noise hơn
   * 
   * Recommended: 5-10 samples
   */
  windowSize: number;

  /**
   * Max age of samples to keep (milliseconds)
   * Samples cũ hơn sẽ bị discard
   * 
   * Recommended: 30000ms (30 seconds)
   */
  maxAge: number;

  /**
   * Min accuracy threshold (meters)
   * Discard samples với accuracy thấp hơn threshold
   * 
   * Recommended: 50 meters
   * Set to Infinity to disable accuracy filtering
   */
  minAccuracy: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: NoiseFilterConfig = {
  windowSize: 5,
  maxAge: 30000, // 30 seconds
  minAccuracy: 50, // meters
};

/**
 * GPS Noise Filter Class
 * 
 * @example
 * ```ts
 * const filter = new NoiseFilter({ windowSize: 5 });
 * 
 * // Add GPS readings as they arrive
 * const smoothed = filter.addSample({
 *   lat: 10.759,
 *   lng: 106.705,
 *   timestamp: Date.now(),
 *   accuracy: 15,
 * });
 * 
 * console.log(smoothed); // { lat: 10.7588, lng: 106.7048 }
 * ```
 */
export class NoiseFilter {
  protected samples: GPSSample[] = [];
  protected config: NoiseFilterConfig;

  constructor(config: Partial<NoiseFilterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add new GPS sample and return smoothed coordinates
   * 
   * @param sample - New GPS reading
   * @returns Smoothed coordinates using moving average
   */
  addSample(sample: GPSSample): Coordinates {
    // Filter out low accuracy samples
    if (sample.accuracy && sample.accuracy > this.config.minAccuracy) {
      // Don't add to buffer but still return last known good position
      if (this.samples.length > 0) {
        return this.getCurrentPosition();
      }
      // If no history, return the raw sample to avoid crashing
      // (Better to have a noisy position than no position/error)
      return { lat: sample.lat, lng: sample.lng };
    }

    // Add sample to buffer
    this.samples.push(sample);

    // Remove old samples beyond max age
    this.removeOldSamples();

    // Keep only most recent N samples (window size)
    if (this.samples.length > this.config.windowSize) {
      this.samples = this.samples.slice(-this.config.windowSize);
    }

    // Calculate moving average
    return this.calculateMovingAverage();
  }

  /**
   * Get current smoothed position without adding new sample
   */
  getCurrentPosition(): Coordinates {
    if (this.samples.length === 0) {
      throw new Error('No GPS samples available. Call addSample() first.');
    }

    return this.calculateMovingAverage();
  }

  /**
   * Calculate moving average of all samples in buffer
   */
  protected calculateMovingAverage(): Coordinates {
    if (this.samples.length === 0) {
      throw new Error('No samples to calculate average');
    }

    let sumLat = 0;
    let sumLng = 0;

    for (const sample of this.samples) {
      sumLat += sample.lat;
      sumLng += sample.lng;
    }

    return {
      lat: sumLat / this.samples.length,
      lng: sumLng / this.samples.length,
    };
  }

  /**
   * Remove samples older than maxAge
   */
  private removeOldSamples(): void {
    const now = Date.now();
    this.samples = this.samples.filter((sample) => now - sample.timestamp <= this.config.maxAge);
  }

  /**
   * Reset filter (clear all samples)
   */
  reset(): void {
    this.samples = [];
  }

  /**
   * Get number of samples in buffer
   */
  getSampleCount(): number {
    return this.samples.length;
  }

  /**
   * Check if filter has enough samples for reliable smoothing
   */
  isWarmedUp(): boolean {
    return this.samples.length >= this.config.windowSize;
  }

  /**
   * Get all samples (for debugging)
   */
  getSamples(): GPSSample[] {
    return [...this.samples];
  }

  /**
   * Update filter configuration
   */
  updateConfig(config: Partial<NoiseFilterConfig>): void {
    this.config = { ...this.config, ...config };

    // Re-apply window size limit
    if (this.samples.length > this.config.windowSize) {
      this.samples = this.samples.slice(-this.config.windowSize);
    }
  }
}

/**
 * Weighted Moving Average Filter
 * 
 * Gần giống Simple Moving Average nhưng samples gần đây có weight cao hơn
 * Better responsiveness với reasonable smoothing
 * 
 * @example
 * ```ts
 * const filter = new WeightedNoiseFilter({ windowSize: 5 });
 * const smoothed = filter.addSample({
 *   lat: 10.759,
 *   lng: 106.705,
 *   timestamp: Date.now(),
 *   accuracy: 15,
 * });
 * ```
 */
export class WeightedNoiseFilter extends NoiseFilter {
  /**
   * Calculate weighted moving average
   * Most recent sample has weight = windowSize
   * Oldest sample has weight = 1
   */
  protected override calculateMovingAverage(): Coordinates {
    if (this.samples.length === 0) {
      throw new Error('No samples to calculate average');
    }

    let sumLat = 0;
    let sumLng = 0;
    let totalWeight = 0;

    for (let i = 0; i < this.samples.length; i++) {
      const weight = i + 1; // Linear weights: 1, 2, 3, ...
      const sample = this.samples[i]!; // Non-null assertion: loop bounds guarantee valid index

      sumLat += sample.lat * weight;
      sumLng += sample.lng * weight;
      totalWeight += weight;
    }

    return {
      lat: sumLat / totalWeight,
      lng: sumLng / totalWeight,
    };
  }
}

/**
 * Create noise filter helper function
 * 
 * @param type - Filter type ('simple' | 'weighted')
 * @param config - Filter configuration
 * @returns NoiseFilter instance
 * 
 * @example
 * ```ts
 * const filter = createNoiseFilter('weighted', { windowSize: 7 });
 * ```
 */
export function createNoiseFilter(
  type: 'simple' | 'weighted' = 'simple',
  config?: Partial<NoiseFilterConfig>
): NoiseFilter {
  if (type === 'weighted') {
    return new WeightedNoiseFilter(config);
  }
  return new NoiseFilter(config);
}

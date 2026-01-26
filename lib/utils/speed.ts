/**
 * Speed Calculator
 * 
 * Tính tốc độ di chuyển từ GPS coordinates
 * 
 * Features:
 * - Calculate speed from consecutive GPS readings
 * - Smooth speed using moving average (reduce GPS noise)
 * - Detect movement states (stationary, walking, running, vehicle)
 * - Format speed for display
 * 
 * Use cases:
 * - Pause auto-play khi user đi quá nhanh (>15 km/h)
 * - Detect stationary state (pause tour sau 5 phút)
 * - Show speed warning in UI
 */

import { calculateDistance } from './distance';
import type { Coordinates } from '@/lib/types/index';

/**
 * Speed reading
 */
interface SpeedReading {
  speed: number; // meters per second
  timestamp: number;
  coordinates: Coordinates;
}

/**
 * Movement state classification
 */
export type MovementState = 'stationary' | 'walking' | 'jogging' | 'running' | 'vehicle';

/**
 * Speed thresholds for movement states (m/s)
 */
const SPEED_THRESHOLDS = {
  STATIONARY: 0.5, // < 0.5 m/s (~1.8 km/h)
  WALKING: 2.0, // < 2.0 m/s (~7.2 km/h)
  JOGGING: 3.5, // < 3.5 m/s (~12.6 km/h)
  RUNNING: 5.0, // < 5.0 m/s (~18 km/h)
  VEHICLE: 5.0, // >= 5.0 m/s (~18 km/h)
} as const;

/**
 * Speed Calculator Configuration
 */
export interface SpeedCalculatorConfig {
  /**
   * Window size for moving average (smoothing)
   * Recommended: 3-5 readings
   */
  windowSize: number;

  /**
   * Min time between readings (milliseconds)
   * Ignore readings too close together (GPS update rate limit)
   * Recommended: 1000ms (1 second)
   */
  minTimeDelta: number;

  /**
   * Max speed threshold (m/s)
   * Discard readings with unrealistic speeds (GPS glitches)
   * Recommended: 50 m/s (~180 km/h)
   */
  maxSpeed: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: SpeedCalculatorConfig = {
  windowSize: 3,
  minTimeDelta: 1000, // 1 second
  maxSpeed: 50, // 50 m/s (~180 km/h)
};

/**
 * Speed Calculator Class
 * 
 * @example
 * ```ts
 * const speedCalc = new SpeedCalculator();
 * 
 * // Add GPS readings
 * const speed = speedCalc.addReading({
 *   lat: 10.759,
 *   lng: 106.705,
 * });
 * 
 * console.log(speed); // 1.5 m/s
 * console.log(speedCalc.getState()); // 'walking'
 * console.log(speedCalc.getSpeedKmh()); // 5.4 km/h
 * ```
 */
export class SpeedCalculator {
  private readings: SpeedReading[] = [];
  private config: SpeedCalculatorConfig;
  private currentSpeed: number = 0; // m/s

  constructor(config: Partial<SpeedCalculatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add new GPS reading and calculate speed
   * 
   * @param coordinates - New GPS coordinates
   * @param timestamp - Optional timestamp (default: now)
   * @returns Calculated speed in m/s (null if not enough data)
   */
  addReading(coordinates: Coordinates, timestamp: number = Date.now()): number | null {
    // Need at least 1 previous reading to calculate speed
    if (this.readings.length === 0) {
      this.readings.push({ speed: 0, timestamp, coordinates });
      return null;
    }

    const lastReading = this.readings[this.readings.length - 1]!; // Non-null: length check ensures element exists
    const timeDelta = timestamp - lastReading.timestamp;

    // Ignore if too soon (GPS hasn't updated yet)
    if (timeDelta < this.config.minTimeDelta) {
      return this.currentSpeed;
    }

    // Calculate distance traveled
    const distance = calculateDistance(lastReading.coordinates, coordinates);

    // Calculate speed (m/s)
    const speed = distance / (timeDelta / 1000);

    // Discard unrealistic speeds (GPS glitch)
    if (speed > this.config.maxSpeed) {
      return this.currentSpeed;
    }

    // Add to readings buffer
    this.readings.push({ speed, timestamp, coordinates });

    // Keep only most recent N readings (window size)
    if (this.readings.length > this.config.windowSize) {
      this.readings = this.readings.slice(-this.config.windowSize);
    }

    // Calculate smoothed speed (moving average)
    this.currentSpeed = this.calculateAverageSpeed();

    return this.currentSpeed;
  }

  /**
   * Get current speed in m/s
   */
  getSpeed(): number {
    return this.currentSpeed;
  }

  /**
   * Get current speed in km/h
   */
  getSpeedKmh(): number {
    return this.currentSpeed * 3.6;
  }

  /**
   * Get current speed in mph
   */
  getSpeedMph(): number {
    return this.currentSpeed * 2.237;
  }

  /**
   * Calculate average speed from readings buffer
   */
  private calculateAverageSpeed(): number {
    if (this.readings.length === 0) {
      return 0;
    }

    const sum = this.readings.reduce((acc, reading) => acc + reading.speed, 0);
    return sum / this.readings.length;
  }

  /**
   * Get movement state based on current speed
   */
  getState(): MovementState {
    const speed = this.currentSpeed;

    if (speed < SPEED_THRESHOLDS.STATIONARY) {
      return 'stationary';
    }

    if (speed < SPEED_THRESHOLDS.WALKING) {
      return 'walking';
    }

    if (speed < SPEED_THRESHOLDS.JOGGING) {
      return 'jogging';
    }

    if (speed < SPEED_THRESHOLDS.RUNNING) {
      return 'running';
    }

    return 'vehicle';
  }

  /**
   * Check if user is stationary (not moving)
   */
  isStationary(): boolean {
    return this.currentSpeed < SPEED_THRESHOLDS.STATIONARY;
  }

  /**
   * Check if user is walking (ideal for tour)
   */
  isWalking(): boolean {
    return (
      this.currentSpeed >= SPEED_THRESHOLDS.STATIONARY &&
      this.currentSpeed < SPEED_THRESHOLDS.WALKING
    );
  }

  /**
   * Check if user is moving too fast (vehicle)
   */
  isTooFast(): boolean {
    return this.currentSpeed >= SPEED_THRESHOLDS.VEHICLE;
  }

  /**
   * Check if user should continue tour (not too fast)
   */
  shouldContinueTour(): boolean {
    return this.currentSpeed < SPEED_THRESHOLDS.VEHICLE;
  }

  /**
   * Reset calculator (clear readings)
   */
  reset(): void {
    this.readings = [];
    this.currentSpeed = 0;
  }

  /**
   * Get number of readings in buffer
   */
  getReadingCount(): number {
    return this.readings.length;
  }

  /**
   * Check if calculator has enough readings for reliable speed
   */
  isWarmedUp(): boolean {
    return this.readings.length >= this.config.windowSize;
  }

  /**
   * Get all readings (for debugging)
   */
  getReadings(): SpeedReading[] {
    return [...this.readings];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SpeedCalculatorConfig>): void {
    this.config = { ...this.config, ...config };

    // Re-apply window size limit
    if (this.readings.length > this.config.windowSize) {
      this.readings = this.readings.slice(-this.config.windowSize);
    }
  }

  /**
   * Format speed for display
   * 
   * @param locale - Locale for number formatting
   * @returns Formatted string (e.g., "5.4 km/h", "Đang đứng yên")
   */
  formatSpeed(locale: string = 'vi-VN'): string {
    if (this.isStationary()) {
      return locale === 'vi-VN' ? 'Đang đứng yên' : 'Stationary';
    }

    const kmh = this.getSpeedKmh();
    return `${kmh.toLocaleString(locale, { maximumFractionDigits: 1 })} km/h`;
  }

  /**
   * Get movement state description (localized)
   */
  getStateDescription(locale: string = 'vi-VN'): string {
    const state = this.getState();

    if (locale === 'vi-VN') {
      const descriptions: Record<MovementState, string> = {
        stationary: 'Đang đứng yên',
        walking: 'Đang đi bộ',
        jogging: 'Đang chạy bộ nhẹ',
        running: 'Đang chạy',
        vehicle: 'Đang di chuyển bằng xe',
      };
      return descriptions[state];
    }

    // English
    const descriptions: Record<MovementState, string> = {
      stationary: 'Stationary',
      walking: 'Walking',
      jogging: 'Jogging',
      running: 'Running',
      vehicle: 'In vehicle',
    };
    return descriptions[state];
  }
}

/**
 * Global speed calculator instance
 */
let globalSpeedCalculator: SpeedCalculator | null = null;

/**
 * Get global speed calculator instance (singleton)
 * 
 * @example
 * ```ts
 * const speedCalc = getSpeedCalculator();
 * speedCalc.addReading({ lat: 10.759, lng: 106.705 });
 * console.log(speedCalc.getSpeedKmh());
 * ```
 */
export function getSpeedCalculator(): SpeedCalculator {
  if (!globalSpeedCalculator) {
    globalSpeedCalculator = new SpeedCalculator();
  }
  return globalSpeedCalculator;
}

/**
 * Reset global speed calculator
 */
export function resetSpeedCalculator(config?: Partial<SpeedCalculatorConfig>): void {
  globalSpeedCalculator = new SpeedCalculator(config);
}

/**
 * Convert m/s to km/h
 */
export function msToKmh(ms: number): number {
  return ms * 3.6;
}

/**
 * Convert m/s to mph
 */
export function msToMph(ms: number): number {
  return ms * 2.237;
}

/**
 * Convert km/h to m/s
 */
export function kmhToMs(kmh: number): number {
  return kmh / 3.6;
}

/**
 * Convert mph to m/s
 */
export function mphToMs(mph: number): number {
  return mph / 2.237;
}

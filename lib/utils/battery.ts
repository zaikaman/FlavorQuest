/**
 * Battery Status Detection
 * 
 * Monitor battery level và charging status để optimize app behavior
 * 
 * Features:
 * - Detect battery level (0-100%)
 * - Detect charging status
 * - Battery optimization recommendations
 * - Low battery warnings
 * 
 * Use cases:
 * - Reduce GPS update frequency khi battery thấp
 * - Disable audio preload khi battery < 20%
 * - Show low battery warning
 * - Auto-enable battery saver mode
 * 
 * Browser Support:
 * - Chrome/Edge: ✅ Full support
 * - Firefox: ✅ Full support
 * - Safari: ❌ Not supported (returns null)
 * - iOS Safari: ❌ Not supported
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Battery_Status_API
 */

/**
 * Battery info
 */
export interface BatteryInfo {
  /**
   * Battery level (0-1, multiply by 100 for percentage)
   */
  level: number;

  /**
   * Is charging
   */
  charging: boolean;

  /**
   * Time remaining until fully charged (seconds)
   * Infinity if not charging or can't estimate
   */
  chargingTime: number;

  /**
   * Time remaining until battery empty (seconds)
   * Infinity if charging or can't estimate
   */
  dischargingTime: number;
}

/**
 * Battery optimization mode
 */
export type BatteryMode = 'normal' | 'low-power' | 'critical';

/**
 * Battery status thresholds
 */
const BATTERY_THRESHOLDS = {
  LOW: 0.2, // 20%
  CRITICAL: 0.1, // 10%
} as const;

/**
 * Battery Manager Class
 * 
 * @example
 * ```ts
 * const battery = new BatteryManager();
 * await battery.init();
 * 
 * const info = battery.getInfo();
 * console.log(`Battery: ${info.level * 100}%`);
 * console.log(`Charging: ${info.charging}`);
 * 
 * if (battery.isLow()) {
 *   console.log('Battery low! Enabling power saving...');
 * }
 * ```
 */
export class BatteryManager {
  private battery: any = null;
  private supported: boolean = false;
  private listeners: Array<(info: BatteryInfo) => void> = [];

  /**
   * Initialize battery manager
   * Must call before using other methods
   * 
   * @returns True if battery API is supported
   */
  async init(): Promise<boolean> {
    // Check if Battery Status API is available
    if (!('getBattery' in navigator)) {
      this.supported = false;
      return false;
    }

    try {
      // @ts-ignore - Battery Status API not in TypeScript lib
      this.battery = await navigator.getBattery();
      this.supported = true;

      // Setup event listeners
      this.battery.addEventListener('levelchange', this.handleBatteryChange);
      this.battery.addEventListener('chargingchange', this.handleBatteryChange);

      return true;
    } catch (error) {
      console.warn('Battery Status API not supported:', error);
      this.supported = false;
      return false;
    }
  }

  /**
   * Check if Battery Status API is supported
   */
  isSupported(): boolean {
    return this.supported;
  }

  /**
   * Get current battery info
   * Returns null if API not supported
   */
  getInfo(): BatteryInfo | null {
    if (!this.supported || !this.battery) {
      return null;
    }

    return {
      level: this.battery.level,
      charging: this.battery.charging,
      chargingTime: this.battery.chargingTime,
      dischargingTime: this.battery.dischargingTime,
    };
  }

  /**
   * Get battery level as percentage (0-100)
   */
  getLevel(): number | null {
    const info = this.getInfo();
    return info ? Math.round(info.level * 100) : null;
  }

  /**
   * Check if device is charging
   */
  isCharging(): boolean | null {
    const info = this.getInfo();
    return info?.charging ?? null;
  }

  /**
   * Check if battery is low (< 20%)
   */
  isLow(): boolean {
    const info = this.getInfo();
    if (!info) return false;
    return info.level < BATTERY_THRESHOLDS.LOW;
  }

  /**
   * Check if battery is critical (< 10%)
   */
  isCritical(): boolean {
    const info = this.getInfo();
    if (!info) return false;
    return info.level < BATTERY_THRESHOLDS.CRITICAL;
  }

  /**
   * Get recommended battery mode
   */
  getRecommendedMode(): BatteryMode {
    const info = this.getInfo();

    if (!info) {
      return 'normal';
    }

    // If charging, always normal mode
    if (info.charging) {
      return 'normal';
    }

    // Critical battery
    if (info.level < BATTERY_THRESHOLDS.CRITICAL) {
      return 'critical';
    }

    // Low battery
    if (info.level < BATTERY_THRESHOLDS.LOW) {
      return 'low-power';
    }

    return 'normal';
  }

  /**
   * Get battery optimization recommendations
   */
  getOptimizationRecommendations(): string[] {
    const mode = this.getRecommendedMode();
    const recommendations: string[] = [];

    if (mode === 'low-power') {
      recommendations.push('Giảm tần suất cập nhật GPS');
      recommendations.push('Tắt preload audio tự động');
      recommendations.push('Giảm độ sáng màn hình');
    }

    if (mode === 'critical') {
      recommendations.push('Tắt GPS (chỉ dùng manual mode)');
      recommendations.push('Tắt audio tự động phát');
      recommendations.push('Tắt map tiles preload');
      recommendations.push('Sạc thiết bị ngay');
    }

    return recommendations;
  }

  /**
   * Format battery info for display
   */
  formatBatteryInfo(locale: string = 'vi-VN'): string {
    const info = this.getInfo();

    if (!info) {
      return locale === 'vi-VN' ? 'Không rõ' : 'Unknown';
    }

    const percentage = Math.round(info.level * 100);
    const charging = info.charging
      ? locale === 'vi-VN'
        ? 'Đang sạc'
        : 'Charging'
      : locale === 'vi-VN'
        ? 'Không sạc'
        : 'Not charging';

    return `${percentage}% (${charging})`;
  }

  /**
   * Add change listener
   * 
   * @param callback - Called when battery status changes
   */
  onChange(callback: (info: BatteryInfo) => void): void {
    this.listeners.push(callback);
  }

  /**
   * Remove change listener
   */
  removeListener(callback: (info: BatteryInfo) => void): void {
    this.listeners = this.listeners.filter((listener) => listener !== callback);
  }

  /**
   * Handle battery change events
   */
  private handleBatteryChange = (): void => {
    const info = this.getInfo();
    if (!info) return;

    // Notify all listeners
    this.listeners.forEach((listener) => listener(info));
  };

  /**
   * Cleanup (remove event listeners)
   */
  destroy(): void {
    if (this.battery) {
      this.battery.removeEventListener('levelchange', this.handleBatteryChange);
      this.battery.removeEventListener('chargingchange', this.handleBatteryChange);
    }

    this.listeners = [];
  }
}

/**
 * Global battery manager instance
 */
let globalBatteryManager: BatteryManager | null = null;

/**
 * Get global battery manager instance (singleton)
 * Auto-initializes on first call
 * 
 * @example
 * ```ts
 * const battery = await getBatteryManager();
 * const level = battery.getLevel();
 * console.log(`Battery: ${level}%`);
 * ```
 */
export async function getBatteryManager(): Promise<BatteryManager> {
  if (!globalBatteryManager) {
    globalBatteryManager = new BatteryManager();
    await globalBatteryManager.init();
  }
  return globalBatteryManager;
}

/**
 * Quick check: Is battery low?
 * 
 * @example
 * ```ts
 * if (await isBatteryLow()) {
 *   console.log('Enable power saving mode');
 * }
 * ```
 */
export async function isBatteryLow(): Promise<boolean> {
  const battery = await getBatteryManager();
  return battery.isLow();
}

/**
 * Quick check: Is battery critical?
 */
export async function isBatteryCritical(): Promise<boolean> {
  const battery = await getBatteryManager();
  return battery.isCritical();
}

/**
 * Quick check: Is device charging?
 */
export async function isDeviceCharging(): Promise<boolean | null> {
  const battery = await getBatteryManager();
  return battery.isCharging();
}

/**
 * Get battery level percentage (0-100)
 */
export async function getBatteryLevel(): Promise<number | null> {
  const battery = await getBatteryManager();
  return battery.getLevel();
}

/**
 * Apply battery optimization settings
 * 
 * @param mode - Battery mode
 * @returns Recommended settings
 * 
 * @example
 * ```ts
 * const battery = await getBatteryManager();
 * const mode = battery.getRecommendedMode();
 * const settings = applyBatteryOptimization(mode);
 * console.log(settings);
 * // {
 * //   gpsUpdateInterval: 5000,
 * //   preloadEnabled: false,
 * //   autoPlayEnabled: true,
 * // }
 * ```
 */
export function applyBatteryOptimization(mode: BatteryMode) {
  switch (mode) {
    case 'critical':
      return {
        gpsUpdateInterval: 10000, // 10 seconds
        preloadEnabled: false,
        autoPlayEnabled: false,
        mapTilesPreload: false,
        geofenceRadius: 25, // Larger radius = less GPS checks
      };

    case 'low-power':
      return {
        gpsUpdateInterval: 5000, // 5 seconds
        preloadEnabled: false,
        autoPlayEnabled: true,
        mapTilesPreload: false,
        geofenceRadius: 20,
      };

    case 'normal':
    default:
      return {
        gpsUpdateInterval: 2000, // 2 seconds
        preloadEnabled: true,
        autoPlayEnabled: true,
        mapTilesPreload: true,
        geofenceRadius: 18,
      };
  }
}

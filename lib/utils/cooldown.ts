/**
 * Cooldown Manager
 * 
 * Quản lý cooldown period cho POI auto-play
 * Prevent audio phát lại lần nữa trong vòng N phút sau lần phát gần nhất
 * 
 * Features:
 * - Per-POI cooldown tracking
 * - Persistent storage (survives page reload)
 * - Configurable cooldown duration
 * - Memory-efficient (chỉ lưu timestamp, không lưu POI data)
 * 
 * Use cases:
 * - Ngăn audio lặp lại khi user đi qua POI nhiều lần
 * - Ngăn audio phát khi user đứng gần POI boundary (GPS drift)
 * - Allow replay sau một thời gian đủ dài
 */

import { saveCooldown, getLastPlayed, loadCooldownTracker, clearCooldownTracker } from '@/lib/services/storage';
import { COOLDOWN_PERIOD_MS } from '@/lib/constants/index';

/**
 * Cooldown Manager Class
 * 
 * @example
 * ```ts
 * const cooldown = new CooldownManager();
 * 
 * // Check if POI is in cooldown
 * const canPlay = await cooldown.canPlay('poi-123');
 * 
 * if (canPlay) {
 *   // Play audio
 *   await playAudio(poiId);
 *   
 *   // Mark as played
 *   await cooldown.markAsPlayed('poi-123');
 * }
 * ```
 */
export class CooldownManager {
  private cooldownDuration: number;

  /**
   * @param cooldownDuration - Cooldown duration in milliseconds (default: 30 minutes)
   */
  constructor(cooldownDuration: number = COOLDOWN_PERIOD_MS) {
    this.cooldownDuration = cooldownDuration;
  }

  /**
   * Check if POI can be played (not in cooldown)
   * 
   * @param poiId - POI UUID
   * @returns True if POI can be played (cooldown expired or never played)
   */
  async canPlay(poiId: string): Promise<boolean> {
    const lastPlayed = await getLastPlayed(poiId);

    if (lastPlayed === null) {
      // Never played before
      return true;
    }

    const now = Date.now();
    const timeSinceLastPlay = now - lastPlayed;

    return timeSinceLastPlay >= this.cooldownDuration;
  }

  /**
   * Mark POI as played (start cooldown)
   * 
   * @param poiId - POI UUID
   * @param timestamp - Optional timestamp (default: now)
   */
  async markAsPlayed(poiId: string, timestamp: number = Date.now()): Promise<void> {
    await saveCooldown(poiId, timestamp);
  }

  /**
   * Get remaining cooldown time for POI
   * 
   * @param poiId - POI UUID
   * @returns Remaining cooldown in milliseconds (0 if cooldown expired)
   */
  async getRemainingCooldown(poiId: string): Promise<number> {
    const lastPlayed = await getLastPlayed(poiId);

    if (lastPlayed === null) {
      return 0;
    }

    const now = Date.now();
    const timeSinceLastPlay = now - lastPlayed;
    const remaining = this.cooldownDuration - timeSinceLastPlay;

    return Math.max(0, remaining);
  }

  /**
   * Get time since last play
   * 
   * @param poiId - POI UUID
   * @returns Time since last play in milliseconds (null if never played)
   */
  async getTimeSinceLastPlay(poiId: string): Promise<number | null> {
    const lastPlayed = await getLastPlayed(poiId);

    if (lastPlayed === null) {
      return null;
    }

    const now = Date.now();
    return now - lastPlayed;
  }

  /**
   * Get all POIs currently in cooldown
   * 
   * @returns Array of POI IDs in cooldown
   */
  async getPOIsInCooldown(): Promise<string[]> {
    const tracker = await loadCooldownTracker();
    const now = Date.now();
    const inCooldown: string[] = [];

    for (const [poiId, lastPlayed] of Object.entries(tracker)) {
      const timeSinceLastPlay = now - (lastPlayed as number);
      if (timeSinceLastPlay < this.cooldownDuration) {
        inCooldown.push(poiId);
      }
    }

    return inCooldown;
  }

  /**
   * Clear cooldown for specific POI (allow immediate replay)
   * 
   * @param poiId - POI UUID
   */
  async clearCooldown(poiId: string): Promise<void> {
    const tracker = await loadCooldownTracker();
    delete tracker[poiId];
    // Note: We need to save the entire tracker back
    // This is a limitation - we can't delete individual keys with idb-keyval
    // Workaround: load entire tracker, modify, save back
    await saveCooldown(poiId, 0); // Set to 0 = expired
  }

  /**
   * Clear all cooldowns (reset)
   */
  async clearAllCooldowns(): Promise<void> {
    await clearCooldownTracker();
  }

  /**
   * Filter POIs that can be played (not in cooldown)
   * 
   * @param poiIds - Array of POI IDs to filter
   * @returns Array of POI IDs that can be played
   */
  async filterPlayablePOIs(poiIds: string[]): Promise<string[]> {
    const playable: string[] = [];

    for (const poiId of poiIds) {
      const canPlay = await this.canPlay(poiId);
      if (canPlay) {
        playable.push(poiId);
      }
    }

    return playable;
  }

  /**
   * Update cooldown duration
   * 
   * @param duration - New cooldown duration in milliseconds
   */
  setCooldownDuration(duration: number): void {
    this.cooldownDuration = duration;
  }

  /**
   * Get current cooldown duration
   */
  getCooldownDuration(): number {
    return this.cooldownDuration;
  }

  /**
   * Format cooldown time for display
   * 
   * @param milliseconds - Time in milliseconds
   * @returns Human-readable string (e.g., "5 phút", "1 giờ 30 phút")
   */
  static formatCooldownTime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      if (remainingMinutes > 0) {
        return `${hours} giờ ${remainingMinutes} phút`;
      }
      return `${hours} giờ`;
    }

    if (minutes > 0) {
      return `${minutes} phút`;
    }

    return `${seconds} giây`;
  }
}

/**
 * Global cooldown manager instance
 * Shared across entire app
 */
let globalCooldownManager: CooldownManager | null = null;

/**
 * Get global cooldown manager instance (singleton)
 * 
 * @example
 * ```ts
 * const cooldown = getCooldownManager();
 * const canPlay = await cooldown.canPlay('poi-123');
 * ```
 */
export function getCooldownManager(): CooldownManager {
  if (!globalCooldownManager) {
    globalCooldownManager = new CooldownManager();
  }
  return globalCooldownManager;
}

/**
 * Reset global cooldown manager (create new instance)
 * Useful for testing or when cooldown duration changes
 */
export function resetCooldownManager(cooldownDuration?: number): void {
  globalCooldownManager = new CooldownManager(cooldownDuration);
}

/**
 * Helper: Check if POI is in cooldown (shortcut for global manager)
 */
export async function isCooldownActive(poiId: string): Promise<boolean> {
  const manager = getCooldownManager();
  const canPlay = await manager.canPlay(poiId);
  return !canPlay; // Invert: canPlay = false means cooldown is active
}

/**
 * Helper: Set cooldown for POI (shortcut for global manager)
 */
export async function setCooldown(poiId: string, timestamp?: number): Promise<void> {
  const manager = getCooldownManager();
  await manager.markAsPlayed(poiId, timestamp);
}

/**
 * Helper: Get remaining cooldown time (shortcut for global manager)
 */
export async function getRemainingCooldown(poiId: string): Promise<number> {
  const manager = getCooldownManager();
  return manager.getRemainingCooldown(poiId);
}

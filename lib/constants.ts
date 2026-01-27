/**
 * FlavorQuest Constants
 *
 * Central configuration for app-wide constants.
 * Values are based on research and testing for optimal user experience.
 */

// ============================================
// GEOFENCING CONFIGURATION
// ============================================

/**
 * Bán kính kích hoạt geofence (meters)
 * Default: 15-20m cho trải nghiệm tự nhiên khi đi bộ
 */
export const GEOFENCE_RADIUS_METERS = 18;

/**
 * Alias for compatibility
 */
export const GEOFENCE_TRIGGER_RADIUS_M = GEOFENCE_RADIUS_METERS;

/**
 * Khoảng cách preload audio cho các POI lân cận (meters)
 * POI trong bán kính này sẽ được preload để giảm độ trễ
 */
export const PRELOAD_RADIUS_METERS = 500;

/**
 * Cooldown period giữa các lần phát audio cho cùng POI (milliseconds)
 * Default: 30 phút để tránh phát lặp lại khi user đi qua lại
 */
export const COOLDOWN_PERIOD_MS = 30 * 60 * 1000; // 30 minutes

// ============================================
// SPEED & MOVEMENT DETECTION
// ============================================

/**
 * Ngưỡng tốc độ tối đa cho auto narration (km/h)
 * Nếu user di chuyển nhanh hơn, tạm dừng auto narration
 */
export const MAX_AUTO_PLAY_SPEED_KMH = 15;

/**
 * Alias for compatibility
 */
export const MAX_WALKING_SPEED_KMH = MAX_AUTO_PLAY_SPEED_KMH;

/**
 * Ngưỡng tốc độ để coi như đứng yên (m/s)
 * Dùng để phát hiện user dừng lại
 */
export const STATIONARY_SPEED_MS = 0.5;

/**
 * Thời gian dừng tối đa trước khi auto-pause (milliseconds)
 * Nếu user đứng yên quá lâu, tạm dừng audio để tiết kiệm pin
 */
export const AUTO_PAUSE_DELAY_MS = 5 * 60 * 1000; // 5 minutes

// ============================================
// GPS & LOCATION CONFIGURATION
// ============================================

/**
 * Độ chính xác GPS mong muốn (meters)
 * High accuracy mode cho tracking tốt hơn nhưng tốn pin hơn
 */
export const GPS_DESIRED_ACCURACY_METERS = 10;

/**
 * Thời gian timeout cho GPS position request (milliseconds)
 */
export const GPS_TIMEOUT_MS = 10 * 1000; // 10 seconds

/**
 * Maximum age của cached GPS position (milliseconds)
 */
export const GPS_MAX_AGE_MS = 5 * 1000; // 5 seconds

/**
 * Số lượng samples cho noise filter (moving average)
 */
export const GPS_NOISE_FILTER_SAMPLES = 5;

/**
 * Update interval cho geolocation tracking (milliseconds)
 * Không set quá thấp để tiết kiệm pin
 */
export const GPS_UPDATE_INTERVAL_MS = 3000; // 3 seconds

// ============================================
// BATTERY OPTIMIZATION
// ============================================

/**
 * Ngưỡng pin thấp để hiển thị cảnh báo (%)
 */
export const LOW_BATTERY_THRESHOLD_PERCENT = 20;

/**
 * Ngưỡng pin cực thấp để tự động bật battery saver mode (%)
 */
export const CRITICAL_BATTERY_THRESHOLD_PERCENT = 10;

// ============================================
// AUDIO CONFIGURATION
// ============================================

/**
 * Audio format preferences theo thứ tự ưu tiên
 */
export const AUDIO_FORMATS = ['audio/mpeg', 'audio/mp3', 'audio/ogg'] as const;

/**
 * Default volume level (0.0 - 1.0)
 */
export const DEFAULT_VOLUME = 0.8;

/**
 * Fade in/out duration cho audio transitions (milliseconds)
 */
export const AUDIO_FADE_DURATION_MS = 500;

/**
 * Timeout cho audio loading (milliseconds)
 * Sau timeout, fallback to TTS
 */
export const AUDIO_LOAD_TIMEOUT_MS = 5000;

// ============================================
// LANGUAGE CONFIGURATION
// ============================================

/**
 * Supported languages
 * Format: { code, name, nativeName, flag }
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', ttsLang: 'vi-VN' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', ttsLang: 'en-US' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', ttsLang: 'ja-JP' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', ttsLang: 'fr-FR' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', ttsLang: 'ko-KR' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', ttsLang: 'zh-CN' },
] as const;

/**
 * Default language (Vietnamese)
 */
export const DEFAULT_LANGUAGE = 'vi';

/**
 * Fallback language khi language hiện tại không có content
 */
export const FALLBACK_LANGUAGE = 'en';

// ============================================
// MAP CONFIGURATION
// ============================================

/**
 * OpenStreetMap tile server URL
 */
export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

/**
 * OSM attribution
 */
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Map zoom levels
 */
export const MAP_ZOOM = {
  MIN: 15,
  DEFAULT: 17,
  MAX: 19,
} as const;

/**
 * Vĩnh Khánh area center coordinates
 */
export const VINH_KHANH_CENTER = {
  lat: 10.7589,
  lng: 106.7049,
} as const;

/**
 * Map bounds cho khu vực Vĩnh Khánh
 */
export const VINH_KHANH_BOUNDS = {
  north: 10.763,
  south: 10.755,
  east: 106.709,
  west: 106.701,
} as const;

// ============================================
// CACHE & STORAGE CONFIGURATION
// ============================================

/**
 * IndexedDB database name
 */
export const IDB_NAME = 'flavorquest-db';

/**
 * IndexedDB version
 */
export const IDB_VERSION = 1;

/**
 * Cache storage name cho service worker
 */
export const CACHE_NAME = 'flavorquest-cache-v1';

/**
 * Maximum cache size (bytes)
 * ~50MB limit cho audio + images + tiles
 */
export const MAX_CACHE_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Cache expiration time (milliseconds)
 * POI data sẽ được refresh sau 24 giờ
 */
export const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// ============================================
// ANALYTICS CONFIGURATION
// ============================================

/**
 * GPS coordinate rounding precision (decimal places)
 * Để protect user privacy, làm tròn coordinates trước khi log
 */
export const GPS_ROUNDING_PRECISION = 3; // ~111m accuracy

/**
 * Analytics batch size
 * Số events được queue trước khi sync
 */
export const ANALYTICS_BATCH_SIZE = 10;

/**
 * Analytics sync interval khi offline (milliseconds)
 */
export const ANALYTICS_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// ============================================
// UI CONFIGURATION
// ============================================

/**
 * Toast notification duration (milliseconds)
 */
export const TOAST_DURATION_MS = 4000;

/**
 * Modal animation duration (milliseconds)
 */
export const MODAL_ANIMATION_MS = 300;

/**
 * Bottom navigation height (pixels)
 */
export const BOTTOM_NAV_HEIGHT_PX = 64;

/**
 * FAB (Floating Action Button) size (pixels)
 */
export const FAB_SIZE_PX = 56;

// ============================================
// POI PRIORITY LEVELS
// ============================================

/**
 * POI priority levels
 * Higher priority POIs sẽ được phát trước nếu nhiều POI cùng trigger
 */
export const POI_PRIORITY = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
} as const;

// ============================================
// APP METADATA
// ============================================

/**
 * App name
 */
export const APP_NAME = 'FlavorQuest';

/**
 * App version
 */
export const APP_VERSION = '1.0.0';

/**
 * Contact email
 */
export const CONTACT_EMAIL = 'support@flavorquest.app';

/**
 * App description
 */
export const APP_DESCRIPTION =
  'Khám phá phố ẩm thực Vĩnh Khánh với thuyết minh âm thanh tự động dựa trên vị trí';

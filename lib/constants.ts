/**
 * FlavorQuest constants shared across the application.
 */

// ============================================
// GEOFENCING CONFIGURATION
// ============================================

/**
 * Bán kính kích hoạt geofence (meters).
 */
export const GEOFENCE_RADIUS_METERS = 18;

/**
 * Alias for compatibility.
 */
export const GEOFENCE_TRIGGER_RADIUS_M = GEOFENCE_RADIUS_METERS;

/**
 * Khoảng cách preload audio cho các POI lân cận (meters).
 */
export const PRELOAD_RADIUS_METERS = 500;

/**
 * Cooldown period giữa các lần phát audio cho cùng POI (milliseconds).
 */
export const COOLDOWN_PERIOD_MS = 30 * 60 * 1000;

// ============================================
// SPEED & MOVEMENT DETECTION
// ============================================

/**
 * Ngưỡng tốc độ tối đa cho auto narration (km/h).
 */
export const MAX_AUTO_PLAY_SPEED_KMH = 15;

/**
 * Alias for compatibility.
 */
export const MAX_WALKING_SPEED_KMH = MAX_AUTO_PLAY_SPEED_KMH;

/**
 * Ngưỡng tốc độ để coi như đứng yên (m/s).
 */
export const STATIONARY_SPEED_MS = 0.5;

/**
 * Thời gian dừng tối đa trước khi auto-pause (milliseconds).
 */
export const AUTO_PAUSE_DELAY_MS = 5 * 60 * 1000;

// ============================================
// GPS & LOCATION CONFIGURATION
// ============================================

/**
 * Độ chính xác GPS mong muốn (meters).
 */
export const GPS_DESIRED_ACCURACY_METERS = 10;

/**
 * Thời gian timeout cho GPS position request (milliseconds).
 */
export const GPS_TIMEOUT_MS = 10 * 1000;

/**
 * Maximum age của cached GPS position (milliseconds).
 */
export const GPS_MAX_AGE_MS = 5 * 1000;

/**
 * Số lượng samples cho noise filter (moving average).
 */
export const GPS_NOISE_FILTER_SAMPLES = 5;

/**
 * Update interval cho geolocation tracking (milliseconds).
 */
export const GPS_UPDATE_INTERVAL_MS = 3000;

// ============================================
// BATTERY OPTIMIZATION
// ============================================

/**
 * Ngưỡng pin thấp để hiển thị cảnh báo (%).
 */
export const LOW_BATTERY_THRESHOLD_PERCENT = 20;

/**
 * Ngưỡng pin cực thấp để tự động bật battery saver mode (%).
 */
export const CRITICAL_BATTERY_THRESHOLD_PERCENT = 10;

// ============================================
// AUDIO CONFIGURATION
// ============================================

/**
 * Audio format preferences theo thứ tự ưu tiên.
 */
export const AUDIO_FORMATS = ['audio/mpeg', 'audio/mp3', 'audio/ogg'] as const;

/**
 * Default volume level (0.0 - 1.0).
 */
export const DEFAULT_VOLUME = 0.8;

/**
 * Fade in/out duration cho audio transitions (milliseconds).
 */
export const AUDIO_FADE_DURATION_MS = 500;

/**
 * Timeout cho audio loading (milliseconds).
 */
export const AUDIO_LOAD_TIMEOUT_MS = 5000;

// ============================================
// LANGUAGE CONFIGURATION
// ============================================

export const SUPPORTED_LANGUAGE_CODES = [
  'vi',
  'en',
  'zh',
  'es',
  'hi',
  'ar',
  'ja',
  'fr',
  'ko',
  'pt',
  'de',
  'ru',
  'id',
  'bn',
  'ur',
  'te',
  'mr',
  'tr',
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGE_CODES)[number];

type SupportedLanguageConfig = {
  code: SupportedLanguageCode;
  name: string;
  nativeName: string;
  shortLabel: string;
  translationName: string;
  ttsLang: string;
  voice: string;
  featured: boolean;
  dir: 'ltr' | 'rtl';
};

/**
 * Default language (Vietnamese).
 */
export const DEFAULT_LANGUAGE: SupportedLanguageCode = 'vi';

/**
 * Fallback language khi language hiện tại không có content.
 */
export const FALLBACK_LANGUAGE: SupportedLanguageCode = 'en';

export const FEATURED_LANGUAGE_CODES = ['vi', 'en', 'zh', 'es', 'ja', 'ko'] as const;

export const SUPPORTED_LANGUAGES: readonly SupportedLanguageConfig[] = [
  {
    code: 'vi',
    name: 'Vietnamese',
    nativeName: 'Tiếng Việt',
    shortLabel: 'VI',
    translationName: 'Vietnamese',
    ttsLang: 'vi-VN',
    voice: 'alloy',
    featured: true,
    dir: 'ltr',
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    shortLabel: 'EN',
    translationName: 'English',
    ttsLang: 'en-US',
    voice: 'echo',
    featured: true,
    dir: 'ltr',
  },
  {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    shortLabel: 'ZH',
    translationName: 'Simplified Chinese',
    ttsLang: 'zh-CN',
    voice: 'onyx',
    featured: true,
    dir: 'ltr',
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    shortLabel: 'ES',
    translationName: 'Spanish',
    ttsLang: 'es-ES',
    voice: 'fable',
    featured: true,
    dir: 'ltr',
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    shortLabel: 'HI',
    translationName: 'Hindi',
    ttsLang: 'hi-IN',
    voice: 'nova',
    featured: false,
    dir: 'ltr',
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    shortLabel: 'AR',
    translationName: 'Arabic',
    ttsLang: 'ar-SA',
    voice: 'shimmer',
    featured: false,
    dir: 'rtl',
  },
  {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    shortLabel: 'JA',
    translationName: 'Japanese',
    ttsLang: 'ja-JP',
    voice: 'shimmer',
    featured: true,
    dir: 'ltr',
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    shortLabel: 'FR',
    translationName: 'French',
    ttsLang: 'fr-FR',
    voice: 'fable',
    featured: false,
    dir: 'ltr',
  },
  {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    shortLabel: 'KO',
    translationName: 'Korean',
    ttsLang: 'ko-KR',
    voice: 'nova',
    featured: true,
    dir: 'ltr',
  },
  {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    shortLabel: 'PT',
    translationName: 'Portuguese',
    ttsLang: 'pt-BR',
    voice: 'alloy',
    featured: false,
    dir: 'ltr',
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    shortLabel: 'DE',
    translationName: 'German',
    ttsLang: 'de-DE',
    voice: 'echo',
    featured: false,
    dir: 'ltr',
  },
  {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    shortLabel: 'RU',
    translationName: 'Russian',
    ttsLang: 'ru-RU',
    voice: 'onyx',
    featured: false,
    dir: 'ltr',
  },
  {
    code: 'id',
    name: 'Indonesian',
    nativeName: 'Bahasa Indonesia',
    shortLabel: 'ID',
    translationName: 'Indonesian',
    ttsLang: 'id-ID',
    voice: 'alloy',
    featured: false,
    dir: 'ltr',
  },
  {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    shortLabel: 'BN',
    translationName: 'Bengali',
    ttsLang: 'bn-BD',
    voice: 'fable',
    featured: false,
    dir: 'ltr',
  },
  {
    code: 'ur',
    name: 'Urdu',
    nativeName: 'اردو',
    shortLabel: 'UR',
    translationName: 'Urdu',
    ttsLang: 'ur-PK',
    voice: 'shimmer',
    featured: false,
    dir: 'rtl',
  },
  {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    shortLabel: 'TE',
    translationName: 'Telugu',
    ttsLang: 'te-IN',
    voice: 'nova',
    featured: false,
    dir: 'ltr',
  },
  {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    shortLabel: 'MR',
    translationName: 'Marathi',
    ttsLang: 'mr-IN',
    voice: 'echo',
    featured: false,
    dir: 'ltr',
  },
  {
    code: 'tr',
    name: 'Turkish',
    nativeName: 'Türkçe',
    shortLabel: 'TR',
    translationName: 'Turkish',
    ttsLang: 'tr-TR',
    voice: 'onyx',
    featured: false,
    dir: 'ltr',
  },
] as const;

export const NON_DEFAULT_LANGUAGE_CODES = SUPPORTED_LANGUAGE_CODES.filter(
  (code) => code !== DEFAULT_LANGUAGE
) as Exclude<SupportedLanguageCode, typeof DEFAULT_LANGUAGE>[];

export const LANGUAGE_CONFIG_MAP = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((language) => [language.code, language])
) as Record<SupportedLanguageCode, SupportedLanguageConfig>;

export function isSupportedLanguageCode(value: unknown): value is SupportedLanguageCode {
  return (
    typeof value === 'string' && SUPPORTED_LANGUAGE_CODES.includes(value as SupportedLanguageCode)
  );
}

export function getLanguageConfig(language: SupportedLanguageCode) {
  return LANGUAGE_CONFIG_MAP[language];
}

export function getLocalizedFieldName<Base extends string>(
  base: Base,
  language: SupportedLanguageCode
): `${Base}_${SupportedLanguageCode}` {
  return `${base}_${language}` as `${Base}_${SupportedLanguageCode}`;
}

// ============================================
// MAP CONFIGURATION
// ============================================

/**
 * OpenStreetMap tile server URL.
 */
export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

/**
 * OSM attribution.
 */
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Map zoom levels.
 */
export const MAP_ZOOM = {
  MIN: 15,
  DEFAULT: 17,
  MAX: 19,
} as const;

/**
 * Vĩnh Khánh area center coordinates.
 */
export const VINH_KHANH_CENTER = {
  lat: 10.7589,
  lng: 106.7049,
} as const;

/**
 * Map bounds cho khu vực Vĩnh Khánh.
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
 * IndexedDB database name.
 */
export const IDB_NAME = 'flavorquest-db';

/**
 * IndexedDB version.
 */
export const IDB_VERSION = 1;

/**
 * Cache storage name cho service worker.
 */
export const CACHE_NAME = 'flavorquest-cache-v1';

/**
 * Maximum cache size (bytes).
 */
export const MAX_CACHE_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Cache expiration time (milliseconds).
 */
export const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000;

// ============================================
// ANALYTICS CONFIGURATION
// ============================================

/**
 * GPS coordinate rounding precision (decimal places).
 */
export const GPS_ROUNDING_PRECISION = 3;

/**
 * Analytics batch size.
 */
export const ANALYTICS_BATCH_SIZE = 10;

/**
 * Analytics sync interval khi offline (milliseconds).
 */
export const ANALYTICS_SYNC_INTERVAL_MS = 5 * 60 * 1000;

// ============================================
// UI CONFIGURATION
// ============================================

/**
 * Toast notification duration (milliseconds).
 */
export const TOAST_DURATION_MS = 4000;

/**
 * Modal animation duration (milliseconds).
 */
export const MODAL_ANIMATION_MS = 300;

/**
 * Bottom navigation height (pixels).
 */
export const BOTTOM_NAV_HEIGHT_PX = 64;

/**
 * FAB (Floating Action Button) size (pixels).
 */
export const FAB_SIZE_PX = 56;

// ============================================
// APP METADATA
// ============================================

/**
 * App name.
 */
export const APP_NAME = 'FlavorQuest';

/**
 * App version.
 */
export const APP_VERSION = '1.0.0';

/**
 * Contact email.
 */
export const CONTACT_EMAIL = 'support@flavorquest.app';

/**
 * App description.
 */
export const APP_DESCRIPTION =
  'Khám phá phố ẩm thực Vĩnh Khánh với thuyết minh âm thanh tự động dựa trên vị trí';

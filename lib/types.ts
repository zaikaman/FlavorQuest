/**
 * FlavorQuest Type Definitions
 *
 * Central type definitions for the entire application.
 * Based on data-model.md and database schema.
 */

// ============================================
// LANGUAGE TYPES
// ============================================

/**
 * Supported language codes
 */
export type Language = 'vi' | 'en' | 'ja' | 'fr' | 'ko' | 'zh';

/**
 * Language configuration object
 */
export type LanguageConfig = {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
  ttsLang: string;
};

// ============================================
// POI (Point of Interest) TYPES
// ============================================

/**
 * POI database entity
 * Represents a food stall or point of interest on Vĩnh Khánh street
 */
export interface POI {
  id: string;
  lat: number;
  lng: number;
  radius: number;
  priority: number;

  // Multi-language name fields
  name_vi: string;
  name_en: string;
  name_ja?: string;
  name_fr?: string;
  name_ko?: string;
  name_zh?: string;

  // Multi-language description fields (used for TTS fallback)
  description_vi?: string;
  description_en?: string;
  description_ja?: string;
  description_fr?: string;
  description_ko?: string;
  description_zh?: string;

  // Multi-language audio URLs
  audio_url_vi?: string;
  audio_url_en?: string;
  audio_url_ja?: string;
  audio_url_fr?: string;
  audio_url_ko?: string;
  audio_url_zh?: string;

  // Media & metadata
  image_url?: string;
  signature_dish?: string;
  fun_fact?: string;
  estimated_hours?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

/**
 * Localized POI
 * POI với fields được localized cho ngôn ngữ hiện tại
 */
export interface LocalizedPOI {
  id: string;
  lat: number;
  lng: number;
  radius: number;
  priority: number;
  name: string;
  description: string;
  audio_url: string;
  image_url?: string;
  signature_dish?: string;
  fun_fact?: string;
  estimated_hours?: string;
}

/**
 * POI với distance từ current location
 */
export interface POIWithDistance extends LocalizedPOI {
  distance: number; // meters
}

/**
 * POI create/update payload
 */
export interface POIPayload {
  lat: number;
  lng: number;
  radius?: number;
  priority?: number;

  name_vi: string;
  name_en: string;
  name_ja?: string;
  name_fr?: string;
  name_ko?: string;
  name_zh?: string;

  description_vi?: string;
  description_en?: string;
  description_ja?: string;
  description_fr?: string;
  description_ko?: string;
  description_zh?: string;

  audio_url_vi?: string;
  audio_url_en?: string;
  audio_url_ja?: string;
  audio_url_fr?: string;
  audio_url_ko?: string;
  audio_url_zh?: string;

  image_url?: string;
  signature_dish?: string;
  fun_fact?: string;
  estimated_hours?: string;
}

// ============================================
// GEOLOCATION TYPES
// ============================================

/**
 * GPS coordinates
 */
export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * GPS position với accuracy và timestamp
 */
export interface Position {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
  speed: number | null;
  heading: number | null;
}

/**
 * Geolocation error
 */
export interface GeolocationError {
  code: number;
  message: string;
}

/**
 * Geolocation permission state
 */
export interface GeolocationState {
  status: 'requesting' | 'granted' | 'denied' | 'unavailable';
  error?: GeolocationError;
}

// ============================================
// AUDIO TYPES
// ============================================

/**
 * Audio playback state
 */
export type AudioState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

/**
 * Audio queue item
 */
export interface AudioQueueItem {
  id: string;
  poiId: string;
  url: string;
  title: string;
  description?: string;
  priority: number;
}

/**
 * Audio player status
 */
export interface AudioPlayerStatus {
  state: AudioState;
  currentItem: AudioQueueItem | null;
  queue: AudioQueueItem[];
  volume: number;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  error: string | null;
}

// ============================================
// ANALYTICS TYPES
// ============================================

/**
 * Analytics event types
 */
export type AnalyticsEventType =
  | 'tour_start'
  | 'tour_end'
  | 'auto_play'
  | 'manual_play'
  | 'skip'
  | 'settings_change';

/**
 * Analytics log entry
 */
export interface AnalyticsLog {
  id: string;
  poi_id?: string;
  session_id: string;
  rounded_lat?: number;
  rounded_lng?: number;
  language?: Language;
  event_type: AnalyticsEventType;
  listen_duration?: number;
  completed?: boolean;
  timestamp: string;
  user_agent?: string;
}

/**
 * Analytics log payload (for creating new logs)
 */
export interface AnalyticsPayload {
  poi_id?: string;
  session_id: string;
  rounded_lat?: number;
  rounded_lng?: number;
  language?: Language;
  event_type: AnalyticsEventType;
  listen_duration?: number;
  completed?: boolean;
  user_agent?: string;
}

/**
 * Analytics summary
 */
export interface AnalyticsSummary {
  total_sessions: number;
  total_plays: number;
  average_listen_duration: number;
  completion_rate: number;
  popular_pois: Array<{
    poi_id: string;
    play_count: number;
  }>;
  language_distribution: Record<Language, number>;
}

// ============================================
// USER TYPES
// ============================================

/**
 * User role
 */
export type UserRole = 'user' | 'admin';

/**
 * User entity
 */
export interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

/**
 * Authentication session
 */
export interface AuthSession {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

// ============================================
// USER SETTINGS TYPES
// ============================================

/**
 * User settings (stored in IndexedDB)
 */
export interface UserSettings {
  language: Language;
  volume: number;
  autoPlayEnabled: boolean;
  geofenceRadius: number;
  batterySaverMode: boolean;
  showNotifications: boolean;
  preferredMapZoom: number;
}

/**
 * Default user settings
 */
export const DEFAULT_USER_SETTINGS: UserSettings = {
  language: 'vi',
  volume: 0.8,
  autoPlayEnabled: true,
  geofenceRadius: 18,
  batterySaverMode: false,
  showNotifications: true,
  preferredMapZoom: 17,
};

// ============================================
// VISIT HISTORY TYPES
// ============================================

/**
 * Visit history entry (stored in IndexedDB)
 */
export interface VisitHistory {
  poi_id: string;
  poi_name: string;
  visited_at: string;
  listened: boolean;
  listen_duration?: number;
}

/**
 * Alias for VisitHistory (backward compatibility)
 */
export type VisitHistoryEntry = VisitHistory;

// ============================================
// COOLDOWN TYPES
// ============================================

/**
 * Cooldown entry (stored in IndexedDB)
 */
export interface CooldownEntry {
  poi_id: string;
  last_played_at: number; // timestamp in milliseconds
}

/**
 * Cooldown tracker record (POI ID -> timestamp mapping)
 */
export type CooldownRecord = Record<string, number>;

// ============================================
// APP STATE TYPES
// ============================================

/**
 * Tour mode
 */
export type TourMode = 'auto' | 'manual';

/**
 * App state
 */
export interface AppState {
  tourMode: TourMode;
  isOnline: boolean;
  isTourActive: boolean;
  currentLanguage: Language;
  currentPosition: Position | null;
  nearbyPOIs: POIWithDistance[];
  selectedPOI: LocalizedPOI | null;
  audioPlayer: AudioPlayerStatus;
  settings: UserSettings;
  sessionId: string;
}

// ============================================
// CACHE TYPES
// ============================================

/**
 * Cache entry với expiration
 */
export interface CacheEntry<T> {
  data: T;
  cached_at: number; // timestamp
  expires_at: number; // timestamp
}

/**
 * POI cache trong IndexedDB
 */
export interface POICache extends CacheEntry<POI[]> {
  version: number;
}

// ============================================
// NOTIFICATION TYPES
// ============================================

/**
 * Toast notification type
 */
export type ToastType = 'info' | 'success' | 'warning' | 'error';

/**
 * Toast notification
 */
export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

// ============================================
// MAP TYPES
// ============================================

/**
 * Map bounds
 */
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Map marker
 */
export interface MapMarker {
  position: Coordinates;
  title: string;
  icon?: string;
  onClick?: () => void;
}

// ============================================
// BATTERY TYPES
// ============================================

/**
 * Battery status
 */
export interface BatteryStatus {
  level: number; // 0-1
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
}

// ============================================
// ERROR TYPES
// ============================================

/**
 * Application error
 */
export interface AppError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Common error codes
 */
export enum ErrorCode {
  LOCATION_PERMISSION_DENIED = 'LOCATION_PERMISSION_DENIED',
  LOCATION_UNAVAILABLE = 'LOCATION_UNAVAILABLE',
  LOCATION_TIMEOUT = 'LOCATION_TIMEOUT',
  AUDIO_LOAD_FAILED = 'AUDIO_LOAD_FAILED',
  AUDIO_PLAY_FAILED = 'AUDIO_PLAY_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  NOT_FOUND = 'NOT_FOUND',
  INVALID_DATA = 'INVALID_DATA',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// ============================================
// API RESPONSE TYPES
// ============================================

/**
 * API success response
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  success: false;
  error: AppError;
}

/**
 * API response (success or error)
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================
// FORM TYPES
// ============================================

/**
 * Form validation error
 */
export interface FormError {
  field: string;
  message: string;
}

/**
 * Form state
 */
export interface FormState<T> {
  values: T;
  errors: FormError[];
  isSubmitting: boolean;
  isDirty: boolean;
  isValid: boolean;
}

// ============================================
// UTILITY TYPE HELPERS
// ============================================

/**
 * Make all properties optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Make specific properties required
 */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Extract multi-language field base name
 */
export type MultiLanguageField<T, K extends string> = {
  [P in `${K}_${Language}`]?: T;
};

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Check if value is a valid Language
 */
export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && ['vi', 'en', 'ja', 'fr', 'ko', 'zh'].includes(value);
}

/**
 * Check if value is a valid Coordinates object
 */
export function isCoordinates(value: unknown): value is Coordinates {
  return (
    typeof value === 'object' &&
    value !== null &&
    'lat' in value &&
    'lng' in value &&
    typeof value.lat === 'number' &&
    typeof value.lng === 'number'
  );
}

/**
 * Check if API response is success
 */
export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.success === true;
}

/**
 * Check if API response is error
 */
export function isApiError<T>(response: ApiResponse<T>): response is ApiErrorResponse {
  return response.success === false;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get localized field value từ POI
 */
export function getLocalizedField(
  obj: POI,
  fieldName: string,
  language: Language,
  fallback: Language = 'en'
): string {
  const localizedKey = `${fieldName}_${language}` as keyof POI;
  const fallbackKey = `${fieldName}_${fallback}` as keyof POI;

  const value = obj[localizedKey];
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  const fallbackValue = obj[fallbackKey];
  return typeof fallbackValue === 'string' ? fallbackValue : '';
}

/**
 * Convert POI to LocalizedPOI
 */
export function getLocalizedPOI(poi: POI, language: Language): LocalizedPOI {
  return {
    id: poi.id,
    lat: poi.lat,
    lng: poi.lng,
    radius: poi.radius,
    priority: poi.priority,
    name: getLocalizedField(poi, 'name', language),
    description: getLocalizedField(poi, 'description', language),
    audio_url: getLocalizedField(poi, 'audio_url', language),
    image_url: poi.image_url,
    signature_dish: poi.signature_dish,
    fun_fact: poi.fun_fact,
    estimated_hours: poi.estimated_hours,
  };
}

/**
 * Round coordinates để privacy (analytics)
 */
export function roundCoordinates(
  lat: number,
  lng: number,
  precision: number = 3
): { rounded_lat: number; rounded_lng: number } {
  const factor = Math.pow(10, precision);
  return {
    rounded_lat: Math.round(lat * factor) / factor,
    rounded_lng: Math.round(lng * factor) / factor,
  };
}

/**
 * Generate session ID
 */
export function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

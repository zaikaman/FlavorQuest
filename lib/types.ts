/**
 * FlavorQuest Type Definitions
 *
 * Central type definitions for the entire application.
 * Based on data-model.md and database schema.
 */

import {
  DEFAULT_LANGUAGE,
  FALLBACK_LANGUAGE,
  isSupportedLanguageCode,
  type SupportedLanguageCode,
} from '@/lib/constants';
import type { POICategoryTag } from '@/lib/constants/poiCategories';

// ============================================
// LANGUAGE TYPES
// ============================================

/**
 * Supported language codes
 */
export type Language = SupportedLanguageCode;
export type SecondaryLanguage = Exclude<Language, 'vi'>;
export type ExtendedLanguage = Exclude<Language, 'vi' | 'en'>;

/**
 * Language configuration object
 */
export type LanguageConfig = {
  code: Language;
  name: string;
  nativeName: string;
  shortLabel: string;
  translationName: string;
  ttsLang: string;
  voice: string;
  featured: boolean;
  dir: 'ltr' | 'rtl';
};

// ============================================
// POI (Point of Interest) TYPES
// ============================================

type POINameFields = {
  name_vi: string;
  name_en: string;
} & Partial<Record<`name_${ExtendedLanguage}`, string | null>>;

type POIDescriptionFields = Partial<Record<`description_${Language}`, string | null>>;
type POIAudioFields = Partial<Record<`audio_url_${Language}`, string | null>>;
type TourNameFields = {
  name_vi: string;
} & Partial<Record<`name_${SecondaryLanguage}`, string | null>>;
type TourDescriptionFields = Partial<Record<`description_${Language}`, string | null>>;

/**
 * POI database entity
 * Represents a food stall or point of interest on Vĩnh Khánh street
 */
export interface POI extends POINameFields, POIDescriptionFields, POIAudioFields {
  id: string;
  lat: number;
  lng: number;
  radius: number;

  // Media & metadata
  image_url?: string;
  signature_dish?: string;
  category_tags?: POICategoryTag[];
  fun_fact?: string;
  estimated_hours?: string;
  owner_id?: string | null;

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
  name: string;
  description: string;
  audio_url: string;
  image_url?: string;
  signature_dish?: string;
  category_tags?: POICategoryTag[];
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
export interface POIPayload extends POINameFields, POIDescriptionFields, POIAudioFields {
  lat: number;
  lng: number;
  radius?: number;

  image_url?: string;
  signature_dish?: string;
  category_tags?: POICategoryTag[];
  fun_fact?: string;
  estimated_hours?: string;
  owner_id?: string | null;
}

export interface Tour extends TourNameFields, TourDescriptionFields {
  id: string;
  cover_image_url?: string | null;
  estimated_duration_min?: number | null;
  poi_ids: string[];
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface LocalizedTour {
  id: string;
  name: string;
  description: string;
  cover_image_url?: string | null;
  estimated_duration_min?: number | null;
  poi_ids: string[];
  is_active: boolean;
}

export interface TourPayload extends TourNameFields, TourDescriptionFields {
  cover_image_url?: string | null;
  estimated_duration_min?: number | null;
  poi_ids: string[];
  is_active?: boolean;
}

export interface Dish {
  id: string;
  poi_id: string;
  name: string;
  description?: string | null;
  price: number;
  is_available: boolean;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  dish_id: string;
  quantity: number;
  unit_price: number;
  dishes?: {
    name: string;
  };
}

export interface PreorderOrder {
  id: string;
  poi_id: string;
  customer_id: string;
  order_type: 'pickup' | 'delivery';
  customer_name?: string | null;
  customer_phone?: string | null;
  note?: string | null;
  delivery_address?: string | null;
  delivery_time?: string | null;
  pickup_time?: string | null;
  status:
    | 'pending'
    | 'confirmed'
    | 'preparing'
    | 'ready'
    | 'delivering'
    | 'delivered'
    | 'cancelled';
  total_amount: number;
  created_at: string;
  updated_at: string;
  pois?: {
    id: string;
    name_vi: string;
    owner_id?: string | null;
  };
  preorder_order_items?: OrderItem[];
}

export interface AppNotification {
  id: string;
  user_id: string;
  order_id?: string | null;
  title: string;
  message: string;
  type: 'order_created' | 'order_update' | 'system';
  read_at?: string | null;
  created_at: string;
}

export type SupportThreadType = 'customer_owner' | 'customer_admin' | 'owner_admin';

export type OwnerRequestStatus = 'pending' | 'approved' | 'rejected';

export interface SupportParticipantSummary {
  id: string;
  email: string;
  role: UserRole;
}

export interface SupportThreadSummary {
  id: string;
  thread_type: SupportThreadType;
  subject: string | null;
  last_message_preview: string | null;
  last_message_at: string;
  created_at: string;
  unread_count: number;
  counterpart: SupportParticipantSummary | null;
  poi: {
    id: string;
    name_vi: string;
  } | null;
}

export interface SupportDirectoryEntry {
  id: string;
  title: string;
  subtitle: string;
  thread_type: SupportThreadType;
  poi: {
    id: string;
    name_vi: string;
  } | null;
  counterpart: SupportParticipantSummary | null;
  existing_thread_id?: string | null;
}

export interface SupportLaunchpadMeta {
  availableOwnerPoiCount: number;
  availableAdminCount: number;
}

export interface SupportMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_role: UserRole;
  content: string;
  created_at: string;
}

export interface OwnerRequestAdminListItem {
  id: string;
  email: string;
  role: UserRole;
  ownerRequestStatus: OwnerRequestStatus;
  ownerRequestedAt: string | null;
  ownerReviewedAt: string | null;
  threadId: string | null;
}

export interface ReviewOwnerRequestPayload {
  userId: string;
  decision: 'approve' | 'reject';
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
  metadata?: import('@/lib/types/database.types').Json;
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
  metadata?: import('@/lib/types/database.types').Json;
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
export type UserRole = 'customer' | 'pending-owner' | 'owner' | 'admin';

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
  performancePreference: DevicePerformancePreference;
}

export type DevicePerformancePreference = 'system' | 'light' | 'balanced' | 'full';

export type DevicePerformanceTier = 'light' | 'balanced' | 'full';

export interface DeviceCapabilityAssessment {
  tier: DevicePerformanceTier;
  score: number;
  hardwareConcurrency: number | null;
  deviceMemory: number | null;
  effectiveConnectionType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  saveDataEnabled: boolean;
  prefersReducedMotion: boolean;
  isTouchDevice: boolean;
  viewportWidth: number;
  pixelRatio: number;
  benchmarkDurationMs: number | null;
  benchmarkAdjusted: boolean;
}

export interface DeviceResourceProfile {
  tier: DevicePerformanceTier;
  mapDefaultZoom: number;
  mapFlyAnimation: boolean;
  showAccuracyRing: boolean;
  showUserPulse: boolean;
  autoPreloadAudio: boolean;
  nearbyPreloadRadius: number;
}

export interface EffectiveDevicePerformance {
  source: DevicePerformancePreference;
  detectedTier: DevicePerformanceTier;
  effectiveTier: DevicePerformanceTier;
  batterySaverAdjusted: boolean;
  safetyAdjusted: boolean;
  safetyCapTier: DevicePerformanceTier;
  profile: DeviceResourceProfile;
}

/**
 * Default user settings
 */
export const DEFAULT_USER_SETTINGS: UserSettings = {
  language: DEFAULT_LANGUAGE,
  volume: 0.8,
  autoPlayEnabled: true,
  geofenceRadius: 18,
  batterySaverMode: false,
  showNotifications: true,
  preferredMapZoom: 17,
  performancePreference: 'system',
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
  return isSupportedLanguageCode(value);
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
  fallback: Language = FALLBACK_LANGUAGE
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

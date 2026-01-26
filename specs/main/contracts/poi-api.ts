// @ts-nocheck
/**
 * POI API Type Definitions
 * 
 * Định nghĩa types cho API endpoints liên quan đến POI (Points of Interest)
 */

import type { Database } from './database.types';

// Extract POI type từ Supabase generated types
export type POI = Database['public']['Tables']['pois']['Row'];
export type POIInsert = Database['public']['Tables']['pois']['Insert'];
export type POIUpdate = Database['public']['Tables']['pois']['Update'];

// Language support
export type Language = 'vi' | 'en' | 'ja' | 'fr' | 'ko' | 'zh';

/**
 * Localized POI - POI data với fields đã được localize theo ngôn ngữ hiện tại
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
  created_at: string;
  updated_at: string;
}

/**
 * POI with distance - POI kèm khoảng cách từ user
 */
export interface POIWithDistance extends LocalizedPOI {
  distance: number; // meters
}

/**
 * GET /api/pois
 * Lấy danh sách tất cả POIs (public, không cần auth)
 */
export interface GetPOIsRequest {
  // Query parameters
  language?: Language;
  bounds?: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}

export interface GetPOIsResponse {
  success: boolean;
  data?: LocalizedPOI[];
  error?: string;
}

/**
 * GET /api/pois/:id
 * Lấy chi tiết một POI (public, không cần auth)
 */
export interface GetPOIRequest {
  id: string;
  language?: Language;
}

export interface GetPOIResponse {
  success: boolean;
  data?: LocalizedPOI;
  error?: string;
}

/**
 * POST /api/pois (Admin only)
 * Tạo POI mới
 */
export interface CreatePOIRequest {
  // Required fields
  lat: number;
  lng: number;
  name_vi: string;
  name_en: string;
  
  // Optional fields
  radius?: number; // default: 20
  priority?: number; // default: 5
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
  image_url?: string;
  signature_dish?: string;
  fun_fact?: string;
  estimated_hours?: string;
}

export interface CreatePOIResponse {
  success: boolean;
  data?: POI;
  error?: string;
}

/**
 * PUT /api/pois/:id (Admin only)
 * Cập nhật POI
 */
export interface UpdatePOIRequest {
  id: string;
  // Tất cả fields đều optional (partial update)
  lat?: number;
  lng?: number;
  radius?: number;
  priority?: number;
  name_vi?: string;
  name_en?: string;
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
  image_url?: string;
  signature_dish?: string;
  fun_fact?: string;
  estimated_hours?: string;
}

export interface UpdatePOIResponse {
  success: boolean;
  data?: POI;
  error?: string;
}

/**
 * DELETE /api/pois/:id (Admin only)
 * Soft delete POI
 */
export interface DeletePOIRequest {
  id: string;
}

export interface DeletePOIResponse {
  success: boolean;
  error?: string;
}

/**
 * POST /api/pois/:id/audio (Admin only)
 * Upload audio file cho một POI
 */
export interface UploadAudioRequest {
  poi_id: string;
  language: Language;
  audio_file: File; // FormData
}

export interface UploadAudioResponse {
  success: boolean;
  data?: {
    audio_url: string; // Public URL của file đã upload
  };
  error?: string;
}

/**
 * POST /api/pois/:id/image (Admin only)
 * Upload image cho một POI
 */
export interface UploadImageRequest {
  poi_id: string;
  image_file: File; // FormData
}

export interface UploadImageResponse {
  success: boolean;
  data?: {
    image_url: string; // Public URL của image đã upload
  };
  error?: string;
}

/**
 * GET /api/pois/nearby
 * Lấy POIs gần user location
 */
export interface GetNearbyPOIsRequest {
  lat: number;
  lng: number;
  radius?: number; // meters, default: 500
  language?: Language;
}

export interface GetNearbyPOIsResponse {
  success: boolean;
  data?: POIWithDistance[];
  error?: string;
}

/**
 * Helper function types
 */

/**
 * Localize POI fields theo ngôn ngữ
 */
export function localizePOI(poi: POI, language: Language): LocalizedPOI;

/**
 * Tính khoảng cách từ user đến POI (Haversine)
 */
export function calculateDistance(
  userLat: number,
  userLng: number,
  poiLat: number,
  poiLng: number
): number;

/**
 * Check xem user có ở trong geofence của POI không
 */
export function isInGeofence(
  userLat: number,
  userLng: number,
  poi: POI
): boolean;

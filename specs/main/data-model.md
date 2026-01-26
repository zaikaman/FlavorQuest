# Phase 1: Data Model & Database Schema

**Date**: 26/01/2026  
**Feature**: FlavorQuest - Trải Nghiệm Thuyết Minh Âm Thanh Tự Động  
**Plan**: [plan.md](plan.md) | **Research**: [research.md](research.md)

## Entity Relationship Diagram

```
┌─────────────────┐
│      POI        │
│─────────────────│
│ id (PK)         │
│ lat, lng        │
│ radius          │         ┌──────────────────┐
│ priority        │         │  analytics_logs  │
│ name_*          │         │──────────────────│
│ description_*   │◄────────│ poi_id (FK)      │
│ audio_url_*     │         │ session_id       │
│ image_url       │         │ rounded_lat/lng  │
│ ...             │         │ language         │
└─────────────────┘         │ event_type       │
                            │ listen_duration  │
                            │ timestamp        │
        ▲                   └──────────────────┘
        │
        │
┌───────┴─────────┐
│     users       │
│─────────────────│
│ id (PK)         │
│ email           │
│ role            │
│ created_at      │
└─────────────────┘

Legend:
* = multi-language fields (suffixed with _vi, _en, _ja, _fr, _ko, _zh)
```

## Core Entities

### 1. POI (Point of Interest)

Đại diện cho một quán ăn, quầy hàng, hoặc địa điểm nổi bật trên phố Vĩnh Khánh.

**Fields**:

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | UUID | No | Primary key, auto-generated |
| `lat` | DOUBLE PRECISION | No | Latitude (WGS84 format) |
| `lng` | DOUBLE PRECISION | No | Longitude (WGS84 format) |
| `radius` | INTEGER | No (default: 20) | Geofence radius in meters (range: 1-100) |
| `priority` | INTEGER | No (default: 5) | Priority ranking 1-10 (higher = more important) |
| `name_vi` | TEXT | No | Tên tiếng Việt |
| `name_en` | TEXT | No | English name |
| `name_ja` | TEXT | Yes | Japanese name (日本語) |
| `name_fr` | TEXT | Yes | French name (Français) |
| `name_ko` | TEXT | Yes | Korean name (한국어) |
| `name_zh` | TEXT | Yes | Chinese name (中文) |
| `description_vi` | TEXT | Yes | Mô tả tiếng Việt (transcript cho TTS fallback) |
| `description_en` | TEXT | Yes | English description |
| `description_ja` | TEXT | Yes | Japanese description |
| `description_fr` | TEXT | Yes | French description |
| `description_ko` | TEXT | Yes | Korean description |
| `description_zh` | TEXT | Yes | Chinese description |
| `audio_url_vi` | TEXT | Yes | URL to Vietnamese audio file (MP3, 64kbps) |
| `audio_url_en` | TEXT | Yes | URL to English audio file |
| `audio_url_ja` | TEXT | Yes | URL to Japanese audio file |
| `audio_url_fr` | TEXT | Yes | URL to French audio file |
| `audio_url_ko` | TEXT | Yes | URL to Korean audio file |
| `audio_url_zh` | TEXT | Yes | URL to Chinese audio file |
| `image_url` | TEXT | Yes | URL to POI main image (WebP, optimized) |
| `signature_dish` | TEXT | Yes | Món ăn signature (e.g., "Bánh xèo tôm nhảy") |
| `fun_fact` | TEXT | Yes | Câu chuyện thú vị ngắn gọn |
| `estimated_hours` | TEXT | Yes | Giờ hoạt động ước tính (e.g., "8:00-22:00") |
| `created_at` | TIMESTAMP | No (default: NOW()) | Timestamp tạo record |
| `updated_at` | TIMESTAMP | No (default: NOW()) | Timestamp cập nhật gần nhất |
| `deleted_at` | TIMESTAMP | Yes | Soft delete timestamp |

**Validation Rules**:
- `lat` must be in range [10.750, 10.757] (Vĩnh Khánh area bounds)
- `lng` must be in range [106.690, 106.703]
- `radius` must be between 1 and 100 meters
- `priority` must be between 1 and 10
- `name_vi` and `name_en` are required (fallback languages)
- Audio URLs must be valid HTTPS URLs pointing to `.mp3` files
- Image URL must be valid HTTPS URL

**Indexes**:
```sql
CREATE INDEX idx_pois_location ON pois(lat, lng) WHERE deleted_at IS NULL;
CREATE INDEX idx_pois_priority ON pois(priority DESC) WHERE deleted_at IS NULL;
```

**Business Rules**:
- POIs are publicly readable (no authentication required for tour users)
- Only admins can create/update/delete POIs
- When user enters geofence (`distance <= radius`), trigger audio playback
- Priority determines which POI to narrate first if multiple POIs in range
- Cooldown period: 30 minutes after first narration to prevent replay

---

### 2. Analytics Log

Ghi lại các sự kiện người dùng để phân tích usage patterns, popular POIs, và listen completion rates.

**Fields**:

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | UUID | No | Primary key, auto-generated |
| `poi_id` | UUID | Yes (FK) | Reference to POI (nullable cho events không liên quan POI) |
| `session_id` | UUID | No | Client-generated session UUID |
| `rounded_lat` | DOUBLE PRECISION | Yes | User latitude rounded to 2 decimals (~1km accuracy) for privacy |
| `rounded_lng` | DOUBLE PRECISION | Yes | User longitude rounded to 2 decimals |
| `language` | VARCHAR(5) | Yes | Ngôn ngữ hiện tại ('vi', 'en', 'ja', 'fr', 'ko', 'zh') |
| `event_type` | VARCHAR(20) | No | Event type (see enum below) |
| `listen_duration` | INTEGER | Yes | Số giây người dùng đã nghe (null nếu không phải audio event) |
| `completed` | BOOLEAN | Yes | Did user listen to the end? (null nếu không phải audio event) |
| `timestamp` | TIMESTAMP | No (default: NOW()) | Event timestamp |
| `user_agent` | TEXT | Yes | Browser user agent string |

**Event Types** (enum):
- `tour_start`: User clicked "Start Tour" button
- `tour_end`: User explicitly stopped tour or left page
- `auto_play`: Audio tự động phát khi vào geofence
- `manual_play`: User manually clicked play button on POI detail
- `skip`: User skipped audio trước khi nghe hết
- `settings_change`: User changed settings (language, radius, etc.)

**Validation Rules**:
- `session_id` is client-generated UUID persisted in session storage
- `rounded_lat` and `rounded_lng` must be rounded to 2 decimal places
- `event_type` must be one of the defined enum values
- `listen_duration` must be >= 0 if not null
- No personally identifiable information (PII) should be logged

**Indexes**:
```sql
CREATE INDEX idx_analytics_poi_id ON analytics_logs(poi_id);
CREATE INDEX idx_analytics_timestamp ON analytics_logs(timestamp DESC);
CREATE INDEX idx_analytics_session ON analytics_logs(session_id);
CREATE INDEX idx_analytics_event_type ON analytics_logs(event_type);
```

**Business Rules**:
- Anyone can insert logs (no authentication required) → privacy-first
- Only admins can read logs → protects user data
- Coordinates are rounded to preserve privacy (GDPR-compliant)
- No user ID stored unless user is authenticated admin
- Logs used for aggregate analytics only (e.g., "POI X has 80% completion rate")

---

### 3. User

Chỉ dành cho admin authentication và role management. Regular tour users không cần account.

**Fields**:

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | UUID | No | Primary key, matches Supabase auth.users.id |
| `email` | TEXT | No | User email (unique) |
| `role` | VARCHAR(10) | No (default: 'user') | User role: 'user' or 'admin' |
| `created_at` | TIMESTAMP | No (default: NOW()) | Account creation timestamp |

**Validation Rules**:
- `email` must be valid email format and unique
- `role` must be either 'user' or 'admin'
- `id` should match Supabase `auth.users.id` for authenticated users

**Business Rules**:
- New users default to 'user' role
- Only existing admins can promote users to 'admin'
- 'admin' role grants access to:
  - Admin dashboard (`/admin`)
  - POI CRUD operations
  - Analytics dashboard
  - User management
- Regular 'user' role has no special privileges (can use tour like anonymous users)

---

## Client-Side Data Models (TypeScript)

### POI Interface

```typescript
// lib/types.ts
export interface POI {
  id: string;
  lat: number;
  lng: number;
  radius: number;
  priority: number;
  
  // Multi-language fields
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
  
  created_at: string;
  updated_at: string;
}

// Helper type for localized access
export type LocalizedPOI = {
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
};

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
```

### Visit History (Client-Side Only)

Lưu trong IndexedDB để track cooldown và history.

```typescript
// lib/types.ts
export interface VisitRecord {
  poi_id: string;
  timestamp: number; // Unix timestamp (ms)
  listened: boolean; // Did user listen to narration?
  language: Language;
  duration: number; // Seconds listened
}

// Stored in IndexedDB under key 'visit-history'
export type VisitHistory = VisitRecord[];
```

### User Settings (Client-Side Only)

Lưu trong IndexedDB hoặc localStorage.

```typescript
// lib/types.ts
export interface UserSettings {
  language: Language;
  auto_mode_enabled: boolean;
  geofence_radius: number; // Override default POI radius (15-30m range)
  volume: number; // 0.0 - 1.0
  battery_saver: boolean; // Reduce GPS accuracy khi bật
}

// Default settings
export const DEFAULT_SETTINGS: UserSettings = {
  language: 'vi',
  auto_mode_enabled: true,
  geofence_radius: 20,
  volume: 0.8,
  battery_saver: false,
};
```

### Analytics Event

```typescript
// lib/types.ts
export type EventType =
  | 'tour_start'
  | 'tour_end'
  | 'auto_play'
  | 'manual_play'
  | 'skip'
  | 'settings_change';

export interface AnalyticsEvent {
  poi_id?: string;
  session_id: string;
  rounded_lat?: number;
  rounded_lng?: number;
  language?: Language;
  event_type: EventType;
  listen_duration?: number;
  completed?: boolean;
  timestamp: Date;
  user_agent: string;
}

// Helper function to round coordinates for privacy
export function roundCoordinates(lat: number, lng: number): [number, number] {
  return [
    Math.round(lat * 100) / 100, // 2 decimal places
    Math.round(lng * 100) / 100,
  ];
}
```

## IndexedDB Schema

Sử dụng `idb-keyval` cho simple key-value storage:

```typescript
// lib/services/storage.ts
import { get, set, del, clear } from 'idb-keyval';

// Keys
export const STORAGE_KEYS = {
  POIS: 'pois',                   // POI[]
  VISIT_HISTORY: 'visit-history', // VisitRecord[]
  USER_SETTINGS: 'user-settings', // UserSettings
  SESSION_ID: 'session-id',       // string (UUID)
  CACHED_AUDIO: 'cached-audio',   // Map<string, Blob> (audio file cache)
  MAP_TILES: 'map-tiles',         // Map<string, Blob> (OSM tile cache) - handled by Service Worker
} as const;

// Storage functions
export async function savePOIs(pois: POI[]): Promise<void> {
  await set(STORAGE_KEYS.POIS, pois);
}

export async function loadPOIs(): Promise<POI[]> {
  return (await get(STORAGE_KEYS.POIS)) || [];
}

export async function saveVisitHistory(history: VisitRecord[]): Promise<void> {
  await set(STORAGE_KEYS.VISIT_HISTORY, history);
}

export async function loadVisitHistory(): Promise<VisitRecord[]> {
  return (await get(STORAGE_KEYS.VISIT_HISTORY)) || [];
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  await set(STORAGE_KEYS.USER_SETTINGS, settings);
}

export async function loadSettings(): Promise<UserSettings> {
  return (await get(STORAGE_KEYS.USER_SETTINGS)) || DEFAULT_SETTINGS;
}

export async function getOrCreateSessionId(): Promise<string> {
  let sessionId = await get(STORAGE_KEYS.SESSION_ID);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    await set(STORAGE_KEYS.SESSION_ID, sessionId);
  }
  return sessionId;
}
```

## State Management

Không cần Redux/Zustand - dùng React Context + custom hooks:

```typescript
// lib/contexts/AppContext.tsx
interface AppState {
  pois: POI[];
  settings: UserSettings;
  visitHistory: VisitRecord[];
  currentPosition: GeolocationPosition | null;
  isOnline: boolean;
  isTourActive: boolean;
}

export const AppContext = createContext<{
  state: AppState;
  actions: {
    updateSettings: (settings: Partial<UserSettings>) => void;
    startTour: () => void;
    stopTour: () => void;
    recordVisit: (record: VisitRecord) => void;
    syncData: () => Promise<void>;
  };
}>(null!);
```

## Database Migrations

```sql
-- supabase/migrations/001_create_pois.sql
-- (Already shown in Research phase)

-- supabase/migrations/002_create_analytics.sql
-- (Already shown in Research phase)

-- supabase/migrations/003_create_users.sql
-- (Already shown in Research phase)

-- supabase/seed.sql
-- Sample POI data cho phố Vĩnh Khánh
INSERT INTO pois (
  lat, lng, radius, priority,
  name_vi, name_en,
  description_vi, description_en,
  signature_dish, estimated_hours
) VALUES
  (
    10.7535, 106.6963, 20, 10,
    'Bánh Xèo Bà Dưỡng',
    'Ba Duong Banh Xeo',
    'Quán bánh xèo nổi tiếng với món bánh xèo tôm nhảy giòn rụm.',
    'Famous for crispy jumping shrimp banh xeo.',
    'Bánh xèo tôm nhảy',
    '8:00-22:00'
  ),
  (
    10.7540, 106.6965, 20, 9,
    'Chợ Hải Sản Vĩnh Khánh',
    'Vinh Khanh Seafood Market',
    'Chợ hải sản tươi sống với đủ loại tôm, cua, cá, mực.',
    'Fresh seafood market with shrimp, crab, fish, and squid.',
    'Tôm sú, cua hoàng đế',
    '6:00-20:00'
  );
-- (More sample data...)
```

## Next Steps

✅ Phase 1 (Data Model) complete  
→ Continue Phase 1: Generate API contracts and quickstart guide

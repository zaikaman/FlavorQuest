# Phase 0: Research & Technology Decisions

**Date**: 26/01/2026  
**Feature**: FlavorQuest - Trải Nghiệm Thuyết Minh Âm Thanh Tự Động  
**Plan**: [plan.md](plan.md)

## Research Findings

### 1. PWA Offline-First Strategy với Next.js 16

**Decision**: Sử dụng `next-pwa` với Workbox + custom service worker cho advanced caching

**Rationale**:

- `next-pwa` cung cấp zero-config setup cho PWA với Next.js App Router
- Workbox hỗ trợ caching strategies: CacheFirst cho static assets, NetworkFirst với fallback cho dynamic data
- Custom service worker cần thiết cho advanced caching (audio files, map tiles với size limits)
- IndexedDB qua `idb-keyval` cho structured data persistence (POI, user preferences, visit history)
- Background Sync API cho đồng bộ analytics logs khi user online lại

**Implementation Approach**:

```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.tile\.openstreetmap\.org\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'osm-tiles',
        expiration: {
          maxEntries: 500,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /\.mp3$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'audio-files',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'supabase-storage',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
      },
    },
  ],
});
```

**Service Worker Strategy**:

- **Install event**: Pre-cache app shell (HTML, CSS, JS essentials)
- **Runtime caching**: Cache audio files, map tiles, images on-demand
- **Background sync**: Queue analytics events khi offline, sync khi có mạng
- **Quota management**: Monitor storage usage, evict oldest entries nếu vượt 50MB

**Alternatives Considered**:

- **Vite PWA Plugin**: Không tương thích với Next.js
- **Custom service worker từ đầu**: Quá phức tạp, reinventing the wheel - Workbox đã handle edge cases
- **Native mobile app**: Yêu cầu cài đặt, không instant access qua QR code như yêu cầu

**Challenges & Solutions**:

- **Storage quota exceeded**: Implement LRU eviction policy, giới hạn audio cache chỉ POI trong bán kính 1km
- **Service worker update**: `skipWaiting: true` để update ngay, hiển thị toast "Có phiên bản mới, refresh để cập nhật"
- **iOS Safari limitations**: Service worker limited to 50MB, cần compress audio và tiles aggressively

---

### 2. Geolocation Tracking & Geofencing trên Browser

**Decision**: Browser Geolocation API với `watchPosition` + custom Haversine geofencing trong Web Worker

**Rationale**:

- `watchPosition` cung cấp continuous updates khi user di chuyển (không cần polling manual)
- Haversine formula tính distance chính xác cho bán kính nhỏ (<1km) - đủ cho phố Vĩnh Khánh
- Web Worker offload geofencing calculation để không block UI thread
- Browser không hỗ trợ native Geofence API → phải tự implement logic

**Implementation Approach**:

```typescript
// lib/hooks/useGeolocation.ts
export function useGeolocation() {
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<GeolocationPositionError | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setError({ code: 0, message: 'Geolocation not supported' });
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => setPosition(pos),
      (err) => setError(err),
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return { position, error };
}
```

```typescript
// lib/workers/geofence.worker.ts
import { haversineDistance } from '../utils/distance';

interface GeofenceMessage {
  userLat: number;
  userLng: number;
  pois: POI[];
}

self.onmessage = (e: MessageEvent<GeofenceMessage>) => {
  const { userLat, userLng, pois } = e.data;

  const nearbyPOIs = pois
    .map((poi) => ({
      ...poi,
      distance: haversineDistance(userLat, userLng, poi.lat, poi.lng),
    }))
    .filter((poi) => poi.distance <= poi.radius) // e.g., radius = 20m
    .sort((a, b) => a.distance - b.distance); // Closest first

  self.postMessage({ nearbyPOIs });
};
```

```typescript
// lib/utils/distance.ts
/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @returns Distance in meters
 */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}
```

**Challenges & Solutions**:

1. **GPS drift/noise**:
   - Implement simple moving average (SMA) với window size = 5 samples
   - Chỉ trigger geofence nếu user ở trong radius liên tục trong 3-5 giây (debounce)

```typescript
// lib/utils/noise-filter.ts
export class GPSNoiseFilter {
  private samples: GeolocationCoordinates[] = [];
  private readonly windowSize = 5;

  addSample(coords: GeolocationCoordinates) {
    this.samples.push(coords);
    if (this.samples.length > this.windowSize) {
      this.samples.shift();
    }
  }

  getSmoothedPosition(): GeolocationCoordinates {
    const avgLat = this.samples.reduce((sum, s) => sum + s.latitude, 0) / this.samples.length;
    const avgLng = this.samples.reduce((sum, s) => sum + s.longitude, 0) / this.samples.length;
    return { latitude: avgLat, longitude: avgLng } as GeolocationCoordinates;
  }
}
```

2. **Battery drain**:
   - Throttle geolocation updates khi user đứng yên (detect từ speed < 0.5 m/s)
   - Giảm `enableHighAccuracy: false` khi đứng yên để tiết kiệm pin

```typescript
// lib/hooks/useGeofencing.ts
const speed = position.coords.speed || 0;
const isMoving = speed > 0.5; // 0.5 m/s ~ 1.8 km/h

const geoOptions = {
  enableHighAccuracy: isMoving, // High accuracy chỉ khi đang di chuyển
  timeout: isMoving ? 5000 : 10000,
  maximumAge: isMoving ? 0 : 5000,
};
```

3. **Background tracking limitation**:
   - PWA không có native background geolocation như native app
   - Hiển thị notification "Giữ tab mở để tiếp tục tour" khi user switch tab
   - Thử Periodic Background Sync (Chrome only, experimental) cho future version

```typescript
// lib/hooks/useGeofencing.ts
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      // Tab inactive → throttle updates more aggressively
      console.log('Tab inactive, reducing geolocation frequency');
    } else {
      // Tab active → resume normal updates
      console.log('Tab active, resuming geolocation');
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, []);
```

**Alternatives Considered**:

- **Server-side geofencing**: Requires continuous network connection, không offline → không phù hợp với yêu cầu offline-first
- **Native Geofence API**: Chỉ có trên native apps (iOS CLLocationManager, Android Geofencing API), không có web equivalent
- **WebSockets realtime tracking**: Overkill, tốn bandwidth, không hoạt động offline → rejected

---

### 3. Audio Playback & TTS Multi-Language

**Decision**: HTML5 Audio API cho pre-recorded audio + Web Speech Synthesis API (TTS) làm fallback

**Rationale**:

- Pre-recorded audio (MP3, 64kbps) có chất lượng cao, giọng tự nhiên, phù hợp cho storytelling về quán ăn
- TTS fallback khi audio không tải được (network error, cache miss, quota exceeded)
- Web Speech Synthesis hỗ trợ 6 ngôn ngữ (vi-VN, en-US, ja-JP, fr-FR, ko-KR, zh-CN) - built-in browser, không cần external API
- Progressive download: HTML5 Audio phát ngay khi đủ buffer, không cần tải toàn bộ file

**Implementation Approach**:

```typescript
// lib/services/audio.ts
export class AudioPlayer {
  private queue: AudioQueueItem[] = [];
  private currentAudio: HTMLAudioElement | null = null;
  private isPlaying = false;

  /**
   * Add audio to queue and play if nothing is currently playing
   */
  async enqueue(item: AudioQueueItem) {
    this.queue.push(item);
    if (!this.isPlaying) {
      await this.playNext();
    }
  }

  private async playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      return;
    }

    const item = this.queue.shift()!;
    this.isPlaying = true;

    try {
      await this.playAudio(item.url, item.transcript, item.language);
    } catch (error) {
      console.error('Audio playback failed:', error);
      // Fallback to TTS
      await this.speakWithTTS(item.transcript, item.language);
    } finally {
      // Play next in queue
      await this.playNext();
    }
  }

  private async playAudio(url: string, transcript: string, language: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url);
      audio.preload = 'auto';

      audio.addEventListener('ended', () => {
        this.currentAudio = null;
        resolve();
      });

      audio.addEventListener('error', (e) => {
        this.currentAudio = null;
        reject(e);
      });

      // Browser autoplay policy: Must have user gesture
      audio.play().catch(reject);
      this.currentAudio = audio;
    });
  }

  private async speakWithTTS(text: string, language: string): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        console.warn('TTS not supported');
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language; // e.g., 'vi-VN', 'en-US'
      utterance.rate = 0.9; // Slightly slower for clarity
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.addEventListener('end', () => resolve());
      utterance.addEventListener('error', () => resolve()); // Don't block on TTS error

      speechSynthesis.speak(utterance);
    });
  }

  /**
   * Stop current audio and clear queue
   */
  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    speechSynthesis.cancel();
    this.queue = [];
    this.isPlaying = false;
  }
}
```

```typescript
// lib/hooks/useAudioPlayer.ts
export function useAudioPlayer() {
  const playerRef = useRef<AudioPlayer>(new AudioPlayer());
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPOI, setCurrentPOI] = useState<POI | null>(null);

  const play = useCallback(async (poi: POI, language: Language) => {
    const audioUrl = poi[`audio_url_${language}`] || poi.audio_url_en;
    const transcript = poi[`description_${language}`] || poi.description_en;

    setIsPlaying(true);
    setCurrentPOI(poi);

    await playerRef.current.enqueue({
      url: audioUrl,
      transcript,
      language: getLanguageCode(language), // 'vi-VN', 'en-US', etc.
    });

    setIsPlaying(false);
    setCurrentPOI(null);
  }, []);

  const stop = useCallback(() => {
    playerRef.current.stop();
    setIsPlaying(false);
    setCurrentPOI(null);
  }, []);

  return { play, stop, isPlaying, currentPOI };
}
```

**Cooldown Logic**:

```typescript
// lib/utils/cooldown.ts
export class CooldownManager {
  private lastPlayed = new Map<string, number>(); // POI ID -> timestamp
  private readonly cooldownMs = 30 * 60 * 1000; // 30 minutes

  canPlay(poiId: string): boolean {
    const lastTime = this.lastPlayed.get(poiId);
    if (!lastTime) return true;

    const elapsed = Date.now() - lastTime;
    return elapsed >= this.cooldownMs;
  }

  markPlayed(poiId: string) {
    this.lastPlayed.set(poiId, Date.now());
    // Persist to IndexedDB for cross-session cooldown
    set(`cooldown:${poiId}`, Date.now());
  }

  async loadFromStorage() {
    // Load persisted cooldowns from IndexedDB
    // (Implementation với idb-keyval)
  }
}
```

**Challenges & Solutions**:

1. **Browser autoplay policy**:
   - Chrome/Safari chặn autoplay cho đến khi có user gesture
   - Solution: Yêu cầu user click "Start Tour" button → unlock audio context

```typescript
// components/tour/StartTourButton.tsx
const handleStartTour = async () => {
  // Unlock audio context with user gesture
  const audio = new Audio('/silence.mp3'); // Short silent audio
  await audio.play();
  audio.pause();

  // Now autoplay is unlocked
  setTourStarted(true);
};
```

2. **Audio queue management**:
   - Nếu user đi nhanh qua nhiều POI → nhiều audio cùng lúc
   - Solution: FIFO queue, chờ audio hiện tại phát xong trước khi phát audio mới (implemented above)

3. **TTS voice quality**:
   - TTS không tự nhiên bằng pre-recorded audio, đặc biệt tiếng Việt
   - Solution: Ưu tiên cache aggressive cho audio files, TTS chỉ là last resort fallback

**Alternatives Considered**:

- **Cloud TTS (Google Cloud TTS, AWS Polly)**: Requires network, không offline, cost per request (~$4-16 per 1M characters) → rejected
- **Web Audio API với audio sprites**: Phức tạp, không linh hoạt cho dynamic content (60-90 giây per POI) → không phù hợp
- **Video với audio track**: Overkill, file size lớn hơn audio-only, không cần visuals → rejected

---

### 4. Offline Map Rendering với Leaflet

**Decision**: Leaflet.js + OpenStreetMap tiles với offline caching qua Service Worker

**Rationale**:

- Leaflet lightweight (~40KB gzipped), open-source, không cần API key
- OpenStreetMap tiles hoàn toàn miễn phí, có thể cache offline
- Tile caching strategy: Pre-cache khu vực Vĩnh Khánh (2km²) zoom 15-18
- Hỗ trợ custom markers (POI icons), popups (POI info), user location overlay

**Implementation Approach**:

```typescript
// components/tour/MapView.tsx
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const VINH_KHANH_CENTER: [number, number] = [10.7535, 106.6963];
const VINH_KHANH_BOUNDS: [[number, number], [number, number]] = [
  [10.750, 106.690], // Southwest
  [10.757, 106.703]  // Northeast
];

export function MapView({ pois, userPosition }: MapViewProps) {
  return (
    <MapContainer
      center={VINH_KHANH_CENTER}
      zoom={17}
      style={{ height: '100%', width: '100%' }}
      maxBounds={VINH_KHANH_BOUNDS}
      maxBoundsViscosity={1.0}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
        minZoom={15}
      />

      {/* POI markers */}
      {pois.map(poi => (
        <Marker
          key={poi.id}
          position={[poi.lat, poi.lng]}
          icon={customPOIIcon}
        >
          <Popup>
            <POIPopup poi={poi} />
          </Popup>
        </Marker>
      ))}

      {/* User location */}
      {userPosition && (
        <Marker
          position={[userPosition.lat, userPosition.lng]}
          icon={userLocationIcon}
        />
      )}
    </MapContainer>
  );
}
```

**Tile Caching Strategy**:

Service Worker đã configured ở trên (Research #1) sẽ tự động cache OSM tiles với CacheFirst strategy:

```javascript
// Service Worker runtime caching (trong next.config.js với next-pwa)
{
  urlPattern: /^https:\/\/.*\.tile\.openstreetmap\.org\/.*/i,
  handler: 'CacheFirst',
  options: {
    cacheName: 'osm-tiles',
    expiration: {
      maxEntries: 500, // ~10-15MB tiles cho zoom 15-18, area 2km²
      maxAgeSeconds: 7 * 24 * 60 * 60 // 7 days
    },
    cacheableResponse: {
      statuses: [0, 200]
    }
  }
}
```

**Preload Tiles on First Load**:

```typescript
// lib/services/map-preloader.ts
export async function preloadMapTiles() {
  const zoom = [15, 16, 17, 18];
  const bounds = {
    minLat: 10.75,
    maxLat: 10.757,
    minLng: 106.69,
    maxLng: 106.703,
  };

  const tileUrls: string[] = [];

  zoom.forEach((z) => {
    const minTileX = Math.floor(((bounds.minLng + 180) / 360) * Math.pow(2, z));
    const maxTileX = Math.floor(((bounds.maxLng + 180) / 360) * Math.pow(2, z));
    const minTileY = Math.floor(
      ((1 -
        Math.log(
          Math.tan((bounds.maxLat * Math.PI) / 180) + 1 / Math.cos((bounds.maxLat * Math.PI) / 180)
        ) /
          Math.PI) /
        2) *
        Math.pow(2, z)
    );
    const maxTileY = Math.floor(
      ((1 -
        Math.log(
          Math.tan((bounds.minLat * Math.PI) / 180) + 1 / Math.cos((bounds.minLat * Math.PI) / 180)
        ) /
          Math.PI) /
        2) *
        Math.pow(2, z)
    );

    for (let x = minTileX; x <= maxTileX; x++) {
      for (let y = minTileY; y <= maxTileY; y++) {
        tileUrls.push(`https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`);
      }
    }
  });

  // Fetch all tiles để trigger Service Worker caching
  await Promise.all(
    tileUrls.map((url) => fetch(url).catch((e) => console.warn('Tile preload failed:', url, e)))
  );

  console.log(`Preloaded ${tileUrls.length} map tiles for offline use`);
}
```

**Challenges & Solutions**:

1. **Tile storage size**:
   - Zoom 15-18 cho 2km² ≈ 400-500 tiles ≈ 10-15MB
   - Solution: Limit maxEntries = 500, evict oldest tiles nếu vượt quota

2. **Tile expiration**:
   - OSM tiles thay đổi ít, nhưng cần update định kỳ
   - Solution: maxAgeSeconds = 7 days, re-download khi có mạng

3. **Performance**:
   - Render nhiều markers (50-100 POI) có thể chậm
   - Solution: Marker clustering với `react-leaflet-cluster` khi zoom out, hiển thị individual markers khi zoom in

**Alternatives Considered**:

- **Google Maps**: Requires API key, cost per request ($200/month cho 28K map loads), offline không miễn phí → too expensive
- **Mapbox**: Similar to Google Maps, có freemium plan (50K map views/month) nhưng phức tạp setup, offline requires SDK → overkill
- **Static image map**: Không interactive, không zoom/pan, không realtime user location → không đáp ứng yêu cầu

---

### 5. Supabase Backend Setup

**Decision**: Supabase cho PostgreSQL, Auth, Storage, Realtime

**Rationale**:

- **PostgreSQL**: Relational database cho POI data, support JSON columns cho multi-language content
- **Auth**: Google OAuth only (đơn giản hóa, không cần email/password verification flow)
- **Storage**: Upload audio files (MP3, 64kbps), images (WebP) với public URLs, tự động CDN
- **Realtime**: Không cần thiết cho MVP, nhưng có sẵn cho future features (live POI updates, collaborative features)
- **Generous free tier**: 500MB database, 1GB storage, 50GB bandwidth/month → đủ cho 50-100 POI, 200 users

**Database Schema**:

```sql
-- supabase/migrations/001_create_pois.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- POI table với multi-language support
CREATE TABLE pois (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Geolocation
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  radius INTEGER DEFAULT 20 CHECK (radius > 0 AND radius <= 100), -- meters
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10), -- 1=low, 10=high

  -- Multi-language names
  name_vi TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_ja TEXT,
  name_fr TEXT,
  name_ko TEXT,
  name_zh TEXT,

  -- Multi-language descriptions
  description_vi TEXT,
  description_en TEXT,
  description_ja TEXT,
  description_fr TEXT,
  description_ko TEXT,
  description_zh TEXT,

  -- Audio URLs (stored in Supabase Storage)
  audio_url_vi TEXT,
  audio_url_en TEXT,
  audio_url_ja TEXT,
  audio_url_fr TEXT,
  audio_url_ko TEXT,
  audio_url_zh TEXT,

  -- Images
  image_url TEXT, -- Main POI image

  -- Metadata
  estimated_hours TEXT, -- e.g., "8:00-22:00"
  signature_dish TEXT, -- e.g., "Bánh xèo tôm nhảy"
  fun_fact TEXT, -- Short interesting fact

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Soft delete
  deleted_at TIMESTAMP
);

-- Index for geospatial queries
CREATE INDEX idx_pois_location ON pois(lat, lng) WHERE deleted_at IS NULL;

-- RLS policies: Public read, admin write
ALTER TABLE pois ENABLE ROW LEVEL SECURITY;

CREATE POLICY "POIs are viewable by everyone"
  ON pois FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "POIs are insertable by admins only"
  ON pois FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "POIs are updatable by admins only"
  ON pois FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin');
```

```sql
-- supabase/migrations/002_create_analytics.sql
CREATE TABLE analytics_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- POI reference
  poi_id UUID REFERENCES pois(id) ON DELETE CASCADE,

  -- Privacy-friendly location (rounded to 2 decimals ≈ 1km accuracy)
  rounded_lat DOUBLE PRECISION,
  rounded_lng DOUBLE PRECISION,

  -- User context
  language VARCHAR(5), -- 'vi', 'en', 'ja', 'fr', 'ko', 'zh'
  event_type VARCHAR(20), -- 'auto_play', 'manual_play', 'skip', 'tour_start', 'tour_end'

  -- Audio playback stats
  listen_duration INTEGER, -- seconds (how long user listened)
  completed BOOLEAN, -- Did user listen to the end?

  -- Session tracking (client-generated UUID)
  session_id UUID NOT NULL,

  -- Timestamp
  timestamp TIMESTAMP DEFAULT NOW(),

  -- User agent (for device/browser analytics)
  user_agent TEXT
);

-- Indexes for analytics queries
CREATE INDEX idx_analytics_poi_id ON analytics_logs(poi_id);
CREATE INDEX idx_analytics_timestamp ON analytics_logs(timestamp DESC);
CREATE INDEX idx_analytics_session ON analytics_logs(session_id);

-- RLS: Write-only for everyone, read for admins
ALTER TABLE analytics_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Analytics logs are insertable by everyone"
  ON analytics_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Analytics logs are viewable by admins only"
  ON analytics_logs FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');
```

```sql
-- supabase/migrations/003_create_users.sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  role VARCHAR(10) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- RLS: Users can view their own data, admins can view all
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.uid() = id OR auth.jwt() ->> 'role' = 'admin');
```

**Auth Flow với Google OAuth**:

```typescript
// lib/services/supabase.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export const supabase = createClientComponentClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
});

// Sign in with Google
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/api/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) throw error;
  return data;
}
```

```typescript
// app/api/auth/callback/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    await supabase.auth.exchangeCodeForSession(code);

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('email', user.email)
        .single();

      if (userData?.role === 'admin') {
        return NextResponse.redirect(new URL('/admin', requestUrl.origin));
      }
    }
  }

  return NextResponse.redirect(new URL('/', requestUrl.origin));
}
```

**Storage Setup**:

```typescript
// lib/services/storage.ts
export async function uploadAudio(file: File, poiId: string, language: string) {
  const fileName = `${poiId}_${language}.mp3`;
  const { data, error } = await supabase.storage.from('audio').upload(fileName, file, {
    cacheControl: '31536000', // 1 year
    upsert: true,
  });

  if (error) throw error;

  // Get public URL
  const { data: urlData } = supabase.storage.from('audio').getPublicUrl(fileName);

  return urlData.publicUrl;
}
```

**Challenges & Solutions**:

1. **Google OAuth redirect URI**:
   - Must whitelist trong Google Cloud Console và Supabase dashboard
   - Development: `http://localhost:3000/api/auth/callback`
   - Production: `https://flavorquest.vercel.app/api/auth/callback`

2. **Admin role management**:
   - Manually seed admin emails vào `users` table sau lần đầu login
   - Future: Admin panel để promote users

3. **Storage quota**:
   - Free tier: 1GB storage
   - Solution: Compress audio (64kbps MP3 ≈ 500KB per 60s) và images (WebP, quality 80%)
   - 100 POI × 6 languages × 500KB ≈ 300MB audio
   - 100 POI × 100KB image ≈ 10MB images
   - Total: ~310MB → well within quota

**Alternatives Considered**:

- **Firebase**: Tương tự Supabase nhưng vendor lock-in với Google, pricing không transparent, Firestore not relational → rejected
- **Prisma + Railway/Render**: Self-managed PostgreSQL, phức tạp setup, không có built-in Auth/Storage, deployment complexity → too much overhead
- **Self-hosted backend (Express + PostgreSQL)**: Maintenance overhead, no ready-made Auth, no CDN for Storage → rejected

---

### 6. Multi-Language Support (i18n)

**Decision**: Manual i18n với React Context + database-driven content

**Rationale**:

- **UI strings** (buttons, labels, errors): React Context với JSON files (`locales/vi.json`, `locales/en.json`, etc.)
- **POI content** (name, description, audio): Database columns (`name_vi`, `name_en`, etc.) để flexible, có thể update không cần redeploy
- Detect browser language (`navigator.language`) hoặc user selection từ settings
- No need for heavy i18n libraries (`next-intl`, `react-i18next`) - overkill cho 6 ngôn ngữ với static UI strings

**Implementation Approach**:

```typescript
// lib/hooks/useLanguage.ts
export type Language = 'vi' | 'en' | 'ja' | 'fr' | 'ko' | 'zh';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string; // Translate function
}

const LanguageContext = createContext<LanguageContextType>(null!);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('vi');
  const [strings, setStrings] = useState<Record<string, string>>({});

  useEffect(() => {
    // Detect browser language on first load
    const browserLang = navigator.language.split('-')[0] as Language;
    const supportedLangs: Language[] = ['vi', 'en', 'ja', 'fr', 'ko', 'zh'];

    if (supportedLangs.includes(browserLang)) {
      setLanguage(browserLang);
    }
  }, []);

  useEffect(() => {
    // Load JSON file dynamically
    import(`@/locales/${language}.json`)
      .then(module => setStrings(module.default))
      .catch(err => console.error('Failed to load locale:', language, err));

    // Persist language preference
    localStorage.setItem('language', language);
  }, [language]);

  const t = useCallback((key: string) => {
    return strings[key] || key; // Fallback to key if translation missing
  }, [strings]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
```

```json
// locales/vi.json
{
  "tour.start_button": "Bắt đầu tour",
  "tour.stop_button": "Dừng tour",
  "tour.auto_mode": "Chế độ tự động",
  "tour.manual_mode": "Chế độ thủ công",
  "settings.title": "Cài đặt",
  "settings.language": "Ngôn ngữ",
  "settings.radius": "Bán kính kích hoạt",
  "settings.volume": "Âm lượng",
  "error.location_denied": "Vui lòng cho phép truy cập vị trí để sử dụng tính năng tự động",
  "error.audio_failed": "Không thể phát âm thanh. Vui lòng thử lại.",
  "offline.ready": "Sẵn sàng sử dụng offline",
  "offline.syncing": "Đang đồng bộ dữ liệu..."
}
```

```json
// locales/en.json
{
  "tour.start_button": "Start Tour",
  "tour.stop_button": "Stop Tour",
  "tour.auto_mode": "Auto Mode",
  "tour.manual_mode": "Manual Mode",
  "settings.title": "Settings",
  "settings.language": "Language",
  "settings.radius": "Trigger Radius",
  "settings.volume": "Volume",
  "error.location_denied": "Please allow location access to use automatic mode",
  "error.audio_failed": "Failed to play audio. Please try again.",
  "offline.ready": "Ready for offline use",
  "offline.syncing": "Syncing data..."
}
```

**POI Content Access**:

```typescript
// lib/utils/localization.ts
export function getLocalizedField<T extends Record<string, any>>(
  obj: T,
  field: string,
  language: Language
): string {
  const localizedKey = `${field}_${language}`;
  const fallbackKey = `${field}_en`;

  return obj[localizedKey] || obj[fallbackKey] || '';
}

// Usage
const poiName = getLocalizedField(poi, 'name', language);
const poiDesc = getLocalizedField(poi, 'description', language);
const audioUrl = getLocalizedField(poi, 'audio_url', language);
```

**Language Selector Component**:

```typescript
// components/layout/LanguageSelector.tsx
const LANGUAGES = [
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
];

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  return (
    <select
      value={language}
      onChange={(e) => setLanguage(e.target.value as Language)}
      className="px-3 py-2 border rounded-lg"
    >
      {LANGUAGES.map(lang => (
        <option key={lang.code} value={lang.code}>
          {lang.flag} {lang.name}
        </option>
      ))}
    </select>
  );
}
```

**Alternatives Considered**:

- **next-intl**: Adds complexity, designed for SSR i18n routing (`/en/tour`, `/vi/tour`), không cần thiết vì FlavorQuest là single-page PWA → rejected
- **react-i18next**: Heavy library (30KB+ gzipped), pluralization/interpolation features không cần thiết cho simple string lookup → overkill
- **Crowdin/Lokalise**: External translation platform, monthly cost, unnecessary cho 6 fixed languages với in-house translation → too expensive

---

## Summary: Finalized Tech Stack

| Layer                  | Technology                             | Rationale                                                               |
| ---------------------- | -------------------------------------- | ----------------------------------------------------------------------- |
| **Frontend Framework** | Next.js 16 + React 19 + TypeScript     | App Router, PWA support, full-stack in one project                      |
| **Styling**            | Tailwind CSS                           | Utility-first, small bundle (<10KB gzipped), fast development           |
| **PWA**                | next-pwa + custom service worker       | Offline-first, background sync, zero-config setup                       |
| **Location**           | Geolocation API + watchPosition        | Browser native, no external library needed, continuous updates          |
| **Geofencing**         | Custom Haversine + Web Worker          | Browser không có native geofence, offload calculation to worker thread  |
| **Audio**              | HTML5 Audio + Web Speech Synthesis     | Pre-recorded quality + TTS fallback, progressive download               |
| **Maps**               | Leaflet + OpenStreetMap                | Lightweight (40KB), open-source, offline tiles, no API key              |
| **Offline Storage**    | IndexedDB (idb-keyval)                 | Large storage (50MB+), async, structured data, better than LocalStorage |
| **Backend**            | Supabase (PostgreSQL + Auth + Storage) | All-in-one, generous free tier, easy setup, no DevOps                   |
| **Auth**               | Google OAuth only                      | Simplicity, no password management, no email verification               |
| **Analytics**          | Custom logs → Supabase table           | Anonymous, privacy-friendly, no 3rd-party trackers (GDPR compliant)     |
| **i18n**               | React Context + JSON files             | Simple, no heavy library, database-driven POI content                   |
| **Testing**            | Jest + RTL + Playwright                | Unit, integration, E2E coverage                                         |
| **Deployment**         | Vercel                                 | Zero-config Next.js deployment, edge functions, global CDN, free tier   |

## Next Steps

✅ Phase 0 complete - All technology decisions finalized  
→ **Phase 1**: Generate data models, API contracts, quickstart guide

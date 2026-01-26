# Implementation Plan: FlavorQuest - Trải Nghiệm Thuyết Minh Âm Thanh Tự Động

**Branch**: `main` | **Date**: 26/01/2026 | **Spec**: [spec.md](spec.md)

## Summary

FlavorQuest là một Progressive Web App (PWA) cung cấp trải nghiệm thuyết minh âm thanh tự động dựa trên vị trí cho phố ẩm thực Vĩnh Khánh (Quận 4, TP.HCM). Hệ thống sử dụng Next.js 16+ với App Router, Supabase backend, và offline-first architecture để tự động phát nội dung âm thanh khi người dùng đi gần các điểm quan tâm (POI) - quán ăn, quầy hàng - mà không cần tương tác màn hình. Hỗ trợ 6 ngôn ngữ (Việt, Anh, Nhật, Pháp, Hàn, Trung), hoạt động offline sau lần tải đầu, và tối ưu hóa tiết kiệm pin cho mobile.

**Technical Approach**: 
- **Frontend/Full-stack**: Next.js 16+ (App Router) + React 19 + TypeScript + Tailwind CSS
- **PWA**: Built-in Next.js PWA support với custom service worker cho offline caching
- **Location**: Browser Geolocation API với watchPosition cho tracking realtime, custom geofencing logic (Haversine distance)
- **Audio**: HTML5 Audio API + custom queue manager, Web Speech Synthesis API (TTS) làm fallback
- **Storage**: IndexedDB (qua idb-keyval) cho POI data, audio files, images, user preferences
- **Maps**: Leaflet + OpenStreetMap tiles (miễn phí, không cần API key)
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Authentication**: Chỉ Google OAuth để đơn giản hóa
- **Analytics**: Anonymous logs lưu vào Supabase (rounded coordinates, không có user ID nếu không đăng nhập)

## Technical Context

**Language/Version**: TypeScript 5.4+, Next.js 16+, React 19+, Node.js 20+  

**Primary Dependencies**: 
- next@16+, react@19+, typescript@5.4+
- @supabase/supabase-js@2.x, @supabase/auth-helpers-nextjs@0.10.x
- leaflet@1.9.x, react-leaflet@4.x
- idb-keyval@6.x (IndexedDB wrapper)
- tailwindcss@3.x

**Storage**: 
- **Server**: Supabase PostgreSQL (POI data, user sessions, analytics logs, audio/image URLs)
- **Client**: IndexedDB (offline cache cho POI, audio files, images, user preferences, visit history)

**Testing**: Jest + React Testing Library (unit), Playwright (E2E), Cypress (PWA testing)

**Target Platform**: 
- Mobile web browsers (iOS Safari 15+, Android Chrome 100+)
- Desktop browsers (Chrome, Firefox, Safari, Edge - latest 2 versions)
- PWA installable trên Android/iOS

**Project Type**: Web application (full-stack với Next.js App Router, không tách frontend/backend riêng)

**Performance Goals**: 
- Thời gian phát âm thanh tự động: <3 giây từ khi vào geofence
- Page load: <2 giây (FCP), <3 giây (LCP) trên 4G
- Offline cache load: <1 giây
- Audio preload: tất cả POI trong bán kính 500m
- TTS fallback: <2 giây để bắt đầu phát
- Map render: <1.5 giây cho toàn bộ khu vực Vĩnh Khánh

**Constraints**: 
- **Offline-first**: Tất cả chức năng chính phải hoạt động không cần mạng sau lần tải đầu
- **Pin**: Tiêu thụ pin <15% sau 1 giờ sử dụng liên tục (màn hình tắt)
- **Accuracy**: GPS accuracy 10-15m trong điều kiện tốt, bộ lọc nhiễu cho 95% trường hợp
- **Storage**: Tổng cache offline <50MB (audio + images + map tiles)
- **Browser autoplay policy**: Cần user gesture trước khi phát âm thanh đầu tiên
- **Background limitation**: PWA không có native background tracking → yêu cầu giữ tab mở hoặc dùng Periodic Background Sync
- **Anonymous by default**: Không yêu cầu đăng nhập để sử dụng, auth chỉ cho admin/content management

**Scale/Scope**: 
- 50-100 POI trên phố Vĩnh Khánh
- 6 ngôn ngữ × ~60-90 giây audio mỗi POI = ~30-50MB total audio
- Hỗ trợ 200 người dùng đồng thời
- ~50-100 active sessions/ngày trong giai đoạn đầu
- Map coverage: ~2km² khu vực Vĩnh Khánh

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Exemplary Code Quality ✅ PASS

**Compliance**:
- TypeScript với strict mode đảm bảo static typing cho toàn bộ codebase
- ESLint + Prettier configured cho Next.js 16 best practices
- Modular architecture: tách biệt location logic, audio playback, storage layer, UI components
- JSDoc comments cho tất cả public functions và custom hooks
- Separation of concerns: hooks cho business logic, components cho presentation, services cho data access

**Evidence**: 
- `tsconfig.json` với `strict: true`
- Folder structure rõ ràng: `app/` (routes), `components/` (UI), `lib/` (business logic), `services/` (external APIs)
- Custom hooks: `useGeolocation`, `useAudioPlayer`, `useOfflineSync`, `usePOIManager`

### II. UX Consistency First ✅ PASS

**Compliance**:
- Tailwind CSS với custom design tokens (colors, spacing, typography) trong `tailwind.config.ts`
- Component library: buttons, cards, modals, maps, audio controls với consistent styling
- Accessibility: ARIA labels, keyboard navigation, screen reader support cho audio feedback, alt text cho images
- Responsive design: mobile-first approach, tested trên iOS/Android
- Predictable patterns: bottom navigation bar, FAB cho Start Tour, swipe gestures cho POI details

**Evidence**:
- Design system documented trong `docs/design-system.md`
- Accessibility checklist trong testing (Lighthouse score target: 95+)
- WCAG 2.1 AA compliance cho color contrast, focus states, audio alternatives (transcript text)

### III. Performance-Driven Engineering ✅ PASS

**Compliance**:
- Next.js App Router với React Server Components giảm JavaScript bundle size
- Service Worker pre-cache audio files, map tiles, images → offline-first architecture
- Lazy loading: POI details chỉ fetch khi user tap vào marker
- Web Workers: Geofencing calculation (Haversine distance) chạy trên worker thread để không block UI
- Throttled geolocation updates: High accuracy chỉ khi di chuyển, low accuracy khi đứng yên
- IndexedDB cho data access nhanh, không block main thread
- Image optimization: Next.js Image component với WebP format, responsive sizes
- Audio streaming: Progressive download, không cần tải toàn bộ file trước khi phát

**Evidence**:
- Performance budget: <50MB cache, <3s audio trigger, <2s FCP
- Lighthouse CI integration trong GitHub Actions
- Web Worker cho geofencing: `lib/workers/geofence.worker.ts`
- Service Worker strategy: Cache-first cho static assets, Network-first với fallback cho POI data

**Status**: ✅ Tất cả gates PASSED - Không có violations cần justify

## Project Structure

### Documentation (this feature)

```text
specs/main/
├── spec.md              # Feature specification
├── plan.md              # This file (Implementation plan)
├── research.md          # Phase 0: Research findings
├── data-model.md        # Phase 1: Database schema & entities
├── quickstart.md        # Phase 1: Quick start guide for developers
├── contracts/           # Phase 1: API contracts & types
│   ├── poi-api.ts       # POI endpoint types
│   ├── analytics-api.ts # Analytics logging types
│   └── auth-types.ts    # Supabase auth types
└── checklists/
    └── requirements.md  # Requirements validation checklist
```

### Source Code (repository root)

```text
flavorquest/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout với PWA meta tags
│   ├── page.tsx                  # Landing page với QR code info
│   ├── tour/
│   │   ├── layout.tsx            # Tour layout với location permission
│   │   ├── page.tsx              # Main tour page (map + auto narration)
│   │   └── [poiId]/
│   │       └── page.tsx          # POI detail page (manual mode)
│   ├── admin/
│   │   ├── layout.tsx            # Admin layout với auth check
│   │   ├── page.tsx              # Dashboard
│   │   └── pois/
│   │       ├── page.tsx          # POI management list
│   │       ├── new/
│   │       │   └── page.tsx      # Create POI
│   │       └── [id]/
│   │           └── edit/
│   │               └── page.tsx  # Edit POI
│   ├── api/
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts      # Supabase auth callback
│   │   └── analytics/
│   │       └── route.ts          # Log analytics events
│   └── manifest.ts               # PWA manifest configuration
│
├── components/                   # React components
│   ├── tour/
│   │   ├── MapView.tsx           # Leaflet map với POI markers
│   │   ├── POIMarker.tsx         # Custom marker component
│   │   ├── UserLocationMarker.tsx
│   │   ├── AudioPlayer.tsx       # Audio controls UI
│   │   ├── NarrationOverlay.tsx  # Hiển thị transcript khi phát audio
│   │   ├── LanguageSelector.tsx  # Dropdown chọn ngôn ngữ
│   │   └── StartTourButton.tsx   # FAB button để start tour
│   ├── admin/
│   │   ├── POIForm.tsx           # Form create/edit POI
│   │   ├── AudioUploader.tsx     # Multi-language audio upload
│   │   └── ImageUploader.tsx     # Upload POI images
│   ├── layout/
│   │   ├── Header.tsx            # App header với logo
│   │   ├── BottomNav.tsx         # Bottom navigation (Map, History, Settings)
│   │   └── SettingsPanel.tsx     # Settings overlay
│   └── ui/                       # Reusable UI components
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Modal.tsx
│       ├── Spinner.tsx
│       └── Toast.tsx
│
├── lib/                          # Business logic & utilities
│   ├── hooks/
│   │   ├── useGeolocation.ts     # Hook theo dõi vị trí user
│   │   ├── useGeofencing.ts      # Hook phát hiện user vào POI geofence
│   │   ├── useAudioPlayer.ts     # Hook quản lý audio playback queue
│   │   ├── useOfflineSync.ts     # Hook đồng bộ data khi có mạng
│   │   ├── usePOIManager.ts      # Hook quản lý POI data (fetch, cache, filter)
│   │   └── useLanguage.ts        # Hook quản lý i18n
│   ├── services/
│   │   ├── supabase.ts           # Supabase client setup
│   │   ├── storage.ts            # IndexedDB wrapper functions
│   │   ├── geolocation.ts        # Geolocation API wrapper
│   │   ├── audio.ts              # Audio playback service
│   │   ├── tts.ts                # Web Speech Synthesis service
│   │   ├── analytics.ts          # Analytics logging service
│   │   └── pwa.ts                # PWA lifecycle events
│   ├── utils/
│   │   ├── distance.ts           # Haversine distance calculation
│   │   ├── noise-filter.ts       # GPS noise filtering
│   │   ├── cooldown.ts           # Cooldown period logic
│   │   ├── battery.ts            # Battery status detection
│   │   ├── speed.ts              # Speed calculation từ GPS
│   │   └── format.ts             # Utility functions (date, number format)
│   ├── workers/
│   │   └── geofence.worker.ts    # Web Worker cho geofencing calculations
│   ├── constants.ts              # App constants (geofence radius, cooldown, etc.)
│   └── types.ts                  # Shared TypeScript types
│
├── public/                       # Static assets
│   ├── icons/                    # PWA icons (72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512)
│   ├── qr-code.png               # QR code image cho landing page
│   ├── manifest.json             # PWA manifest (generated)
│   └── sw.js                     # Service Worker (generated by next-pwa)
│
├── supabase/                     # Supabase local development
│   ├── migrations/
│   │   ├── 001_create_pois.sql
│   │   ├── 002_create_analytics.sql
│   │   └── 003_create_users.sql
│   └── seed.sql                  # Seed data cho POIs
│
├── tests/
│   ├── unit/
│   │   ├── utils/
│   │   │   ├── distance.test.ts
│   │   │   ├── noise-filter.test.ts
│   │   │   └── cooldown.test.ts
│   │   ├── hooks/
│   │   │   ├── useGeofencing.test.tsx
│   │   │   └── useAudioPlayer.test.tsx
│   │   └── services/
│   │       ├── audio.test.ts
│   │       └── tts.test.ts
│   ├── integration/
│   │   ├── tour-flow.test.tsx    # Test toàn bộ tour flow
│   │   ├── offline-mode.test.tsx # Test offline functionality
│   │   └── admin-crud.test.tsx   # Test admin CRUD operations
│   └── e2e/
│       ├── user-journey.spec.ts  # Playwright E2E tests
│       └── pwa-install.spec.ts   # Test PWA installation
│
├── docs/
│   ├── design-system.md          # Design system documentation
│   ├── architecture.md           # High-level architecture diagram
│   └── deployment.md             # Deployment guide (Vercel)
│
├── .env.local.example            # Environment variables template
├── .eslintrc.json                # ESLint configuration
├── .prettierrc                   # Prettier configuration
├── tsconfig.json                 # TypeScript configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── next.config.js                # Next.js configuration (PWA, i18n)
├── package.json
└── README.md
```

**Structure Decision**: 
Sử dụng cấu trúc Next.js App Router (Option 2 - Web application) vì:
1. **Full-stack trong cùng một project**: Next.js App Router hỗ trợ Server Components và API Routes, không cần tách backend riêng
2. **PWA-friendly**: Next.js có built-in support cho PWA manifest và service worker
3. **File-based routing**: Dễ quản lý routes cho tour, admin, POI details
4. **Colocation**: Components, hooks, và logic được organize theo feature thay vì theo layer
5. **Supabase integration**: Dễ dàng với @supabase/auth-helpers-nextjs cho middleware và auth

## Complexity Tracking

**Status**: Không có violations cần justify - tất cả Constitution gates đều PASS.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (PWA)                                 │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Next.js App Router (React 19 + TypeScript)                    │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │ │
│  │  │  Tour Page   │  │  Admin Panel │  │  API Routes  │         │ │
│  │  │  - MapView   │  │  - POI CRUD  │  │  - /api/pois │         │ │
│  │  │  - Auto Play │  │  - Analytics │  │  - /api/auth │         │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘         │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Business Logic (lib/)                                          │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │ │
│  │  │Geolocation│ │Audio Player│ │POI Manager│ │Analytics│       │ │
│  │  │  Hook     │ │   Hook     │ │   Hook    │ │ Service │       │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Offline Storage (IndexedDB)                                    │ │
│  │  - POI data cache                                               │ │
│  │  - User settings                                                │ │
│  │  - Visit history (cooldown tracking)                            │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Service Worker (PWA)                                           │ │
│  │  - Cache-first: Static assets, audio files, map tiles          │ │
│  │  - Network-first: POI data (với fallback to cache)             │ │
│  │  - Background sync: Analytics logs                              │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Web Worker (geofence.worker.ts)                               │ │
│  │  - Haversine distance calculation (offload từ main thread)     │ │
│  │  - Geofence detection (user in POI radius?)                    │ │
│  └────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘
                              ▼ HTTPS
┌─────────────────────────────────────────────────────────────────────┐
│                      SUPABASE BACKEND                                │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  PostgreSQL Database                                            │ │
│  │  ┌────────┐  ┌────────────────┐  ┌────────┐                    │ │
│  │  │  pois  │  │ analytics_logs │  │ users  │                    │ │
│  │  └────────┘  └────────────────┘  └────────┘                    │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Supabase Auth (Google OAuth)                                   │ │
│  │  - Admin authentication                                          │ │
│  │  - Role-based access control (user/admin)                       │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Supabase Storage (CDN)                                         │ │
│  │  ┌──────────────┐  ┌──────────────┐                            │ │
│  │  │ audio/       │  │ images/      │                            │ │
│  │  │ (MP3 files)  │  │ (WebP files) │                            │ │
│  │  └──────────────┘  └──────────────┘                            │ │
│  └────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘
                              ▼ HTTPS
┌─────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                                 │
│  ┌──────────────────┐  ┌──────────────────┐                        │
│  │ OpenStreetMap    │  │ Google OAuth     │                        │
│  │ (Map tiles)      │  │ (Authentication) │                        │
│  └──────────────────┘  └──────────────────┘                        │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Components & Flow

### 1. Auto Narration Trigger Flow

```
User opens tour page
  ↓
Request location permission
  ↓
[useGeolocation hook] Start watchPosition
  ↓
Every position update:
  ↓
Send to Web Worker (geofence.worker.ts)
  ↓
Calculate distance to all POIs (Haversine)
  ↓
Filter POIs within radius
  ↓
Sort by priority + distance
  ↓
[useGeofencing hook] Check cooldown period
  ↓
If not in cooldown:
  ↓
[useAudioPlayer hook] Enqueue audio
  ↓
Play audio (HTML5 Audio or TTS fallback)
  ↓
Log analytics event (anonymous)
  ↓
Mark POI as visited (cooldown = 30 min)
```

### 2. Offline-First Data Sync Flow

```
Initial Load (with network):
  ↓
Fetch POIs from Supabase
  ↓
Save to IndexedDB
  ↓
Preload audio files for nearby POIs
  ↓
Cache audio files in Service Worker
  ↓
Preload map tiles for Vĩnh Khánh area
  ↓
Display "Sẵn sàng sử dụng offline" toast
  ↓
─────────────────────────────────────
Subsequent Loads (offline):
  ↓
Load POIs from IndexedDB
  ↓
Load audio from Service Worker cache
  ↓
Load map tiles from Service Worker cache
  ↓
Everything works without network!
  ↓
─────────────────────────────────────
When network returns:
  ↓
[useOfflineSync hook] Detect online
  ↓
Fetch updated POIs from Supabase
  ↓
Compare with cached data
  ↓
Update IndexedDB with new data
  ↓
Sync analytics logs to Supabase (background)
  ↓
Display "Đã đồng bộ" toast
```

### 3. Admin POI Management Flow

```
Admin signs in with Google
  ↓
Supabase OAuth callback
  ↓
Check user role in users table
  ↓
If role = 'admin':
  ↓
Redirect to /admin dashboard
  ↓
Admin creates/edits POI:
  ↓
Fill POI form (multi-language)
  ↓
Upload audio files (6 languages)
  ↓
Upload POI image
  ↓
Submit form → POST /api/pois
  ↓
Upload audio to Supabase Storage
  ↓
Insert POI record to database
  ↓
Return public URLs
  ↓
Display success message
  ↓
POI now visible to all tour users
```

## Key Technologies Justification

### Why Next.js App Router?
- **Full-stack in one project**: Server Components + API Routes eliminates need for separate backend
- **File-based routing**: Intuitive structure for tour pages, admin pages, POI details
- **Built-in optimization**: Image optimization, code splitting, lazy loading out-of-the-box
- **PWA support**: Easy integration với next-pwa plugin

### Why Supabase?
- **All-in-one**: Database + Auth + Storage + Realtime trong một platform
- **PostgreSQL**: Robust relational database với PostGIS cho geospatial queries
- **Generous free tier**: 500MB DB, 1GB storage, 50GB bandwidth - đủ cho MVP và beyond
- **No DevOps**: Không cần setup/maintain server, auto-scaling, auto-backups

### Why IndexedDB (not LocalStorage)?
- **Storage capacity**: IndexedDB ~50MB+ vs LocalStorage ~5-10MB
- **Structured data**: Store complex objects (POIs, audio blobs) không cần serialize JSON
- **Async API**: Không block UI thread như LocalStorage (synchronous)
- **Better performance**: Indexed queries nhanh hơn cho large datasets

### Why Web Worker for Geofencing?
- **Non-blocking**: Distance calculation chạy parallel, không làm lag UI
- **Battery efficient**: Offload heavy computation từ main thread
- **Scalability**: Dễ dàng tính distance cho 50-100 POIs mỗi giây

### Why Leaflet (not Google Maps)?
- **No API key**: Không cần register, no billing, no quota limits
- **Offline-friendly**: OSM tiles dễ cache, không cần special offline SDK
- **Lightweight**: 40KB gzipped vs Google Maps ~300KB+
- **Open-source**: Full control, có thể customize markers, tiles, styles

### Why TTS Fallback?
- **Network resilience**: Nếu audio file không tải được, TTS vẫn deliver content
- **Browser native**: Web Speech Synthesis built-in, không cần external API
- **Cost-effective**: Zero cost cho TTS, không như cloud TTS services ($4-16 per 1M chars)
- **Multi-language**: Hỗ trợ 6 ngôn ngữ out-of-the-box

## Performance Optimization Strategies

### 1. Service Worker Caching
- **App shell**: Cache HTML, CSS, JS essentials trong install event
- **Audio files**: Cache-first strategy, preload POIs trong bán kính 500m
- **Map tiles**: Cache-first, max 500 tiles (~10-15MB)
- **Eviction policy**: LRU (Least Recently Used) khi vượt quota

### 2. Lazy Loading
- **POI details**: Chỉ fetch khi user tap vào marker
- **Audio files**: Progressive download, play khi đủ buffer
- **Images**: Next.js Image component với lazy loading + WebP format

### 3. Throttling & Debouncing
- **Geolocation updates**: Throttle updates khi user đứng yên (>5 phút)
- **GPS accuracy**: High accuracy chỉ khi di chuyển, low khi đứng yên
- **Map interactions**: Debounce zoom/pan events để giảm re-render

### 4. Code Splitting
- **Route-based**: Mỗi page (tour, admin) loaded separately
- **Component-based**: Admin components không load cho tour users
- **Dynamic imports**: Heavy libraries (Leaflet, chart.js) loaded on-demand

### 5. Battery Optimization
- **Detect battery level**: Reduce GPS frequency khi pin < 20%
- **Background throttling**: Pause geolocation khi tab inactive
- **Battery saver mode**: User toggle để reduce accuracy + frequency

## Security Considerations

### 1. Data Privacy
- **Anonymous by default**: Không yêu cầu đăng nhập để sử dụng tour
- **Rounded coordinates**: Analytics logs round GPS to 2 decimals (~1km accuracy)
- **No PII**: Không lưu user ID, email, phone trong analytics
- **GDPR compliant**: User có thể xóa visit history, không track cross-session

### 2. Authentication Security
- **Google OAuth only**: Leverage Google's security, không store passwords
- **Role-based access**: Admin-only endpoints protected với RLS policies
- **Session management**: Supabase handles token refresh, expiration
- **HTTPS only**: Force HTTPS trong production

### 3. Input Validation
- **Client-side**: TypeScript types, form validation với Zod/Yup
- **Server-side**: Supabase RLS policies, PostgreSQL constraints
- **File uploads**: Validate file type (MP3, WebP), size limits (audio <5MB, image <2MB)

### 4. Rate Limiting
- **Supabase built-in**: 100 requests/second per IP (free tier)
- **Analytics throttling**: Batch log events, max 10 events/minute per session
- **Auth attempts**: Supabase handles brute-force protection

## Deployment Strategy

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

**Why Vercel?**
- Zero-config for Next.js
- Global CDN (Edge Network)
- Auto SSL certificates
- Preview deployments cho PR
- Environment variables management
- Free tier: 100GB bandwidth/month

### Environment Variables (Production)
```bash
# Set trong Vercel dashboard
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_APP_URL=https://flavorquest.vercel.app
NEXT_PUBLIC_DEFAULT_LANGUAGE=vi
NEXT_PUBLIC_GEOFENCE_RADIUS=20
NEXT_PUBLIC_COOLDOWN_MINUTES=30
```

### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## Monitoring & Analytics

### Built-in Analytics
- **Anonymous usage logs**: Lưu trong Supabase `analytics_logs` table
- **Metrics tracked**:
  - Total sessions
  - POI play counts
  - Audio completion rates
  - Language distribution
  - Tour start/end events

### Admin Dashboard
- Summary page: Total sessions, top POIs, completion rates
- POI details: Per-POI analytics, heatmap, time series
- Real-time: Active sessions (nếu có Supabase Realtime enabled)

### Performance Monitoring
- **Lighthouse CI**: Automated performance tests trong GitHub Actions
- **Web Vitals**: Track LCP, FID, CLS trong production
- **Error tracking**: Console errors logged to Supabase (optional)

## Next Steps (Post-Planning)

✅ **Phase 0** complete: Research & tech decisions finalized  
✅ **Phase 1** complete: Data model, API contracts, quickstart guide created  
✅ **Agent context** updated: GitHub Copilot instructions synced

→ **Ready for Phase 2**: `/speckit.tasks` command to generate implementation tasks


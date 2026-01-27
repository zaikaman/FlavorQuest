# Tasks: FlavorQuest - Trải Nghiệm Thuyết Minh Âm Thanh Tự Động

**Input**: Design documents từ `/specs/main/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tech Stack**: Next.js 16 + React 19 + TypeScript + Supabase + PWA  
**Project Type**: Full-stack web application (App Router)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization và cấu trúc cơ bản

- [x] T001 Create Next.js 16 project với App Router: `npx create-next-app@latest flavorquest --typescript --tailwind --app`
- [x] T002 [P] Install dependencies: next@16+, react@19+, @supabase/supabase-js@2.x, @supabase/ssr@latest, leaflet@1.9.x, react-leaflet@5.x, idb-keyval@6.x
- [x] T003 [P] Configure TypeScript strict mode trong tsconfig.json
- [x] T004 [P] Setup ESLint + Prettier với Next.js rules trong eslint.config.mjs và .prettierrc
- [x] T005 [P] Configure Tailwind CSS với custom design tokens trong app/globals.css (Tailwind 4)
- [x] T006 Create project folder structure theo plan.md: app/, components/, lib/, public/, tests/, docs/
- [x] T007 [P] Setup environment variables template trong .env.local.example
- [x] T008 [P] Create PWA manifest configuration trong app/manifest.ts
- [x] T009 [P] Configure next.config.js với PWA support và performance optimizations
- [x] T010 [P] Create constants file trong lib/constants.ts (geofence radius, cooldown, languages)
- [x] T011 [P] Create TypeScript types file trong lib/types.ts (POI, Language, UserSettings, etc.)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure MUST hoàn thành trước khi bắt đầu bất kỳ user story nào

**⚠️ CRITICAL**: Không có user story nào có thể bắt đầu cho đến khi phase này hoàn thành

### Supabase Setup

- [x] T012 Create Supabase project và lấy project URL + anon key
- [x] T013 Create database migrations: 001_create_pois.sql trong supabase/migrations/
- [x] T014 Create database migrations: 002_create_analytics.sql trong supabase/migrations/
- [x] T015 Create database migrations: 003_create_users.sql trong supabase/migrations/
- [x] T016 Run migrations với Supabase CLI: `supabase db push`
- [x] T017 [P] Create sample seed data trong supabase/seed.sql (10-15 POI cho phố Vĩnh Khánh)
- [x] T018 [P] Create Supabase storage buckets: 'audio' và 'images' với public access policies
- [x] T019 Generate database types: `supabase gen types typescript` → lib/types/database.types.ts

### Core Services

- [x] T020 Implement Supabase client setup trong lib/supabase/client.ts và server.ts
- [x] T021 [P] Implement IndexedDB storage wrapper trong lib/services/storage.ts (với idb-keyval)
- [x] T022 [P] Implement Haversine distance calculation trong lib/utils/distance.ts
- [x] T023 [P] Implement GPS noise filter trong lib/utils/noise-filter.ts (simple moving average)
- [x] T024 [P] Implement cooldown manager trong lib/utils/cooldown.ts
- [x] T025 [P] Implement speed calculation từ GPS trong lib/utils/speed.ts
- [x] T026 [P] Implement battery status detection trong lib/utils/battery.ts

### Web Worker

- [x] T027 Create Web Worker cho geofencing trong lib/workers/geofence.worker.ts

### React Context & Hooks Foundation

- [x] T028 Create LanguageContext trong lib/contexts/LanguageContext.tsx
- [x] T029 Create AppContext trong lib/contexts/AppContext.tsx (global state)
- [x] T030 [P] Create localization helper trong lib/utils/localization.ts (getLocalizedField function)
- [x] T031 [P] Create JSON locale files trong locales/: vi.json, en.json, ja.json, fr.json, ko.json, zh.json (basic UI strings)

### Base Components (UI Library)

- [x] T032 [P] Create Button component trong components/ui/Button.tsx
- [x] T033 [P] Create Card component trong components/ui/Card.tsx
- [x] T034 [P] Create Modal component trong components/ui/Modal.tsx
- [x] T035 [P] Create Spinner component trong components/ui/Spinner.tsx
- [x] T036 [P] Create Toast component trong components/ui/Toast.tsx

### Service Worker & PWA

- [x] T037 Configure service worker với Workbox trong next.config.js (OSM tiles, audio, images caching)
- [x] T038 Implement PWA lifecycle events trong lib/services/pwa.ts
- [x] T039 Create PWA icons (8 sizes: 72, 96, 128, 144, 152, 192, 384, 512) trong public/icons/

### Root Layout

- [x] T040 Create root layout trong app/layout.tsx với PWA meta tags, LanguageProvider, AppContext Provider

**Checkpoint**: ✅ Foundation ready - User story implementation có thể bắt đầu parallel

---

## Phase 3: User Story 1 - Trải Nghiệm Tự Động Phát Thuyết Minh Theo Vị Trí (Priority: P1) 🎯 MVP

**Goal**: Người dùng có thể quét QR, mở website, cho phép vị trí, và nhận thuyết minh âm thanh tự động khi đi gần POI

**Independent Test**: Mô phỏng user đi qua 3 POI, xác nhận audio tự động phát đúng lúc, không lặp lại trong cooldown period

### Core Hooks for US1

- [x] T041 [P] [US1] Implement useGeolocation hook trong lib/hooks/useGeolocation.ts (watchPosition wrapper)
- [x] T042 [P] [US1] Implement useGeofencing hook trong lib/hooks/useGeofencing.ts (Web Worker integration, distance check)
- [x] T043 [P] [US1] Implement useAudioPlayer hook trong lib/hooks/useAudioPlayer.ts (HTML5 Audio + queue manager)
- [x] T044 [US1] Implement usePOIManager hook trong lib/hooks/usePOIManager.ts (fetch, cache, filter POIs) - depends on T041, T042

### Services for US1

- [x] T045 [P] [US1] Implement geolocation service trong lib/services/geolocation.ts (wrapper cho browser API)
- [x] T046 [P] [US1] Implement audio playback service trong lib/services/audio.ts (AudioPlayer class với queue)
- [x] T047 [P] [US1] Implement TTS service trong lib/services/tts.ts (Web Speech Synthesis wrapper)
- [x] T048 [P] [US1] Implement analytics logging service trong lib/services/analytics.ts (log events to Supabase)

### Components for US1

- [x] T049 [P] [US1] Create StartTourButton component trong components/tour/StartTourButton.tsx (unlock audio context)
- [x] T050 [P] [US1] Create AudioPlayer component trong components/tour/AudioPlayer.tsx (controls UI)
- [x] T051 [P] [US1] Create NarrationOverlay component trong components/tour/NarrationOverlay.tsx (hiển thị transcript)

### Pages for US1

- [x] T052 [US1] Create landing page trong app/page.tsx (QR code info, Start Tour button)
- [x] T053 [US1] Create tour layout trong app/tour/layout.tsx (location permission request)
- [x] T054 [US1] Create main tour page trong app/tour/page.tsx (auto narration logic) - integrates T041-T051

### Auto Narration Logic

- [x] T055 [US1] Integrate geofencing + audio playback trong tour page: detect POI entry → check cooldown → enqueue audio
- [x] T056 [US1] Implement cooldown tracking trong IndexedDB: save/load last played timestamp per POI
- [x] T057 [US1] Implement auto-pause khi user dừng lâu >5 phút (detect từ speed === 0)
- [x] T058 [US1] Implement priority sorting: nếu nhiều POI cùng lúc, phát POI priority cao nhất + gần nhất

### Edge Cases for US1

- [x] T059 [US1] Handle location permission denied: hiển thị Modal với hướng dẫn enable location
- [x] T060 [US1] Handle GPS drift: apply noise filter trước khi check geofence
- [x] T061 [US1] Handle fast movement (>15 km/h): pause auto narration, hiển thị Toast khuyến nghị đi bộ
- [x] T062 [US1] Handle browser autoplay policy: require user gesture (Start Tour button) trước khi phát audio
- [x] T063 [US1] Handle audio load error: fallback to TTS với transcript từ POI description

### Analytics for US1

- [x] T064 [US1] Log 'tour_start' event khi user click Start Tour button
- [x] T065 [US1] Log 'auto_play' event khi audio tự động phát với POI ID, rounded GPS, language
- [x] T066 [US1] Log 'skip' event nếu user skip audio trước khi nghe hết
- [x] T067 [US1] Log 'tour_end' event khi user leave page hoặc stop tour

**Checkpoint**: ✅ At this point, User Story 1 fully functional và testable independently. User có thể quét QR, start tour, nhận auto narration khi đi gần POI.

---

## Phase 4: User Story 2 - Trải Nghiệm Offline-First (Priority: P2)

**Goal**: Người dùng có thể tải nội dung lần đầu với mạng, sau đó sử dụng đầy đủ tính năng offline (bao gồm auto narration, map, images)

**Independent Test**: Tải website với mạng, bật airplane mode (chỉ GPS), xác nhận tour vẫn hoạt động đầy đủ

### Offline Sync Hook

- [ ] T068 [P] [US2] Implement useOfflineSync hook trong lib/hooks/useOfflineSync.ts (detect online/offline, sync data)

### Service Worker Enhancements

- [ ] T069 [US2] Enhance service worker caching strategies: CacheFirst cho audio files
- [ ] T070 [US2] Add runtime caching cho Supabase Storage URLs (audio, images)
- [ ] T071 [US2] Implement background sync cho analytics logs (queue offline events, sync khi online)

### POI Preloading

- [ ] T072 [US2] Fetch all POIs từ Supabase và save to IndexedDB on first load trong usePOIManager hook
- [ ] T073 [US2] Preload audio files cho POIs trong bán kính 500m: fetch → cache in service worker
- [ ] T074 [US2] Implement audio preloader service trong lib/services/audio-preloader.ts

### Offline Indicators

- [ ] T075 [P] [US2] Create OfflineIndicator component trong components/layout/OfflineIndicator.tsx (hiển thị "Offline" badge)
- [ ] T076 [US2] Display Toast "Sẵn sàng sử dụng offline" sau khi preload hoàn tất
- [ ] T077 [US2] Display Toast "Đã đồng bộ" khi sync analytics logs thành công sau khi online lại

### IndexedDB Persistence

- [ ] T078 [US2] Implement save/load POI data to/from IndexedDB trong storage service
- [ ] T079 [US2] Implement save/load user settings to/from IndexedDB
- [ ] T080 [US2] Implement save/load visit history to/from IndexedDB

### Offline Fallbacks

- [ ] T081 [US2] If audio file không load được (offline + cache miss), fallback to TTS
- [ ] T082 [US2] If POI images không load được, hiển thị placeholder image
- [ ] T083 [US2] If Supabase không accessible, load POI data từ IndexedDB cache

### Background Sync

- [ ] T084 [US2] Queue analytics events khi offline vào IndexedDB
- [ ] T085 [US2] Sync queued events khi detect online trong useOfflineSync hook
- [ ] T086 [US2] Clear synced events từ queue sau khi thành công

**Checkpoint**: ✅ At this point, User Stories 1 AND 2 both work independently. User có thể sử dụng tour offline sau lần tải đầu.

---

## Phase 5: User Story 3 - Duyệt Thủ Công và Điều Khiển (Priority: P2)

**Goal**: Người dùng có thể chuyển sang manual mode, xem map tương tác, chọn POI, phát audio manually, điều chỉnh settings, xem history

**Independent Test**: Tắt auto mode, xem map, chọn POI, phát audio manually, đổi language, xem visit history - tất cả hoạt động độc lập

### Map Components

- [ ] T087 [P] [US3] Create MapView component trong components/tour/MapView.tsx (Leaflet integration)
- [ ] T088 [P] [US3] Create POIMarker component trong components/tour/POIMarker.tsx (custom marker)
- [ ] T089 [P] [US3] Create UserLocationMarker component trong components/tour/UserLocationMarker.tsx
- [ ] T090 [US3] Integrate map preloading: preload OSM tiles cho Vĩnh Khánh area trong service worker

### POI Detail Page

- [ ] T091 [US3] Create POI detail page trong app/tour/[poiId]/page.tsx (hiển thị tên, ảnh, description, audio controls)
- [ ] T092 [P] [US3] Create POIDetailCard component trong components/tour/POIDetailCard.tsx
- [ ] T093 [US3] Implement manual audio play từ POI detail page (user click Play button)

### Settings Panel

- [ ] T094 [P] [US3] Create SettingsPanel component trong components/layout/SettingsPanel.tsx
- [ ] T095 [P] [US3] Create LanguageSelector component trong components/layout/LanguageSelector.tsx
- [ ] T096 [US3] Implement settings form: geofence radius slider, auto mode toggle, volume slider
- [ ] T097 [US3] Save settings to IndexedDB khi user thay đổi
- [ ] T098 [US3] Load settings từ IndexedDB khi mount SettingsPanel

### History View

- [ ] T099 [P] [US3] Create HistoryView component trong components/tour/HistoryView.tsx
- [ ] T100 [US3] Display list of visited POIs với timestamp từ IndexedDB visit history
- [ ] T101 [US3] Allow user replay audio từ history: click POI → play audio

### Bottom Navigation

- [ ] T102 [P] [US3] Create BottomNav component trong components/layout/BottomNav.tsx (Map, History, Settings tabs)
- [ ] T103 [US3] Integrate BottomNav vào tour layout trong app/tour/layout.tsx

### Manual Mode Toggle

- [ ] T104 [US3] Implement auto/manual mode toggle trong tour page: nếu manual, pause geofencing
- [ ] T105 [US3] Display map overlay khi user tap màn hình trong auto mode (quick access to manual controls)

### Map Interactions

- [ ] T106 [US3] Implement POI marker click: open POI detail modal/page
- [ ] T107 [US3] Implement map zoom/pan controls
- [ ] T108 [US3] Implement user location centering button (center map on current position)

**Checkpoint**: ✅ All user stories 1, 2, AND 3 work independently. User có full control với manual mode, map, settings, history.

---

## Phase 6: User Story 4 - Hỗ Trợ Đa Ngôn Ngữ (Priority: P3)

**Goal**: Người dùng có thể chọn 1 trong 6 ngôn ngữ (Việt, Anh, Nhật, Pháp, Hàn, Trung), toàn bộ UI + audio chuyển sang ngôn ngữ đó

**Independent Test**: Thay đổi language trong settings, xác nhận UI strings + POI content + audio đều localized

### Localization Setup

- [ ] T109 [P] [US4] Complete all locale files trong locales/ với full UI strings cho 6 languages
- [ ] T110 [US4] Implement useLanguage hook trong lib/hooks/useLanguage.ts (get/set language, translate function)

### Language Detection

- [ ] T111 [US4] Auto-detect browser language trên first load trong LanguageContext
- [ ] T112 [US4] Save selected language to IndexedDB (persist across sessions)
- [ ] T113 [US4] Load saved language từ IndexedDB khi mount LanguageContext

### UI Localization

- [ ] T114 [US4] Apply `t()` translation function to all UI strings trong components (buttons, labels, errors)
- [ ] T115 [US4] Localize all Toast messages
- [ ] T116 [US4] Localize all Modal content
- [ ] T117 [US4] Localize SettingsPanel labels

### POI Content Localization

- [ ] T118 [US4] Update POI detail page để hiển thị localized name, description based on current language
- [ ] T119 [US4] Update audio player để fetch localized audio URL (audio_url_vi, audio_url_en, etc.)
- [ ] T120 [US4] Implement fallback logic: nếu audio/text cho ngôn ngữ hiện tại không có, fallback to English

### TTS Localization

- [ ] T121 [US4] Update TTS service để set utterance.lang based on current language (vi-VN, en-US, ja-JP, etc.)
- [ ] T122 [US4] Test TTS với 6 ngôn ngữ, verify giọng đọc tự nhiên

### Language Selector Integration

- [ ] T123 [US4] Integrate LanguageSelector vào SettingsPanel
- [ ] T124 [US4] Add language flag emojis (🇻🇳 🇬🇧 🇯🇵 🇫🇷 🇰🇷 🇨🇳) to LanguageSelector dropdown
- [ ] T125 [US4] Implement real-time language switch: when user changes language, reload current POI audio với ngôn ngữ mới

### Multi-language Analytics

- [ ] T126 [US4] Log analytics events với language field để track usage per language

**Checkpoint**: ✅ All 4 user stories fully functional. FlavorQuest hỗ trợ đầy đủ 6 ngôn ngữ với UI + content + audio localized.

---

## Phase 7: Admin Dashboard & POI Management (Supporting Feature)

**Purpose**: Admin có thể đăng nhập, CRUD POIs, upload audio/images, tạo audio từ mô tả, xem analytics

**⚠️ Note**: Admin feature không phải core user story, nhưng cần thiết cho content management

### Authentication Setup

- [x] T127 Setup Google OAuth trong Supabase dashboard
- [x] T128 [P] Implement signInWithGoogle function trong lib/services/auth.ts
- [x] T129 [P] Implement signOut function trong lib/services/auth.ts
- [x] T130 Create auth callback route trong app/api/auth/callback/route.ts

### Auth Context & Hooks

- [x] T131 Create AuthContext trong lib/contexts/AuthContext.tsx (track user session, admin role)
- [x] T132 Implement useAuth hook trong lib/hooks/useAuth.ts (getCurrentUser, isAdmin, signIn, signOut)

### Admin Layout & Routes

- [x] T133 Create admin layout trong app/admin/layout.tsx (auth check middleware, redirect nếu không phải admin)
- [x] T134 [P] Create admin dashboard page trong app/admin/page.tsx (summary stats)
- [x] T135 Create POI list page trong app/admin/pois/page.tsx
- [x] T136 Create new POI page trong app/admin/pois/new/page.tsx
- [x] T137 Create edit POI page trong app/admin/pois/[id]/edit/page.tsx

### Admin Components

- [x] T138 [P] Create POIForm component trong components/admin/POIForm.tsx (multi-language text inputs cho narration content)
- [x] T139 [P] Create TTSGenerator component trong components/admin/TTSGenerator.tsx (textarea cho mỗi ngôn ngữ + button "Generate Audio" → gọi API tạo 6 files)
- [x] T140 [P] Create ImageUploader component trong components/admin/ImageUploader.tsx
- [x] T141 [P] Create AdminHeader component trong components/admin/AdminHeader.tsx (sign out button)

### POI CRUD API Routes

- [x] T142 [P] Create GET /api/pois route trong app/api/pois/route.ts (fetch all POIs)
- [x] T143 [P] Create POST /api/pois route (create POI, admin only)
- [x] T144 [P] Create PUT /api/pois/[id] route trong app/api/pois/[id]/route.ts (update POI, admin only)
- [x] T145 [P] Create DELETE /api/pois/[id] route (soft delete POI, admin only)

### TTS Audio Generation & File Upload

- [x] T146 Setup Google Cloud TTS credentials (service account key trong .env.local)
- [x] T147 Implement generateTTSAudio function trong lib/services/tts-generator.ts (gọi Google Cloud TTS API)
- [x] T148 Create POST /api/tts/generate route trong app/api/tts/generate/route.ts (nhận text → generate 6 audio files → upload to Supabase Storage → return URLs)
- [x] T149 Implement uploadImage function trong lib/services/storage.ts
- [x] T150 Create POST /api/pois/[id]/image route trong app/api/pois/[id]/image/route.ts

### Analytics Dashboard

- [x] T151 Create GET /api/analytics/summary route trong app/api/analytics/summary/route.ts (admin only)
- [x] T152 Create GET /api/analytics/poi/[id] route trong app/api/analytics/poi/[id]/route.ts
- [x] T153 [P] Create AnalyticsSummary component trong components/admin/AnalyticsSummary.tsx
- [x] T154 [P] Create POIAnalyticsChart component trong components/admin/POIAnalyticsChart.tsx (daily plays, completion rate)

**Checkpoint**: ✅ Admin có thể manage POIs và xem analytics. Content management ready.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories, không thuộc về story cụ thể nào

### Performance Optimization

- [ ] T154 [P] Optimize image loading: convert all images to WebP format, add responsive sizes
- [ ] T155 [P] Implement lazy loading cho POI detail images với Next.js Image component
- [ ] T156 [P] Compress audio files to 64kbps MP3 để giảm size
- [ ] T157 Implement map tile preloading optimization: chỉ preload tiles cho zoom levels 15-18
- [ ] T158 Throttle geolocation updates khi user đứng yên (speed < 0.5 m/s)

### Battery Optimization

- [ ] T159 Implement battery level detection trong battery.ts utility
- [ ] T160 Display battery warning Toast khi pin < 20%
- [ ] T161 Add battery saver mode toggle trong SettingsPanel: giảm GPS accuracy + frequency

### Error Handling

- [ ] T162 [P] Create ErrorBoundary component trong components/ErrorBoundary.tsx
- [ ] T163 [P] Wrap app với ErrorBoundary trong root layout
- [ ] T164 Implement global error logging to Supabase analytics table (optional)
- [ ] T165 Add error recovery UI: retry button, reset app state button

### Accessibility (A11y)

- [ ] T166 [P] Add ARIA labels to all interactive elements (buttons, links, inputs)
- [ ] T167 [P] Add keyboard navigation support: tab through POIs, Enter to play audio
- [ ] T168 [P] Add screen reader support: announce khi vào POI geofence
- [ ] T169 Test color contrast ratios (WCAG 2.1 AA): ensure text readable
- [ ] T170 Add alt text to all images
- [ ] T171 Add transcript display option cho audio (accessibility + fallback)

### Documentation

- [ ] T172 [P] Create design system documentation trong docs/design-system.md
- [ ] T173 [P] Create architecture documentation trong docs/architecture.md (diagrams, flow charts)
- [ ] T174 [P] Create deployment guide trong docs/deployment.md (Vercel setup, env vars)
- [ ] T175 [P] Update README.md với project overview, setup instructions, quick start
- [ ] T176 Create API documentation trong docs/api.md (document all API routes)

### Testing (Optional - chỉ nếu requested)

- [ ] T177 [P] Write unit tests cho distance.ts trong tests/unit/utils/distance.test.ts
- [ ] T178 [P] Write unit tests cho noise-filter.ts trong tests/unit/utils/noise-filter.test.ts
- [ ] T179 [P] Write unit tests cho cooldown.ts trong tests/unit/utils/cooldown.test.ts
- [ ] T180 [P] Write integration test cho tour flow trong tests/integration/tour-flow.test.tsx
- [ ] T181 [P] Write integration test cho offline mode trong tests/integration/offline-mode.test.tsx
- [ ] T182 [P] Write E2E test cho user journey trong tests/e2e/user-journey.spec.ts (Playwright)
- [ ] T183 Setup Lighthouse CI trong GitHub Actions workflow

### Code Quality

- [ ] T184 [P] Add JSDoc comments to all public functions và hooks
- [ ] T185 [P] Run ESLint fix: `npm run lint -- --fix`
- [ ] T186 [P] Run Prettier format: `npm run format`
- [ ] T187 Code review pass: ensure modular architecture, separation of concerns
- [ ] T188 Refactor any duplicate code into reusable utilities

### Security

- [ ] T189 Review Supabase RLS policies: ensure POIs publicly readable, admin-only writes
- [ ] T190 Validate file uploads: check file type (MP3, WebP), size limits (audio <5MB, image <2MB)
- [ ] T191 Sanitize user inputs trong admin forms (XSS prevention)
- [ ] T192 Ensure HTTPS only trong production (Vercel handles này)

### Final Validation

- [ ] T193 Run quickstart.md validation: follow guide end-to-end, ensure không có broken steps
- [ ] T194 Test trên mobile devices (iOS Safari, Android Chrome): verify touch interactions, audio playback
- [ ] T195 Test trên desktop browsers (Chrome, Firefox, Safari, Edge): verify responsive layout
- [ ] T196 Test offline mode thoroughly: airplane mode + GPS, confirm all features work
- [ ] T197 Test multi-language thoroughly: switch languages, verify UI + audio localized
- [ ] T198 Performance audit với Lighthouse: target score >90 for Performance, Accessibility, Best Practices
- [ ] T199 Security audit: check for exposed credentials, insecure endpoints
- [ ] T200 Final smoke test: complete full user journey từ landing page → tour → history → settings

**Checkpoint**: ✅ FlavorQuest production-ready! All user stories tested, polished, and documented.

---

## Dependencies & Execution Order

### Phase Dependencies

1. **Setup (Phase 1)**: No dependencies - start immediately
2. **Foundational (Phase 2)**: Depends on Setup - **BLOCKS all user stories**
3. **User Stories (Phases 3-6)**: All depend on Foundational completion
   - User stories CAN proceed in parallel (nếu có team capacity)
   - Hoặc sequential theo priority: US1 (P1) → US2 (P2) → US3 (P2) → US4 (P3)
4. **Admin (Phase 7)**: Can start after Foundational, parallel với user stories
5. **Polish (Phase 8)**: Depends on desired user stories completion

### User Story Dependencies

- **US1 (P1)**: Independent - can start after Foundational (Phase 2)
- **US2 (P2)**: Depends on US1 for base tour functionality, but independently testable
- **US3 (P2)**: Depends on US1 for tour context, can integrate với US2 offline features
- **US4 (P3)**: Can layer on top of any completed stories (just adds localization)

### Critical Path (MVP = US1 Only)

```
Setup (T001-T011) → Foundational (T012-T040) → US1 (T041-T067) → MVP Ready! 🎯
```

Total MVP tasks: ~67 tasks (~2-3 weeks cho 1 developer)

### Full Product Path (All User Stories)

```
Setup → Foundational → (US1 + US2 + US3 + US4 parallel) → Admin → Polish → Production Ready! 🚀
```

Total all tasks: ~200 tasks (~6-8 weeks cho 1 developer, hoặc 3-4 weeks cho team)

### Parallel Opportunities

#### Within Phase 2 (Foundational)

- T013-T015 (database migrations) can run parallel
- T017-T018 (seed data + storage buckets) can run parallel
- T021-T026 (utility functions) can run parallel
- T032-T036 (UI components) can run parallel

#### Within Phase 3 (US1)

- T041-T043 (hooks) can start parallel
- T045-T048 (services) can run parallel
- T049-T051 (components) can run parallel
- T059-T063 (edge cases) can run parallel after core logic

#### Within Phase 4 (US2)

- T069-T071 (service worker enhancements) can run parallel
- T075-T076 (offline indicators) can run parallel

#### Within Phase 5 (US3)

- T087-T089 (map components) can start parallel
- T092, T094-T095, T099, T102 (various components) can run parallel

#### Within Phase 6 (US4)

- T109-T110 (localization setup) can start parallel
- T114-T117 (UI localization) can run parallel

#### Within Phase 7 (Admin)

- T128-T129 (auth functions) can run parallel
- T134-T137 (admin pages structure) can run parallel
- T138-T141 (admin components) can run parallel
- T142-T145 (API routes) can run parallel
- T152-T153 (analytics components) can run parallel

#### Within Phase 8 (Polish)

- T154-T156 (performance optimizations) can run parallel
- T166-T171 (accessibility improvements) can run parallel
- T172-T176 (documentation) can run parallel
- T177-T183 (tests) can run parallel
- T184-T186 (code quality) can run parallel

---

## Parallel Example: Foundational Phase

Nếu có 4 developers, có thể split Phase 2 như sau:

```bash
# Dev 1: Database & Supabase
T012-T019 (setup database, migrations, seed data, types)

# Dev 2: Core Services & Utilities
T020-T026 (Supabase client, storage, distance, filters, cooldown, battery)

# Dev 3: Web Worker & Context
T027-T031 (geofence worker, contexts, localization helpers, locale files)

# Dev 4: UI Components & PWA
T032-T040 (Button, Card, Modal, Spinner, Toast, service worker, PWA, root layout)
```

Tất cả 4 streams có thể chạy parallel → Phase 2 hoàn thành trong ~1 week thay vì 2-3 weeks sequential.

---

## Parallel Example: User Story 1 (MVP)

Nếu có 3 developers, có thể split US1 như sau:

```bash
# Dev 1: Hooks & Core Logic
T041-T044, T055-T058 (geolocation, geofencing, audio, POI manager, auto narration logic)

# Dev 2: Services
T045-T048, T059-T063 (geolocation service, audio service, TTS, analytics, edge cases)

# Dev 3: Components & Pages
T049-T054, T064-T067 (buttons, overlays, pages, analytics logging)
```

All 3 streams có thể chạy mostly parallel → US1 hoàn thành trong ~5-7 days.

---

## Implementation Strategy

### Recommended Approach: MVP First

1. **Week 1-2**: Phase 1 (Setup) + Phase 2 (Foundational)
2. **Week 3**: Phase 3 (US1 - Auto Narration) → **MVP DELIVERED** 🎯
3. **Week 4**: Phase 4 (US2 - Offline) + Phase 5 (US3 - Manual Mode)
4. **Week 5**: Phase 6 (US4 - Multi-language) + Phase 7 (Admin Dashboard)
5. **Week 6**: Phase 8 (Polish & Testing) → **PRODUCTION READY** 🚀

### Incremental Delivery

- **End of Week 3**: Demo US1 to stakeholders (auto narration works!)
- **End of Week 4**: Demo US2+US3 (offline + manual controls)
- **End of Week 5**: Demo US4 (multi-language) + show admin panel
- **End of Week 6**: Final demo + launch preparation

### Testing Checkpoints

- After Phase 2: Smoke test foundation (DB, service worker, basic components)
- After US1: Full integration test of auto narration flow
- After US2: Offline mode stress test (airplane mode, cache validation)
- After US3: Manual controls UX testing
- After US4: Multi-language testing với native speakers
- After Phase 8: Full regression testing, performance audit, security review

---

## Notes

- **Tests are OPTIONAL**: No test tasks included by default. Add T177-T183 only if testing explicitly requested.
- **Task IDs are sequential**: T001-T200 cover full project scope.
- **[P] markers**: Tasks marked [P] can run in parallel với tasks khác trong cùng phase (nếu team capacity allows).
- **[Story] labels**: US1, US2, US3, US4 map to 4 user stories từ spec.md.
- **File paths**: All paths assume Next.js App Router structure from plan.md.
- **Estimated timeline**: ~6-8 weeks cho 1 developer full-time, hoặc ~3-4 weeks cho team of 3-4 developers với parallel execution.

---

**Status**: ✅ Task breakdown complete - Ready for implementation!  
**Next Step**: Pick first task (T001) và bắt đầu coding! 🚀

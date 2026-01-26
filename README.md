# FlavorQuest - Trải Nghiệm Thuyết Minh Âm Thanh Tự Động

[![Next.js](https://img.shields.io/badge/Next.js-16.1.4-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.3-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-latest-green)](https://supabase.com/)

Khám phá phố ẩm thực Vĩnh Khánh (Quận 4, TP.HCM) với thuyết minh âm thanh tự động dựa trên vị trí. Hỗ trợ 6 ngôn ngữ, hoạt động offline, tối ưu pin cho mobile.

## ✨ Tính Năng Chính

- 🎯 **Auto Narration**: Tự động phát thuyết minh khi đi gần POI (geofencing)
- 🌐 **Đa Ngôn Ngữ**: Hỗ trợ 6 ngôn ngữ (Việt, Anh, Nhật, Pháp, Hàn, Trung)
- 📱 **PWA**: Cài đặt như app native trên mobile
- 🔌 **Offline-First**: Hoạt động đầy đủ không cần mạng sau lần tải đầu
- 🗺️ **Interactive Map**: Xem bản đồ, chọn POI, điều khiển thủ công
- 🔋 **Battery Optimized**: Tiêu thụ pin thấp với GPS throttling

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm hoặc yarn
- Supabase account (miễn phí)

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/flavorquest.git
cd flavorquest

# Install dependencies
npm install

# Copy environment template
cp .env.local.example .env.local

# Điền Supabase credentials vào .env.local
# Lấy từ https://supabase.com/dashboard/project/_/settings/api

# Run development server
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) trong browser.

### Build for Production

```bash
npm run build
npm run start
```

## 📁 Project Structure

```
flavorquest/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout với PWA meta tags
│   ├── page.tsx            # Landing page
│   ├── manifest.ts         # PWA manifest
│   └── globals.css         # Global styles với Tailwind
├── components/             # React components
│   ├── ui/                 # UI components (Button, Card, Modal...)
│   ├── tour/               # Tour-specific components
│   ├── layout/             # Layout components
│   └── admin/              # Admin dashboard components
├── lib/                    # Business logic & utilities
│   ├── hooks/              # Custom React hooks
│   ├── services/           # External service integrations
│   ├── utils/              # Helper functions
│   ├── contexts/           # React contexts
│   ├── workers/            # Web Workers
│   ├── types/              # Additional types
│   ├── constants.ts        # App constants
│   └── types.ts            # TypeScript types
├── public/                 # Static assets
│   └── icons/              # PWA icons
├── locales/                # i18n translations
├── supabase/               # Supabase migrations & seed data
│   └── migrations/         # Database migrations
├── tests/                  # Test files
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── e2e/                # E2E tests
├── docs/                   # Documentation
└── specs/                  # Feature specifications
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 16+ (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Maps**: Leaflet + OpenStreetMap
- **Storage**: IndexedDB (idb-keyval)
- **PWA**: Service Worker + Web Workers
- **Audio**: HTML5 Audio API + Web Speech Synthesis (TTS fallback)

## 📦 Phase 1: Setup (COMPLETED ✅)

### Completed Tasks

- [x] **T001**: Next.js 16 project với App Router
- [x] **T002**: Dependencies: Next.js 16.1.4, React 19.2.3, Supabase, Leaflet, idb-keyval
- [x] **T003**: TypeScript strict mode configuration
- [x] **T004**: ESLint + Prettier setup
- [x] **T005**: Tailwind CSS 4 với custom design tokens
- [x] **T006**: Project folder structure
- [x] **T007**: Environment variables template
- [x] **T008**: PWA manifest configuration
- [x] **T009**: Next.js config với security headers, performance optimizations
- [x] **T010**: Constants file (geofence, cooldown, languages)
- [x] **T011**: TypeScript types (POI, Language, UserSettings, Analytics, etc.)

### Key Files Created

- `lib/constants.ts`: App-wide constants (18m geofence radius, 30min cooldown, 6 languages)
- `lib/types.ts`: Complete type system (500+ lines, 40+ types)
- `app/manifest.ts`: PWA configuration
- `next.config.ts`: Production-ready config với security headers
- `.env.local.example`: Environment template

### Build Status

```bash
✓ TypeScript compilation: PASSED
✓ ESLint: PASSED (0 errors)
✓ Prettier: PASSED (all files formatted)
✓ Production build: SUCCESS
```

## 📝 Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run format       # Format code với Prettier
```

## 🗂️ Next Steps: Phase 2 (Foundational)

Các tasks tiếp theo:

- **T012-T019**: Supabase setup (database, migrations, seed data)
- **T020-T026**: Core services (Supabase client, IndexedDB, GPS utilities)
- **T027**: Web Worker cho geofencing
- **T028-T031**: React Context & localization
- **T032-T036**: Base UI components
- **T037-T039**: Service Worker & PWA lifecycle
- **T040**: Root layout với providers

Xem [specs/main/tasks.md](specs/main/tasks.md) để biết chi tiết.

## 📚 Documentation

- [Specification](specs/main/spec.md): Feature requirements
- [Implementation Plan](specs/main/plan.md): Technical approach
- [Data Model](specs/main/data-model.md): Database schema
- [Tasks](specs/main/tasks.md): Phân rã tasks chi tiết
- [Research](specs/main/research.md): Technical decisions
- [Quick Start Guide](specs/main/quickstart.md): Developer onboarding

## 🤝 Contributing

Dự án đang trong giai đoạn phát triển. Phase 1 (Setup) đã hoàn thành.

## 📄 License

MIT

## 📧 Contact

- Email: support@flavorquest.app
- Project: [FlavorQuest](https://github.com/your-org/flavorquest)

---

**Status**: Phase 1 Complete ✅ | Next: Phase 2 (Foundational)  
**Last Updated**: January 26, 2026

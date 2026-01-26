# FlavorQuest - Quick Start Guide

**Version**: 1.0.0  
**Date**: 26/01/2026  
**For**: Developers joining the FlavorQuest project

## Prerequisites

- **Node.js**: v20+ (LTS recommended)
- **npm**: v10+ hoặc **pnpm**: v9+
- **Git**: Latest version
- **Supabase account**: [supabase.com](https://supabase.com) (free tier OK)
- **Google Cloud account**: Cho OAuth setup
- **Code editor**: VS Code recommended với extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript + JavaScript Language Features

## 1. Clone Repository

```bash
git clone https://github.com/your-org/flavorquest.git
cd flavorquest
```

## 2. Install Dependencies

```bash
npm install
# hoặc
pnpm install
```

**Key dependencies được install**:

- `next@16+` - Framework
- `react@19+` - UI library
- `@supabase/supabase-js@2.x` - Supabase client
- `@supabase/auth-helpers-nextjs@0.10.x` - Auth helpers
- `leaflet@1.9.x`, `react-leaflet@4.x` - Maps
- `idb-keyval@6.x` - IndexedDB wrapper
- `tailwindcss@3.x` - Styling

## 3. Setup Supabase

### 3.1. Create Supabase Project

1. Đăng nhập [supabase.com](https://supabase.com)
2. Create new project:
   - Name: `flavorquest`
   - Database password: Generate strong password (save nó!)
   - Region: Southeast Asia (Singapore) cho low latency
3. Đợi ~2 phút để project provisioning complete

### 3.2. Run Database Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link project
supabase link --project-ref <YOUR_PROJECT_ID>

# Run migrations
supabase db push
```

Migrations sẽ tạo tables: `pois`, `analytics_logs`, `users`

### 3.3. Seed Sample Data

```bash
supabase db reset --seed
```

Seed data bao gồm 10-15 sample POI trên phố Vĩnh Khánh.

### 3.4. Setup Storage Buckets

1. Vào Supabase dashboard → Storage
2. Create 2 buckets:
   - **`audio`**: Public bucket cho audio files
   - **`images`**: Public bucket cho POI images
3. Set policies:

   ```sql
   -- Allow public read for audio bucket
   CREATE POLICY "Audio files are publicly accessible"
   ON storage.objects FOR SELECT
   USING (bucket_id = 'audio');

   -- Allow admin insert for audio bucket
   CREATE POLICY "Admins can upload audio"
   ON storage.objects FOR INSERT
   WITH CHECK (bucket_id = 'audio' AND auth.jwt() ->> 'role' = 'admin');

   -- Tương tự cho images bucket
   ```

### 3.5. Generate Database Types

```bash
supabase gen types typescript --project-id <YOUR_PROJECT_ID> > lib/types/database.types.ts
```

File này sẽ auto-generate TypeScript types từ Supabase schema.

## 4. Setup Google OAuth

### 4.1. Create Google Cloud Project

1. Đăng nhập [console.cloud.google.com](https://console.cloud.google.com)
2. Create new project: `FlavorQuest`
3. Enable APIs: **Google+ API**

### 4.2. Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Name: `FlavorQuest Web Client`
5. Authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback`
   - Production: `https://flavorquest.vercel.app/api/auth/callback`
6. Save **Client ID** và **Client Secret**

### 4.3. Configure Supabase Auth

1. Vào Supabase dashboard → Authentication → Providers
2. Enable **Google** provider
3. Paste **Client ID** và **Client Secret** từ Google Cloud
4. Save

## 5. Environment Variables

Tạo file `.env.local` ở project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Google OAuth (optional - Supabase handles này)
# GOOGLE_CLIENT_ID=your_google_client_id
# GOOGLE_CLIENT_SECRET=your_google_client_secret

# App config
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEFAULT_LANGUAGE=vi
NEXT_PUBLIC_GEOFENCE_RADIUS=20
NEXT_PUBLIC_COOLDOWN_MINUTES=30

# Analytics (optional)
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

Lấy Supabase keys từ dashboard → Settings → API.

## 6. Run Development Server

```bash
npm run dev
# hoặc
pnpm dev
```

Server sẽ start tại: [http://localhost:3000](http://localhost:3000)

## 7. Project Structure Overview

```
flavorquest/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Landing page
│   ├── tour/               # Tour pages
│   ├── admin/              # Admin dashboard (auth required)
│   └── api/                # API routes
├── components/             # React components
│   ├── tour/               # Tour-related components
│   ├── admin/              # Admin components
│   ├── layout/             # Layout components
│   └── ui/                 # Reusable UI components
├── lib/                    # Business logic
│   ├── hooks/              # Custom React hooks
│   ├── services/           # External service integrations
│   ├── utils/              # Utility functions
│   ├── workers/            # Web Workers
│   ├── constants.ts        # App constants
│   └── types.ts            # TypeScript types
├── public/                 # Static assets
├── supabase/               # Supabase migrations & seeds
├── tests/                  # Tests (unit, integration, E2E)
└── docs/                   # Documentation
```

## 8. Key Development Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run format           # Format code với Prettier

# Testing
npm run test             # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:e2e         # Run E2E tests với Playwright

# Database
supabase db reset        # Reset database to migrations
supabase db push         # Push migration changes
supabase gen types typescript # Generate types

# Deployment (manual)
vercel                   # Deploy to Vercel
```

## 9. First Tasks for New Developers

### Task 1: Verify Local Setup

1. Run `npm run dev`
2. Open [http://localhost:3000](http://localhost:3000)
3. Verify landing page loads
4. Check console for errors

### Task 2: Test Tour Flow

1. Click "Bắt đầu tour" button
2. Allow location permission (hoặc mock location)
3. Verify map loads với POI markers
4. Test manual POI selection

### Task 3: Test Admin Dashboard

1. Go to [http://localhost:3000/admin](http://localhost:3000/admin)
2. Click "Sign in with Google"
3. After sign in, manually promote user to admin:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'your-email@gmail.com';
   ```
4. Refresh page, verify admin dashboard accessible
5. Test POI CRUD operations

## 10. Development Workflow

### Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch
- `feature/<feature-name>`: Feature branches
- `hotfix/<bug-name>`: Hotfix branches

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: Add geofencing logic với Web Worker
fix: Resolve GPS drift với noise filter
docs: Update quickstart guide
chore: Upgrade dependencies
```

### Pull Request Process

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes, commit regularly
3. Push to remote: `git push origin feature/my-feature`
4. Open PR to `develop` branch
5. Request code review
6. Address feedback, merge after approval

## 11. Testing Guidelines

### Unit Tests

```typescript
// Example: tests/unit/utils/distance.test.ts
import { haversineDistance } from '@/lib/utils/distance';

describe('haversineDistance', () => {
  it('calculates distance correctly', () => {
    const dist = haversineDistance(10.7535, 106.6963, 10.754, 106.6965);
    expect(dist).toBeCloseTo(60.5, 1); // ~60.5 meters
  });
});
```

Run: `npm run test`

### Integration Tests

```typescript
// Example: tests/integration/tour-flow.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import TourPage from '@/app/tour/page';

describe('Tour Flow', () => {
  it('loads POIs and displays map', async () => {
    render(<TourPage />);
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
  });
});
```

Run: `npm run test`

### E2E Tests

```typescript
// Example: tests/e2e/user-journey.spec.ts
import { test, expect } from '@playwright/test';

test('complete user journey', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.click('text=Bắt đầu tour');
  await page.waitForSelector('[data-testid="map-container"]');
  // ... more assertions
});
```

Run: `npm run test:e2e`

## 12. Common Issues & Solutions

### Issue: Service Worker không update

**Solution**:

- Hard refresh: `Ctrl+Shift+R` (Windows) hoặc `Cmd+Shift+R` (Mac)
- Unregister SW trong DevTools → Application → Service Workers → Unregister

### Issue: Supabase connection error

**Solution**:

- Verify `.env.local` có đúng credentials
- Check Supabase project status (không bị paused)
- Test connection: `curl https://YOUR_PROJECT_ID.supabase.co/rest/v1/pois`

### Issue: Geolocation không hoạt động

**Solution**:

- Chrome: Settings → Site Settings → Location → Allow localhost
- Firefox: about:config → `geo.enabled` = true
- Hoặc mock location trong DevTools → Sensors

### Issue: Audio không phát (autoplay blocked)

**Solution**:

- Browser policy requires user gesture trước khi phát audio
- Ensure "Start Tour" button click unlocks audio context
- Test với muted autoplay: `audio.muted = true; await audio.play();`

## 13. Resources

- **Documentation**: [docs/](docs/)
- **Specification**: [specs/main/spec.md](specs/main/spec.md)
- **Technical Plan**: [specs/main/plan.md](specs/main/plan.md)
- **Data Model**: [specs/main/data-model.md](specs/main/data-model.md)
- **API Contracts**: [specs/main/contracts/](specs/main/contracts/)

### External Resources

- [Next.js 16 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Leaflet Docs](https://leafletjs.com/reference.html)
- [Web Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

## 14. Getting Help

- **Slack**: #flavorquest-dev channel
- **GitHub Issues**: Tag với `question` label
- **Code Review**: Request review từ @tech-lead
- **Documentation**: Check [docs/](docs/) trước khi hỏi

## Next Steps

✅ Setup complete! Bây giờ bạn có thể:

1. Explore codebase
2. Pick up tasks từ GitHub Issues
3. Contribute code qua Pull Requests
4. Update documentation khi cần

Happy coding! 🍜✨

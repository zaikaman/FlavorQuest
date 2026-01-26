# Migration Instructions - Chạy trong Supabase Dashboard

## Bước 1: Truy cập SQL Editor

1. Mở Supabase Dashboard: https://supabase.com/dashboard/project/lvmtwqgvlgngnegoaxam
2. Click vào **SQL Editor** trong sidebar bên trái
3. Click **New query** để tạo query mới

## Bước 2: Chạy Migration 001 - POIs Table

1. Copy toàn bộ nội dung file `supabase/migrations/001_create_pois.sql`
2. Paste vào SQL Editor
3. Click **Run** (hoặc Ctrl+Enter)
4. Verify kết quả: Nên thấy "Success. No rows returned"

## Bước 3: Chạy Migration 002 - Analytics Table

1. Click **New query** để tạo query mới
2. Copy toàn bộ nội dung file `supabase/migrations/002_create_analytics.sql`
3. Paste vào SQL Editor
4. Click **Run**
5. Verify kết quả: Nên thấy "Success. No rows returned"

## Bước 4: Chạy Migration 003 - Users Table

1. Click **New query** để tạo query mới
2. Copy toàn bộ nội dung file `supabase/migrations/003_create_users.sql`
3. Paste vào SQL Editor
4. Click **Run**
5. Verify kết quả: Nên thấy "Success. No rows returned"

## Bước 5: Verify Tables

1. Trong SQL Editor, chạy query sau để kiểm tra:

```sql
-- Check tables created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('pois', 'analytics_logs', 'users')
ORDER BY table_name;

-- Check RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('pois', 'analytics_logs', 'users');

-- Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('pois', 'analytics_logs', 'users')
ORDER BY tablename, indexname;
```

2. Expected results:
   - 3 tables: `analytics_logs`, `pois`, `users`
   - All tables should have `rowsecurity = true`
   - Multiple indexes per table

## Bước 6: Test RLS Policies

```sql
-- Test POI public read (should work without auth)
SET ROLE anon;
SELECT COUNT(*) FROM pois WHERE deleted_at IS NULL;
RESET ROLE;

-- Test analytics insert (should work without auth)
SET ROLE anon;
INSERT INTO analytics_logs (session_id, event_type) 
VALUES (uuid_generate_v4(), 'tour_start');
RESET ROLE;

-- Verify insert worked
SELECT event_type, COUNT(*) FROM analytics_logs GROUP BY event_type;
```

## Troubleshooting

### Lỗi "extension uuid-ossp does not exist"
```sql
-- Run this first:
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Lỗi "relation auth.users does not exist"
- Đảm bảo bạn đã enable Authentication trong Supabase Dashboard
- Go to: Authentication → Settings → Enable

### Lỗi "function update_updated_at_column already exists"
- Ignore warning này, migration sẽ vẫn chạy OK
- Hoặc drop function trước: `DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;`

## Next Steps

Sau khi chạy xong migrations:
1. ✅ Verify tables created
2. ✅ Verify RLS policies active
3. ⏭️ Continue to T017: Create seed data
4. ⏭️ Continue to T018: Setup storage buckets

---

**Status**: Ready to run migrations  
**Project**: lvmtwqgvlgngnegoaxam  
**Estimated time**: 2-3 minutes

-- Migration: 014_add_owner_request_status
-- Description: Theo dõi yêu cầu owner trực tiếp trên bảng users
-- Created: 2026-03-15

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS owner_request_status VARCHAR(16)
  CHECK (owner_request_status IN ('pending', 'approved', 'rejected'));

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS owner_requested_at TIMESTAMPTZ;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS owner_reviewed_at TIMESTAMPTZ;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS owner_reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_owner_request_pending
  ON users(owner_requested_at DESC)
  WHERE owner_request_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_users_owner_request_status
  ON users(owner_request_status)
  WHERE owner_request_status IS NOT NULL;

COMMENT ON COLUMN users.owner_request_status IS 'Trạng thái yêu cầu mở quyền owner: pending, approved, rejected hoặc null';
COMMENT ON COLUMN users.owner_requested_at IS 'Thời điểm user gần nhất gửi yêu cầu mở quyền owner';
COMMENT ON COLUMN users.owner_reviewed_at IS 'Thời điểm admin gần nhất duyệt hoặc từ chối yêu cầu owner';
COMMENT ON COLUMN users.owner_reviewed_by IS 'Admin đã duyệt hoặc từ chối yêu cầu owner';

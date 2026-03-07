-- Migration: 005_customer_access_payments
-- Description: Paywall thanh toán vĩnh viễn cho khách hàng bằng payOS
-- Created: 2026-03-07

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS customer_access_granted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS customer_access_granted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_access_payment_order_code BIGINT,
  ADD COLUMN IF NOT EXISTS customer_access_payment_link_id TEXT;

CREATE INDEX IF NOT EXISTS idx_users_customer_access_granted
  ON users(customer_access_granted)
  WHERE customer_access_granted = TRUE;

CREATE TABLE IF NOT EXISTS customer_access_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_code BIGINT NOT NULL UNIQUE,
  payment_link_id TEXT UNIQUE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'PROCESSING', 'PAID', 'CANCELLED', 'EXPIRED', 'FAILED', 'UNDERPAID')),
  checkout_url TEXT,
  qr_code TEXT,
  description TEXT NOT NULL,
  return_query JSONB,
  raw_payment_data JSONB,
  webhook_payload JSONB,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_access_payments_user_id
  ON customer_access_payments(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_access_payments_status
  ON customer_access_payments(status, created_at DESC);

CREATE TRIGGER update_customer_access_payments_updated_at
  BEFORE UPDATE ON customer_access_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE customer_access_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own access payments"
  ON customer_access_payments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert access payments"
  ON customer_access_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own access payments"
  ON customer_access_payments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE customer_access_payments IS 'Lưu lịch sử thanh toán mở khóa vĩnh viễn cho khách hàng';
COMMENT ON COLUMN users.customer_access_granted IS 'Khách hàng đã thanh toán mở khóa app vĩnh viễn hay chưa';
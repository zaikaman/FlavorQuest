-- Migration: 009_add_performance_indexes
-- Description: Add database indexes for hot analytics, admin timeline, orders, and payments queries
-- Created: 2026-03-15

-- ============================================
-- Analytics
-- ============================================

-- Per-tour analytics filters frequently combine metadata->tour_id with timestamp ranges.
CREATE INDEX IF NOT EXISTS idx_analytics_tour_id_timestamp
  ON public.analytics_logs ((metadata->>'tour_id'), timestamp DESC)
  WHERE metadata ? 'tour_id';

-- Session analytics builds duration and sequence data by walking logs per session over time.
CREATE INDEX IF NOT EXISTS idx_analytics_session_timestamp
  ON public.analytics_logs (session_id, timestamp DESC);

-- Event and language dashboards slice by time repeatedly.
CREATE INDEX IF NOT EXISTS idx_analytics_event_timestamp
  ON public.analytics_logs (event_type, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_language_timestamp
  ON public.analytics_logs (language, timestamp DESC)
  WHERE language IS NOT NULL;

-- ============================================
-- Users and Access Payments
-- ============================================

-- Admin analytics builds user growth timelines by created_at and unlock timelines by granted_at.
CREATE INDEX IF NOT EXISTS idx_users_created_at
  ON public.users (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_customer_access_granted_at
  ON public.users (customer_access_granted_at DESC)
  WHERE customer_access_granted = TRUE
    AND customer_access_granted_at IS NOT NULL;

-- Revenue dashboards repeatedly filter successful payments by paid_at.
CREATE INDEX IF NOT EXISTS idx_customer_access_payments_paid_at
  ON public.customer_access_payments (paid_at DESC)
  WHERE status = 'PAID'
    AND paid_at IS NOT NULL;

-- Helps admin timeline scans that sort all payments by created_at and then examine status.
CREATE INDEX IF NOT EXISTS idx_customer_access_payments_created_status
  ON public.customer_access_payments (created_at DESC, status);

-- ============================================
-- Orders and Notifications
-- ============================================

-- Customer and owner order views sort by recency after filtering by customer or POI.
CREATE INDEX IF NOT EXISTS idx_preorder_orders_customer_created_at
  ON public.preorder_orders (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_preorder_orders_poi_created_at
  ON public.preorder_orders (poi_id, created_at DESC);

-- Owner-side menu screens load dishes by POI and availability.
CREATE INDEX IF NOT EXISTS idx_dishes_poi_available_created_at
  ON public.dishes (poi_id, is_available, created_at ASC)
  WHERE deleted_at IS NULL;

-- Notification center reads recent notifications and updates unread rows for a user.
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created_at
  ON public.notifications (user_id, read_at, created_at DESC);

-- Migration: 011_drop_customer_access_paywall
-- Description: Remove deprecated customer paywall table and related columns.

DROP TABLE IF EXISTS public.customer_access_payments;

DROP INDEX IF EXISTS public.idx_customer_access_payments_user_id;
DROP INDEX IF EXISTS public.idx_customer_access_payments_status;
DROP INDEX IF EXISTS public.idx_customer_access_payments_paid_at;
DROP INDEX IF EXISTS public.idx_customer_access_payments_created_status;
DROP INDEX IF EXISTS public.idx_users_customer_access_granted;
DROP INDEX IF EXISTS public.idx_users_customer_access_granted_at;

ALTER TABLE public.users
  DROP COLUMN IF EXISTS customer_access_granted,
  DROP COLUMN IF EXISTS customer_access_granted_at,
  DROP COLUMN IF EXISTS customer_access_payment_order_code,
  DROP COLUMN IF EXISTS customer_access_payment_link_id;

-- Migration: 010_remove_customer_paywall
-- Description: Remove customer paywall requirement and grant tour access by default.

UPDATE public.users
SET customer_access_granted = TRUE,
    customer_access_granted_at = COALESCE(customer_access_granted_at, NOW())
WHERE role = 'customer'
  AND customer_access_granted = FALSE;

ALTER TABLE public.users
  ALTER COLUMN customer_access_granted SET DEFAULT TRUE;

COMMENT ON COLUMN public.users.customer_access_granted IS 'Deprecated paywall flag. Customer access is always granted.';
COMMENT ON COLUMN public.users.customer_access_granted_at IS 'Timestamp when access was granted automatically after paywall removal.';

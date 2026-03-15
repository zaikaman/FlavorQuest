ALTER TABLE public.preorder_orders
  ADD COLUMN IF NOT EXISTS order_type VARCHAR(16) NOT NULL DEFAULT 'pickup',
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS delivery_time TIMESTAMPTZ;

ALTER TABLE public.preorder_orders
  DROP CONSTRAINT IF EXISTS preorder_orders_order_type_check;

ALTER TABLE public.preorder_orders
  ADD CONSTRAINT preorder_orders_order_type_check
  CHECK (order_type IN ('pickup', 'delivery'));

ALTER TABLE public.preorder_orders
  DROP CONSTRAINT IF EXISTS preorder_orders_status_check;

ALTER TABLE public.preorder_orders
  ADD CONSTRAINT preorder_orders_status_check
  CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled'));

ALTER TABLE public.preorder_orders
  DROP CONSTRAINT IF EXISTS preorder_orders_delivery_time_future_check;

ALTER TABLE public.preorder_orders
  ADD CONSTRAINT preorder_orders_delivery_time_future_check
  CHECK (delivery_time IS NULL OR delivery_time > NOW()) NOT VALID;

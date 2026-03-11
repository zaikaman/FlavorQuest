ALTER TABLE preorder_orders
  DROP CONSTRAINT IF EXISTS preorder_orders_pickup_time_future_check;

ALTER TABLE preorder_orders
  ADD CONSTRAINT preorder_orders_pickup_time_future_check
  CHECK (pickup_time IS NULL OR pickup_time > NOW()) NOT VALID;
-- Migration: 004_owner_customer_ordering
-- Description: Bổ sung vai trò customer/owner, menu món ăn, đặt món trước và thông báo
-- Created: 2026-03-04

-- ============================================
-- Users role nâng cấp: user -> customer
-- ============================================

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ALTER COLUMN role SET DEFAULT 'customer';

UPDATE users
SET role = 'customer'
WHERE role = 'user';

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('customer', 'owner', 'admin'));

CREATE INDEX IF NOT EXISTS idx_users_role_owner ON users(role) WHERE role = 'owner';
CREATE INDEX IF NOT EXISTS idx_users_role_customer ON users(role) WHERE role = 'customer';

COMMENT ON COLUMN users.role IS 'Vai trò người dùng: customer, owner, admin';

-- Đồng bộ trigger tạo user mặc định từ auth.users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, 'customer')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Giữ tương thích hàm cũ nhưng đổi semantics sang customer
CREATE OR REPLACE FUNCTION demote_to_user(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  target_user_id UUID;
BEGIN
  IF NOT current_user_is_admin() THEN
    RAISE EXCEPTION 'Only admins can demote users';
  END IF;

  SELECT id INTO target_user_id
  FROM users
  WHERE email = user_email;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: %', user_email;
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot demote yourself';
  END IF;

  UPDATE users
  SET role = 'customer', updated_at = NOW()
  WHERE id = target_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- POI ownership
-- ============================================

ALTER TABLE pois
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pois_owner_id ON pois(owner_id) WHERE owner_id IS NOT NULL;

COMMENT ON COLUMN pois.owner_id IS 'Chủ quán sở hữu POI (users.id, role=owner)';

-- ============================================
-- Dishes (menu món ăn theo POI)
-- ============================================

CREATE TABLE IF NOT EXISTS dishes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poi_id UUID NOT NULL REFERENCES pois(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dishes_poi_id ON dishes(poi_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dishes_available ON dishes(is_available) WHERE deleted_at IS NULL;

CREATE TRIGGER update_dishes_updated_at
  BEFORE UPDATE ON dishes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dishes are publicly readable"
  ON dishes
  FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can insert dishes"
  ON dishes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update dishes"
  ON dishes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete dishes"
  ON dishes
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- Pre-order (đặt món trước khi tới quán)
-- ============================================

CREATE TABLE IF NOT EXISTS preorder_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poi_id UUID NOT NULL REFERENCES pois(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_name TEXT,
  customer_phone TEXT,
  note TEXT,
  pickup_time TIMESTAMPTZ,
  status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'cancelled')),
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS preorder_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES preorder_orders(id) ON DELETE CASCADE,
  dish_id UUID NOT NULL REFERENCES dishes(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON preorder_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_poi_id ON preorder_orders(poi_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON preorder_orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON preorder_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON preorder_order_items(order_id);

CREATE TRIGGER update_preorder_orders_updated_at
  BEFORE UPDATE ON preorder_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE preorder_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE preorder_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read orders"
  ON preorder_orders
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create orders"
  ON preorder_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update orders"
  ON preorder_orders
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read order items"
  ON preorder_order_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create order items"
  ON preorder_order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update order items"
  ON preorder_order_items
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Notifications (in-app)
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES preorder_orders(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'order_update' CHECK (type IN ('order_created', 'order_update', 'system')),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- Helper functions
-- ============================================

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
  SELECT role::text
  FROM users
  WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION current_user_role IS 'Trả về role của người dùng hiện tại';
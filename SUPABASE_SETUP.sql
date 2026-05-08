-- ============================================================
-- TARZI SUPABASE SETUP — Run this in Supabase SQL Editor
-- Connects customer app + tailor app to the same backend
-- ============================================================

-- ── 1. ADD ROLE TO PROFILES ──────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer'
  CHECK (role IN ('customer', 'tailor', 'admin'));

-- ── 2. ADD TAILOR FIELDS TO ORDERS ───────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tailor_price  DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tailor_note   TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS decline_reason TEXT;

-- ── 3. ADD SENDER INFO TO CHAT_MESSAGES ──────────────────────
-- sender_type distinguishes 'customer' vs 'tailor' messages
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS sender_type TEXT DEFAULT 'customer'
  CHECK (sender_type IN ('customer', 'tailor'));
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS sender_name TEXT;

-- ── 4. ENABLE ROW-LEVEL SECURITY ─────────────────────────────

-- PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_own" ON profiles;
CREATE POLICY "profiles_own" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Allow read-only access to other profiles (for customer details in tailor app)
DROP POLICY IF EXISTS "profiles_read_others" ON profiles;
CREATE POLICY "profiles_read_others" ON profiles
  FOR SELECT USING (true);

-- ORDERS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "orders_customer_own" ON orders;
DROP POLICY IF EXISTS "orders_tailor_see_pending_and_own" ON orders;
DROP POLICY IF EXISTS "orders_tailor_update" ON orders;
DROP POLICY IF EXISTS "orders_tailor_accept" ON orders;

-- Customers: full access to their own orders
CREATE POLICY "orders_customer_own" ON orders
  FOR ALL USING (auth.uid() = user_id);

-- Tailors: SELECT all pending (unclaimed) orders + their own accepted orders
CREATE POLICY "orders_tailor_see_pending_and_own" ON orders
  FOR SELECT USING (
    (status = 'pending' AND tailor_id IS NULL)
    OR tailor_id = auth.uid()
    OR user_id = auth.uid()
  );

-- Tailors: UPDATE orders they own OR are accepting (pending + unclaimed)
CREATE POLICY "orders_tailor_update" ON orders
  FOR UPDATE USING (
    tailor_id = auth.uid()
    OR (tailor_id IS NULL AND status = 'pending')
  );

-- CHAT_MESSAGES
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_parties_access" ON chat_messages;
CREATE POLICY "chat_parties_access" ON chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = chat_messages.order_id
        AND (
          orders.user_id = auth.uid()
          OR orders.tailor_id = auth.uid()
        )
    )
  );

-- MEASUREMENTS
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "measurements_own" ON measurements;
CREATE POLICY "measurements_own" ON measurements
  FOR ALL USING (auth.uid() = user_id);

-- Allow tailors to READ measurements for orders they're assigned to
DROP POLICY IF EXISTS "measurements_tailor_read" ON measurements;
CREATE POLICY "measurements_tailor_read" ON measurements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.measurement_id = measurements.id
        AND orders.tailor_id = auth.uid()
    )
  );

-- ── 5. ENABLE REALTIME ────────────────────────────────────────
-- This makes order status changes and chat messages appear live in both apps

ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- ── 6. SET UP TAILOR ACCOUNTS ────────────────────────────────
-- After a tailor signs up via /signup in the tailor app,
-- update their role to 'tailor' if not set automatically:
--
-- UPDATE profiles SET role = 'tailor' WHERE id = 'paste-user-uuid-here';
--
-- Or for your own account (admin):
-- UPDATE profiles SET role = 'admin' WHERE id = 'paste-your-uuid-here';

-- ── 7. STORAGE: garment-images BUCKET ────────────────────────
-- Make sure bucket exists and is public for image display.
-- In Supabase dashboard → Storage → garment-images → Make Public
-- Or run:
INSERT INTO storage.buckets (id, name, public)
  VALUES ('garment-images', 'garment-images', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies
DROP POLICY IF EXISTS "images_auth_upload" ON storage.objects;
CREATE POLICY "images_auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'garment-images' AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "images_public_read" ON storage.objects;
CREATE POLICY "images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'garment-images');

-- ── DONE ─────────────────────────────────────────────────────
-- Both apps now share the same:
--   ✅ auth (profiles table with role field)
--   ✅ orders (customer creates, tailor accepts/updates)
--   ✅ chat_messages (real-time, both sides)
--   ✅ measurements (customer creates, tailor reads)
--   ✅ storage (garment images)

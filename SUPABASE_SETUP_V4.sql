-- ══════════════════════════════════════════════════════════════════════════════
-- SUPABASE SETUP V4 — Comprehensive schema (run in Supabase SQL Editor)
-- Run this AFTER V2 and V3. Safe to re-run — uses IF NOT EXISTS everywhere.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. PROFILES — add ALL columns needed ──────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS shop_name            text,
  ADD COLUMN IF NOT EXISTS shop_address         text,
  ADD COLUMN IF NOT EXISTS permit_url           text,
  ADD COLUMN IF NOT EXISTS languages            text[],
  ADD COLUMN IF NOT EXISTS availability         text,
  ADD COLUMN IF NOT EXISTS bio                  text,
  ADD COLUMN IF NOT EXISTS specialty            text,
  ADD COLUMN IF NOT EXISTS years_exp            integer,
  ADD COLUMN IF NOT EXISTS city                 text,
  ADD COLUMN IF NOT EXISTS area                 text,
  ADD COLUMN IF NOT EXISTS preferred_language   text DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS specialties          text[],
  ADD COLUMN IF NOT EXISTS onboarding_complete  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_approved          boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb
    DEFAULT '{"orders":true,"messages":true,"promos":false,"news":false}'::jsonb,
  ADD COLUMN IF NOT EXISTS google_reviews_url   text,
  ADD COLUMN IF NOT EXISTS phone                text;

-- ── 2. PROFILES — RLS ─────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are publicly viewable"  ON public.profiles;
CREATE POLICY "Profiles are publicly viewable"
  ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ── 3. MEASUREMENTS TABLE ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.measurements (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name           text        NOT NULL,
  gender         text        NOT NULL DEFAULT 'female',
  chest          numeric,
  waist          numeric,
  hips           numeric,
  shoulder_width numeric,
  arm_length     numeric,
  neck           numeric,
  inseam         numeric,
  thigh          numeric,
  height         numeric,
  weight         numeric,
  notes          text,
  unit           text        NOT NULL DEFAULT 'cm',
  is_default     boolean     NOT NULL DEFAULT false,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own measurements" ON public.measurements;
CREATE POLICY "Users manage own measurements"
  ON public.measurements FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 4. SAVED TAILORS TABLE ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.saved_tailors (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tailor_id  uuid        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tailor_id)
);

ALTER TABLE public.saved_tailors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own saved tailors" ON public.saved_tailors;
CREATE POLICY "Users manage own saved tailors"
  ON public.saved_tailors FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 5. ORDERS TABLE — add missing columns ─────────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_number   text,
  ADD COLUMN IF NOT EXISTS tailor_name    text,
  ADD COLUMN IF NOT EXISTS tailor_note    text,
  ADD COLUMN IF NOT EXISTS tailor_price   numeric,
  ADD COLUMN IF NOT EXISTS decline_reason text;

-- Expand status constraint to include new values
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check CHECK (
    status IN (
      'pending','confirmed','in_progress','ready',
      'delivered','cancelled','accepted','declined'
    )
  );

-- ── 6. ORDERS — RLS ───────────────────────────────────────────────────────────
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Order participants can view" ON public.orders;
CREATE POLICY "Order participants can view"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = tailor_id);

DROP POLICY IF EXISTS "Customers insert orders" ON public.orders;
CREATE POLICY "Customers insert orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Order participants can update" ON public.orders;
CREATE POLICY "Order participants can update"
  ON public.orders FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = tailor_id);

-- ── 7. NOTIFICATIONS TABLE ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  order_id   uuid        REFERENCES public.orders(id)   ON DELETE CASCADE,
  type       text        NOT NULL,
  title      text        NOT NULL,
  message    text        NOT NULL,
  is_read    boolean     NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated insert notifications" ON public.notifications;
CREATE POLICY "Authenticated insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- ── 8. TAILOR PORTFOLIO TABLE ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tailor_portfolio (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tailor_id  uuid        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  image_url  text        NOT NULL,
  caption    text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.tailor_portfolio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view portfolio" ON public.tailor_portfolio;
CREATE POLICY "Public view portfolio"
  ON public.tailor_portfolio FOR SELECT USING (true);

DROP POLICY IF EXISTS "Tailor manage own portfolio" ON public.tailor_portfolio;
CREATE POLICY "Tailor manage own portfolio"
  ON public.tailor_portfolio FOR ALL
  USING  (auth.uid() = tailor_id)
  WITH CHECK (auth.uid() = tailor_id);

-- ── 9. CHAT MESSAGES TABLE ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid        REFERENCES public.orders(id)   ON DELETE CASCADE NOT NULL,
  sender_id   uuid        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  sender_type text        NOT NULL CHECK (sender_type IN ('customer','tailor')),
  sender_name text,
  message     text        NOT NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Order participants read chat" ON public.chat_messages;
CREATE POLICY "Order participants read chat"
  ON public.chat_messages FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id   FROM public.orders WHERE id = order_id
      UNION ALL
      SELECT tailor_id FROM public.orders WHERE id = order_id AND tailor_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Authenticated send messages" ON public.chat_messages;
CREATE POLICY "Authenticated send messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- ── 10. TAILOR REVIEWS TABLE ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tailor_reviews (
  id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  tailor_id  uuid    REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user_id    uuid    REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user_name  text,
  rating     integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment    text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.tailor_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view reviews" ON public.tailor_reviews;
CREATE POLICY "Public view reviews"
  ON public.tailor_reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated insert review" ON public.tailor_reviews;
CREATE POLICY "Authenticated insert review"
  ON public.tailor_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── 11. USER ADDRESSES TABLE ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  label      text        NOT NULL DEFAULT 'home',
  full_name  text,
  phone      text,
  city       text        DEFAULT 'Dubai',
  area       text,
  street     text,
  is_default boolean     DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own addresses" ON public.user_addresses;
CREATE POLICY "Users manage own addresses"
  ON public.user_addresses FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 12. REALTIME ──────────────────────────────────────────────────────────────
-- Enable realtime for key tables (run separately if publication already exists)
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tailor_portfolio;

-- ── 13. STORAGE BUCKETS ───────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
  VALUES ('garment-images',   'garment-images',   true)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('tailor-portfolio', 'tailor-portfolio', true)
  ON CONFLICT (id) DO NOTHING;

-- Storage policies — garment-images
DROP POLICY IF EXISTS "Public read garment-images"       ON storage.objects;
CREATE POLICY "Public read garment-images"
  ON storage.objects FOR SELECT USING (bucket_id = 'garment-images');

DROP POLICY IF EXISTS "Auth upload garment-images"       ON storage.objects;
CREATE POLICY "Auth upload garment-images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'garment-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth update garment-images"       ON storage.objects;
CREATE POLICY "Auth update garment-images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'garment-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth delete garment-images"       ON storage.objects;
CREATE POLICY "Auth delete garment-images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'garment-images' AND auth.role() = 'authenticated');

-- Storage policies — tailor-portfolio
DROP POLICY IF EXISTS "Public read tailor-portfolio"     ON storage.objects;
CREATE POLICY "Public read tailor-portfolio"
  ON storage.objects FOR SELECT USING (bucket_id = 'tailor-portfolio');

DROP POLICY IF EXISTS "Auth upload tailor-portfolio"     ON storage.objects;
CREATE POLICY "Auth upload tailor-portfolio"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'tailor-portfolio' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth delete tailor-portfolio"     ON storage.objects;
CREATE POLICY "Auth delete tailor-portfolio"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'tailor-portfolio' AND auth.role() = 'authenticated');

-- ── 14. APPROVE EXISTING TAILORS (one-time migration) ────────────────────────
-- If you have tailors who already completed onboarding before the approval
-- system was added, approve them now so they remain visible to customers.
UPDATE public.profiles
  SET is_approved = true
  WHERE role = 'tailor' AND onboarding_complete = true AND is_approved = false;

-- ══════════════════════════════════════════════════════════════════════════════
-- DONE. Verify in Table Editor that all tables exist with the correct columns.
-- ══════════════════════════════════════════════════════════════════════════════

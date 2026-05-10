-- ============================================================
-- TARZI SUPABASE SETUP V3
-- Notifications + Order flow fixes
-- Safe to re-run (all idempotent)
-- ============================================================

-- ============================================================
-- SECTION 1: Create notifications table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  order_id    uuid REFERENCES public.orders(id)   ON DELETE CASCADE,
  type        text NOT NULL,   -- 'new_order' | 'order_accepted' | 'order_declined' | 'status_update'
  title       text NOT NULL,
  message     text NOT NULL,
  is_read     boolean NOT NULL DEFAULT false,
  created_at  timestamptz      DEFAULT now()
);

-- ============================================================
-- SECTION 2: RLS for notifications
-- ============================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
DO $$ BEGIN
  CREATE POLICY "Users read own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Authenticated users can insert notifications (needed for cross-user notify)
DO $$ BEGIN
  CREATE POLICY "Authenticated users insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can update (mark read) their own notifications
DO $$ BEGIN
  CREATE POLICY "Users update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- SECTION 3: Realtime for notifications
-- ============================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- SECTION 4: Ensure orders table has all needed columns
-- ============================================================
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tailor_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tailor_note text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tailor_price numeric;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS decline_reason text;

-- ============================================================
-- SECTION 5: Update order status constraint to allow all statuses
-- The safest approach: drop the old check and add a broader one.
-- If the constraint doesn't exist, the DO block silently skips.
-- ============================================================
DO $$ BEGIN
  ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
    CHECK (status IN (
      'pending',
      'confirmed',
      'in_progress',
      'ready',
      'delivered',
      'cancelled',
      'accepted',
      'declined'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

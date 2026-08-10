-- ══════════════════════════════════════════════════════════════════════════════
-- SUPABASE SETUP V5 — Per-tailor pricing + admin approval columns
-- Run this AFTER V4 (run in Supabase SQL Editor). Safe to re-run — idempotent.
--
-- Fixes:
--  1. tailor_services table was referenced by onboarding/admin/booking code but
--     never created — this is why per-tailor pricing always fell back to the
--     hardcoded global default.
--  2. profiles.approval_status / approval_notes were used by the admin page and
--     the tailor home screen banner but never added to the schema — approvals
--     were not being persisted correctly.
--  3. orders.tailor_name had a NOT NULL constraint from the original schema.sql,
--     but the customer app inserts NULL when no specific tailor is chosen —
--     this was silently breaking checkout for any order without a pre-selected
--     tailor. Relaxed here to match the app code.
--  4. Adds a trigger so only an admin can change approval_status / is_approved /
--     approval_notes — previously any authenticated user could self-approve by
--     calling the profiles update API directly (RLS only checked auth.uid()=id).
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. TAILOR SERVICES TABLE (per-tailor, per-service pricing) ─────────────────
CREATE TABLE IF NOT EXISTS public.tailor_services (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tailor_id    uuid        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  service_type text        NOT NULL CHECK (service_type IN ('alterations', 'from_scratch', 'upcycling')),
  price_from   numeric     NOT NULL,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(tailor_id, service_type)
);

ALTER TABLE public.tailor_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view tailor services" ON public.tailor_services;
CREATE POLICY "Public view tailor services"
  ON public.tailor_services FOR SELECT USING (true);

DROP POLICY IF EXISTS "Tailor manage own services" ON public.tailor_services;
CREATE POLICY "Tailor manage own services"
  ON public.tailor_services FOR ALL
  USING  (auth.uid() = tailor_id)
  WITH CHECK (auth.uid() = tailor_id);

-- ── 2. PROFILES — approval workflow columns ─────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected', 'needs_info')),
  ADD COLUMN IF NOT EXISTS approval_notes text;

-- Backfill: tailors already marked is_approved = true (e.g. via the V4 one-time
-- migration) should show as 'approved', not the new default 'pending'.
UPDATE public.profiles
  SET approval_status = 'approved'
  WHERE role = 'tailor' AND is_approved = true AND approval_status = 'pending';

-- ── 3. ORDERS — tailor_name must be nullable (checkout inserts NULL when no
--     specific tailor is picked; the original schema had this NOT NULL) ────────
ALTER TABLE public.orders ALTER COLUMN tailor_name DROP NOT NULL;

-- ── 4. Admin-only enforcement for approval columns ──────────────────────────────
CREATE OR REPLACE FUNCTION public.prevent_non_admin_approval_change()
RETURNS trigger AS $$
BEGIN
  IF (NEW.approval_status IS DISTINCT FROM OLD.approval_status
      OR NEW.is_approved IS DISTINCT FROM OLD.is_approved
      OR NEW.approval_notes IS DISTINCT FROM OLD.approval_notes) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Only admins can change approval status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS enforce_admin_only_approval ON public.profiles;
CREATE TRIGGER enforce_admin_only_approval
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_non_admin_approval_change();

-- ══════════════════════════════════════════════════════════════════════════════
-- DONE. Verify: tailor_services table exists, profiles has approval_status /
-- approval_notes columns, and orders.tailor_name allows NULL.
-- ══════════════════════════════════════════════════════════════════════════════

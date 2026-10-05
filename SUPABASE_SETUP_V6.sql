-- ══════════════════════════════════════════════════════════════════════════════
-- SUPABASE SETUP V6 — Close role self-escalation vulnerability
-- Run this AFTER V5 (run in Supabase SQL Editor). Safe to re-run — idempotent.
--
-- Security audit finding (2026-09-30):
--   The "profiles" table RLS UPDATE policy only checks `auth.uid() = id` with
--   no column-level restriction. Any authenticated user (customer or tailor,
--   in either app, since both share this Supabase project) could run:
--
--     supabase.from('profiles').update({ role: 'admin' }).eq('id', myId})
--
--   directly from the browser console and grant themselves the admin role,
--   then access /admin in tarzi-tailor to approve themselves and any other
--   tailor. V5 already added a trigger protecting approval_status /
--   is_approved / approval_notes from non-admins, but it did NOT cover the
--   `role` column itself, which was the actual root of the privilege escalation.
--
-- Fix: a trigger that blocks any INSERT/UPDATE from setting role = 'admin'
-- unless the requesting user (auth.uid()) already has role = 'admin'.
-- Self-service transitions the app code relies on (new profile defaulting to
-- 'customer', tailor signup/onboarding upserting role = 'tailor') are left
-- untouched — only granting 'admin' is restricted.
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS trigger AS $$
BEGIN
  IF NEW.role = 'admin' AND (OLD IS NULL OR OLD.role IS DISTINCT FROM 'admin') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Only an existing admin can grant the admin role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS enforce_admin_role_grant ON public.profiles;
CREATE TRIGGER enforce_admin_role_grant
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();

-- ══════════════════════════════════════════════════════════════════════════════
-- DONE. Verify: as a non-admin user, running
--   update profiles set role = 'admin' where id = auth.uid();
-- from the Supabase SQL editor "run as" a specific user, or via the browser
-- console while logged in as a customer/tailor, must now raise:
--   "Only an existing admin can grant the admin role"
--
-- BOOTSTRAPPING THE FIRST ADMIN:
--   The SQL editor runs with no logged-in user, so auth.uid() is NULL there —
--   the trigger fires for editor queries too (RLS is bypassed for the SQL
--   editor's role, but triggers are a separate mechanism and are NOT
--   bypassed). To set your first admin, disable the trigger for that one
--   statement, then re-enable it immediately:
--
--     ALTER TABLE profiles DISABLE TRIGGER enforce_admin_role_grant;
--     UPDATE profiles SET role = 'admin' WHERE id = 'paste-uuid-here';
--     ALTER TABLE profiles ENABLE TRIGGER enforce_admin_role_grant;
--
--   Do not skip the ENABLE step — leaving it disabled reopens the
--   vulnerability this migration exists to close.
-- ══════════════════════════════════════════════════════════════════════════════

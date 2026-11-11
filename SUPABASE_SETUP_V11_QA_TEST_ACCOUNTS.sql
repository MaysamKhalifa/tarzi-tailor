-- ══════════════════════════════════════════════════════════════════════════════
-- SUPABASE SETUP V11 — Create pre-confirmed QA test accounts (run in SQL Editor)
--
-- WHY: Supabase Auth is currently failing to send confirmation emails for any
-- new signup (confirmed via direct API test: 500 "Error sending confirmation
-- email", and the user is NOT created at all — full rollback). This traces to
-- an incomplete migration from Supabase's built-in mailer to a custom Resend
-- SMTP setup. It blocks creating brand-new test accounts through the normal
-- signup UI for end-to-end QA.
--
-- This script creates two fully email-confirmed accounts directly in
-- auth.users / auth.identities (bypassing email delivery entirely), then seeds
-- a matching public.profiles row for each — exactly the state a real signup
-- would leave behind. Idempotent: safe to re-run, it skips any email that
-- already exists. The tailor account is left BEFORE onboarding (onboarding_
-- complete=false, is_approved=false) so the real onboarding + admin-approval
-- flow can still be tested live through the UI.
--
-- Login credentials for QA:
--   Tailor:   qa.tailor.final@tarzi.test   / <SET_PASSWORD_HERE>
--   Customer: qa.customer.final@tarzi.test / <SET_PASSWORD_HERE>
--
-- SECURITY: replace <SET_PASSWORD_HERE> below with a freshly generated
-- password before running this script. Never commit a real password to
-- this file or any other.
--
-- Safe to delete these accounts afterward with:
--   DELETE FROM auth.users WHERE email IN ('qa.tailor.final@tarzi.test','qa.customer.final@tarzi.test');
--   (public.profiles rows cascade-delete if the FK is ON DELETE CASCADE; otherwise
--    delete them manually by the same ids first.)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  tailor_id uuid := gen_random_uuid();
  customer_id uuid := gen_random_uuid();
  tailor_email text := 'qa.tailor.final@tarzi.test';
  customer_email text := 'qa.customer.final@tarzi.test';
  test_password text := '<SET_PASSWORD_HERE>'; -- set before running; never commit a real value
BEGIN
  -- ── Tailor account ──
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = tailor_email) THEN
    RAISE NOTICE 'Tailor test account already exists, skipping.';
  ELSE
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', tailor_id, 'authenticated', 'authenticated',
      tailor_email, crypt(test_password, gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', 'QA Tailor Final', 'phone', '+971501112222', 'role', 'tailor'),
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), tailor_id,
      jsonb_build_object('sub', tailor_id::text, 'email', tailor_email),
      'email', tailor_id::text, now(), now(), now()
    );

    INSERT INTO public.profiles (id, full_name, phone, role, onboarding_complete, is_approved, approval_status)
    VALUES (tailor_id, 'QA Tailor Final', '+971501112222', 'tailor', false, false, 'pending')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, role = EXCLUDED.role,
      onboarding_complete = EXCLUDED.onboarding_complete, is_approved = EXCLUDED.is_approved,
      approval_status = EXCLUDED.approval_status;
  END IF;

  -- ── Customer account ──
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = customer_email) THEN
    RAISE NOTICE 'Customer test account already exists, skipping.';
  ELSE
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', customer_id, 'authenticated', 'authenticated',
      customer_email, crypt(test_password, gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', 'QA Customer Final'),
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), customer_id,
      jsonb_build_object('sub', customer_id::text, 'email', customer_email),
      'email', customer_id::text, now(), now(), now()
    );

    INSERT INTO public.profiles (id, full_name, phone, role)
    VALUES (customer_id, 'QA Customer Final', '+971509998888', 'customer')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, role = EXCLUDED.role;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

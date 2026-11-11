-- ══════════════════════════════════════════════════════════════════════════════
-- SUPABASE SETUP V12 — Create a pre-confirmed QA admin test account (run in SQL Editor)
--
-- WHY: Final E2E test requires approving a tailor via the admin dashboard
-- (/admin in tarzi-tailor). Rather than relying on the existing
-- maysam.gumaa@gmail.com admin account (password unknown to this session),
-- this creates a dedicated QA admin account the same way V11 created the
-- QA tailor/customer accounts (pre-confirmed, bypassing broken SMTP), then
-- promotes it to role='admin' using the same disable/enable trigger dance
-- documented in SUPABASE_SETUP_V6.sql (the SQL editor runs with auth.uid()
-- IS NULL, so the self-escalation-prevention trigger must be temporarily
-- disabled for this one bootstrap UPDATE).
--
-- Login credentials for QA:
--   Admin: qa.admin.final@tarzi.test / <SET_PASSWORD_HERE>
--
-- SECURITY: replace <SET_PASSWORD_HERE> below with a freshly generated
-- password before running this script. Never commit a real password to
-- this file or any other.
--
-- Safe to delete afterward with:
--   DELETE FROM auth.users WHERE email = 'qa.admin.final@tarzi.test';
-- ══════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  admin_id uuid := gen_random_uuid();
  admin_email text := 'qa.admin.final@tarzi.test';
  test_password text := '<SET_PASSWORD_HERE>'; -- set before running; never commit a real value
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = admin_email) THEN
    RAISE NOTICE 'Admin test account already exists, skipping creation.';
  ELSE
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', admin_id, 'authenticated', 'authenticated',
      admin_email, crypt(test_password, gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', 'QA Admin Final'),
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), admin_id,
      jsonb_build_object('sub', admin_id::text, 'email', admin_email),
      'email', admin_id::text, now(), now(), now()
    );

    INSERT INTO public.profiles (id, full_name, role)
    VALUES (admin_id, 'QA Admin Final', 'customer')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Promote to admin (bypass the self-escalation-prevention trigger for this bootstrap only)
ALTER TABLE profiles DISABLE TRIGGER enforce_admin_role_grant;

UPDATE public.profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'qa.admin.final@tarzi.test');

ALTER TABLE profiles ENABLE TRIGGER enforce_admin_role_grant;

NOTIFY pgrst, 'reload schema';

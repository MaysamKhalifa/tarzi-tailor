-- ============================================================
-- TARZI SUPABASE SETUP V2
-- Run this in the Supabase SQL Editor to add all new features.
-- All statements are safe to re-run (idempotent).
-- ============================================================


-- ============================================================
-- SECTION 1: Add new columns to profiles table
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shop_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shop_address text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS permit_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS languages text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS availability text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specialty text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS years_exp integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS area text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en';


-- ============================================================
-- SECTION 2: Create tailor_portfolio table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tailor_portfolio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tailor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  caption text,
  created_at timestamptz DEFAULT now()
);


-- ============================================================
-- SECTION 3: Row Level Security for tailor_portfolio
-- ============================================================

ALTER TABLE public.tailor_portfolio ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can view portfolio" ON public.tailor_portfolio
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Tailors manage own portfolio" ON public.tailor_portfolio
    FOR ALL USING (auth.uid() = tailor_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- SECTION 4: Storage bucket for portfolio images
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('tailor-portfolio', 'tailor-portfolio', true)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- SECTION 5: Storage policies for tailor-portfolio bucket
-- ============================================================

DO $$ BEGIN
  CREATE POLICY "Public read tailor portfolio" ON storage.objects
    FOR SELECT USING (bucket_id = 'tailor-portfolio');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Tailors upload portfolio" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'tailor-portfolio' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Tailors delete own portfolio" ON storage.objects
    FOR DELETE USING (
      bucket_id = 'tailor-portfolio' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- SECTION 6: Storage policies for garment-images bucket
--            (used for business permit uploads)
-- ============================================================

DO $$ BEGIN
  CREATE POLICY "Tailors upload permits" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'garment-images' AND
      (storage.foldername(name))[1] = 'permits'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- SECTION 7: Enable Realtime for tailor_portfolio
-- ============================================================

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tailor_portfolio;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

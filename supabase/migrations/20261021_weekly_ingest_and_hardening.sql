-- ============================================================================
-- 1verce Migration: Weekly Auto-Ingest, Battle Requests & RLS Hardening (v2)
-- Idempotent migration script for Supabase SQL Editor
-- ============================================================================

-- 1. Extend `public.battles` with metadata & weekly ingest columns
ALTER TABLE public.battles ADD COLUMN IF NOT EXISTS format TEXT NOT NULL DEFAULT 'FULL';
ALTER TABLE public.battles ADD COLUMN IF NOT EXISTS duration_sec INTEGER;
ALTER TABLE public.battles ADD COLUMN IF NOT EXISTS duplicate_of TEXT;
ALTER TABLE public.battles ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE public.battles ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'preset';
ALTER TABLE public.battles ADD COLUMN IF NOT EXISTS channel_id TEXT;
ALTER TABLE public.battles ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_battles_published_at ON public.battles (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_battles_source ON public.battles (source);

-- Lock down direct client INSERT/UPDATE/DELETE on `public.battles` (weekly ingest uses service_role)
DROP POLICY IF EXISTS "Allow public insert battles" ON public.battles;
DROP POLICY IF EXISTS "Allow public update battles" ON public.battles;
DROP POLICY IF EXISTS "Allow public delete battles" ON public.battles;

-- 2. Create `public.battle_requests` table for user-submitted YouTube URL candidates
CREATE TABLE IF NOT EXISTS public.battle_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_id TEXT NOT NULL UNIQUE CHECK (youtube_id ~ '^[a-zA-Z0-9_-]{11}$'),
  url TEXT NOT NULL,
  note TEXT CHECK (note IS NULL OR char_length(note) <= 200),
  device_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'duplicate')),
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_battle_requests_status_created
  ON public.battle_requests (status, created_at ASC);

ALTER TABLE public.battle_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read battle_requests" ON public.battle_requests;
CREATE POLICY "Allow public read battle_requests"
  ON public.battle_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert battle_requests" ON public.battle_requests;
CREATE POLICY "Allow public insert battle_requests"
  ON public.battle_requests FOR INSERT
  WITH CHECK (
    status = 'pending'
    AND youtube_id ~ '^[a-zA-Z0-9_-]{11}$'
    AND (note IS NULL OR char_length(note) <= 200)
  );

DROP POLICY IF EXISTS "Allow public update battle_requests" ON public.battle_requests;
DROP POLICY IF EXISTS "Allow public delete battle_requests" ON public.battle_requests;

-- 3. Extend `public.albums` with explicit ownership & soft-delete columns + SECURITY DEFINER RPCs
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS owner_device_id TEXT;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS jacket_style TEXT NOT NULL DEFAULT 'VINYL_LP';
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS jacket_theme TEXT NOT NULL DEFAULT 'CRIMSON';
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_albums_owner_device_id ON public.albums (owner_device_id);

DROP POLICY IF EXISTS "Allow public upsert albums" ON public.albums;
DROP POLICY IF EXISTS "Allow public update albums" ON public.albums;
DROP POLICY IF EXISTS "Allow public delete albums" ON public.albums;

CREATE OR REPLACE FUNCTION public.upsert_album(
  p_id TEXT,
  p_owner_device_id TEXT,
  p_title TEXT,
  p_description TEXT,
  p_theme_tag TEXT,
  p_jacket_style TEXT,
  p_jacket_theme TEXT,
  p_tracks JSONB
)
RETURNS void AS $$
DECLARE
  existing_owner TEXT;
  existing_preset BOOLEAN;
BEGIN
  IF p_id IS NULL OR char_length(p_id) < 3 OR p_owner_device_id IS NULL OR char_length(p_owner_device_id) < 4 THEN
    RAISE EXCEPTION 'Invalid album id or owner_device_id';
  END IF;

  SELECT owner_device_id, is_preset
    INTO existing_owner, existing_preset
    FROM public.albums
    WHERE id = p_id;

  IF FOUND THEN
    IF existing_preset THEN
      RAISE EXCEPTION 'Cannot overwrite preset album';
    END IF;
    IF existing_owner IS NOT NULL AND existing_owner <> '' AND existing_owner <> p_owner_device_id THEN
      RAISE EXCEPTION 'Album owned by another device';
    END IF;

    UPDATE public.albums
    SET title = COALESCE(NULLIF(trim(p_title), ''), 'UNTITLED'),
        description = COALESCE(p_description, ''),
        theme_tag = COALESCE(p_theme_tag, 'BEST BOUTS'),
        jacket_style = COALESCE(p_jacket_style, 'VINYL_LP'),
        jacket_theme = COALESCE(p_jacket_theme, 'CRIMSON'),
        owner_device_id = p_owner_device_id,
        tracks = COALESCE(p_tracks, '[]'::jsonb),
        is_deleted = FALSE,
        updated_at = NOW()
    WHERE id = p_id;
  ELSE
    INSERT INTO public.albums (
      id,
      title,
      description,
      theme_tag,
      jacket_style,
      jacket_theme,
      owner_device_id,
      tracks,
      likes,
      play_count,
      is_preset,
      is_deleted,
      created_at,
      updated_at
    ) VALUES (
      p_id,
      COALESCE(NULLIF(trim(p_title), ''), 'UNTITLED'),
      COALESCE(p_description, ''),
      COALESCE(p_theme_tag, 'BEST BOUTS'),
      COALESCE(p_jacket_style, 'VINYL_LP'),
      COALESCE(p_jacket_theme, 'CRIMSON'),
      p_owner_device_id,
      COALESCE(p_tracks, '[]'::jsonb),
      1,
      0,
      FALSE,
      FALSE,
      NOW(),
      NOW()
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_album(
  p_id TEXT,
  p_owner_device_id TEXT
)
RETURNS void AS $$
BEGIN
  UPDATE public.albums
  SET is_deleted = TRUE,
      updated_at = NOW()
  WHERE id = p_id
    AND is_preset = FALSE
    AND (owner_device_id = p_owner_device_id OR theme_tag LIKE '%::' || p_owner_device_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_album_play(target_album_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE public.albums
  SET play_count = play_count + 1,
      updated_at = NOW()
  WHERE id = target_album_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Lock down direct public UPDATE/DELETE on `stamps` & `site_analytics`
DROP POLICY IF EXISTS "Allow public update stamps" ON public.stamps;
DROP POLICY IF EXISTS "Allow public delete stamps" ON public.stamps;
DROP POLICY IF EXISTS "Allow public update site_analytics" ON public.site_analytics;

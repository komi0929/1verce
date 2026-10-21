-- ============================================================================
-- 1verce Cloud Database Schema (Supabase / PostgreSQL)
-- Run this script in your Supabase SQL Editor to initialize all tables & RLS
-- ============================================================================

-- 1. Battles Table (バトル動画マスター + ユーザー登録バトル)
CREATE TABLE IF NOT EXISTS public.battles (
  id TEXT PRIMARY KEY,
  youtube_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  mc_a TEXT NOT NULL,
  mc_b TEXT NOT NULL,
  tournament TEXT NOT NULL,
  stage_or_event TEXT NOT NULL DEFAULT '',
  year TEXT NOT NULL DEFAULT '2024',
  outbound_plays INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  is_user_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_battles_youtube_id ON public.battles (youtube_id);
CREATE INDEX IF NOT EXISTS idx_battles_tournament ON public.battles (tournament);
CREATE INDEX IF NOT EXISTS idx_battles_mc_a ON public.battles (mc_a);
CREATE INDEX IF NOT EXISTS idx_battles_mc_b ON public.battles (mc_b);
CREATE INDEX IF NOT EXISTS idx_battles_last_active_at ON public.battles (last_active_at DESC);

-- 2. Stamps / Moments Table (1-TAP刻印・パンチライン・ハイライト秒数)
CREATE TABLE IF NOT EXISTS public.stamps (
  id TEXT PRIMARY KEY,
  battle_id TEXT NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  seconds INTEGER NOT NULL DEFAULT 0,
  tag TEXT NOT NULL DEFAULT 'BEST_VERSE',
  text TEXT NOT NULL,
  mc TEXT NOT NULL,
  likes INTEGER NOT NULL DEFAULT 1,
  replays INTEGER NOT NULL DEFAULT 1,
  is_user_created BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stamps_battle_id ON public.stamps (battle_id);
CREATE INDEX IF NOT EXISTS idx_stamps_likes ON public.stamps (likes DESC);

-- 3. Albums Table (ユーザー作成マイアルバム / ベストバウト集)
CREATE TABLE IF NOT EXISTS public.albums (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  theme_tag TEXT NOT NULL DEFAULT 'BEST BOUTS',
  tracks JSONB NOT NULL DEFAULT '[]'::jsonb,
  likes INTEGER NOT NULL DEFAULT 0,
  play_count INTEGER NOT NULL DEFAULT 0,
  is_preset BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_albums_updated_at ON public.albums (updated_at DESC);

-- 4. Activity Logs Table (リアルタイム参加ログ・鮮度フィード)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  battle_id TEXT,
  album_id TEXT,
  summary TEXT NOT NULL,
  detail TEXT,
  seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs (created_at DESC);

-- 5. Site Analytics Table (実測インサイト集計)
CREATE TABLE IF NOT EXISTS public.site_analytics (
  id TEXT PRIMARY KEY DEFAULT 'global',
  total_pv BIGINT NOT NULL DEFAULT 0,
  unique_visitors BIGINT NOT NULL DEFAULT 0,
  total_plays BIGINT NOT NULL DEFAULT 0,
  total_verses_logged BIGINT NOT NULL DEFAULT 0,
  viral_shares BIGINT NOT NULL DEFAULT 0,
  tournament_traffic JSONB NOT NULL DEFAULT '{}'::jsonb,
  mc_search_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Row Level Security (RLS) Policies (パブリック読み取り・参加型書き込み許可)
-- ============================================================================
ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_analytics ENABLE ROW LEVEL SECURITY;

-- Battles Policies (読み取り・新規投稿のみ許可。改ざんUPDATEやDELETEは遮断)
DROP POLICY IF EXISTS "Allow public read battles" ON public.battles;
CREATE POLICY "Allow public read battles" ON public.battles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert battles" ON public.battles;
CREATE POLICY "Allow public insert battles" ON public.battles FOR INSERT WITH CHECK (true);

-- 外部からのバトル改ざん（UPDATE）および削除（DELETE）は禁止（管理者のみ）
DROP POLICY IF EXISTS "Allow public update battles" ON public.battles;
DROP POLICY IF EXISTS "Allow public delete battles" ON public.battles;

-- 安全な再生数・シェア数インクリメント用RPC関数（SECURITY DEFINER）
CREATE OR REPLACE FUNCTION increment_battle_play(target_battle_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE public.battles
  SET outbound_plays = outbound_plays + 1,
      last_active_at = NOW()
  WHERE id = target_battle_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_battle_share(target_battle_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE public.battles
  SET shares = shares + 1,
      last_active_at = NOW()
  WHERE id = target_battle_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stamps Policies
DROP POLICY IF EXISTS "Allow public read stamps" ON public.stamps;
CREATE POLICY "Allow public read stamps" ON public.stamps FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert stamps" ON public.stamps;
CREATE POLICY "Allow public insert stamps" ON public.stamps FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update stamps" ON public.stamps;
CREATE POLICY "Allow public update stamps" ON public.stamps FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete stamps" ON public.stamps;
CREATE POLICY "Allow public delete stamps" ON public.stamps FOR DELETE USING (true);

-- Albums Policies (全削除は禁止。SELECT/INSERT/UPDATEのみ許可)
DROP POLICY IF EXISTS "Allow public read albums" ON public.albums;
CREATE POLICY "Allow public read albums" ON public.albums FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public upsert albums" ON public.albums;
CREATE POLICY "Allow public upsert albums" ON public.albums FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update albums" ON public.albums;
CREATE POLICY "Allow public update albums" ON public.albums FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete albums" ON public.albums;

-- Activity Logs Policies
DROP POLICY IF EXISTS "Allow public read activity_logs" ON public.activity_logs;
CREATE POLICY "Allow public read activity_logs" ON public.activity_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert activity_logs" ON public.activity_logs;
CREATE POLICY "Allow public insert activity_logs" ON public.activity_logs FOR INSERT WITH CHECK (true);

-- Site Analytics Policies
DROP POLICY IF EXISTS "Allow public read site_analytics" ON public.site_analytics;
CREATE POLICY "Allow public read site_analytics" ON public.site_analytics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public upsert site_analytics" ON public.site_analytics;
CREATE POLICY "Allow public upsert site_analytics" ON public.site_analytics FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update site_analytics" ON public.site_analytics;
CREATE POLICY "Allow public update site_analytics" ON public.site_analytics FOR UPDATE USING (true);

-- ============================================================================
-- v2: Weekly Auto-Ingest, Battle Requests & RLS Hardening (2026-10-21)
-- ============================================================================

ALTER TABLE public.battles ADD COLUMN IF NOT EXISTS format TEXT NOT NULL DEFAULT 'FULL';
ALTER TABLE public.battles ADD COLUMN IF NOT EXISTS duration_sec INTEGER;
ALTER TABLE public.battles ADD COLUMN IF NOT EXISTS duplicate_of TEXT;
ALTER TABLE public.battles ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE public.battles ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'preset';
ALTER TABLE public.battles ADD COLUMN IF NOT EXISTS channel_id TEXT;
ALTER TABLE public.battles ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_battles_published_at ON public.battles (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_battles_source ON public.battles (source);

DROP POLICY IF EXISTS "Allow public insert battles" ON public.battles;

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

DROP POLICY IF EXISTS "Allow public update stamps" ON public.stamps;
DROP POLICY IF EXISTS "Allow public delete stamps" ON public.stamps;
DROP POLICY IF EXISTS "Allow public update site_analytics" ON public.site_analytics;

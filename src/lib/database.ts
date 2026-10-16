import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  ActivityItem,
  Album,
  AnalyticsData,
  Battle,
  StampTag,
  TournamentTag,
  Verse,
} from '../types';

export const DB_STORAGE_KEYS = {
  BATTLES: '1verce_battles_v5',
  ANALYTICS: '1verce_analytics_v5',
  SAVED: '1verce_saved_v5',
  LIKED_VERSES: '1verce_liked_verses_v5',
  ALBUMS: '1verce_albums_v1',
  ACTIVITIES: '1verce_activities_v1',
  SUPABASE_CONFIG: '1verce_supabase_config_v1',
  VISITOR_INITIALIZED: '1verce_visitor_init_v1',
};

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export const DEFAULT_ALBUMS: Album[] = [
  {
    id: 'alb-legend-bouts',
    title: '殿堂入り・伝説の頂上決戦 MIX',
    description:
      '日本のMCバトル史を動かした外せない名勝負セレクション。連続再生で一気に振り返るベストバウト集。',
    themeTag: 'LEGEND BOUTS',
    jacketStyle: 'MOSAIC_4',
    jacketTheme: 'CRIMSON',
    tracks: [
      {
        id: 'trk-1',
        battleId: 'btl-01',
        startSeconds: 0,
        note: 'FORK vs 呂布カルマ - 一言も聞き逃せない究極の対話',
        addedAt: '2026-10-16T00:00:00Z',
      },
      {
        id: 'trk-2',
        battleId: 'btl-03',
        startSeconds: 0,
        note: 'Authority vs 呂布カルマ - 戦極21章の熱狂',
        addedAt: '2026-10-16T00:00:00Z',
      },
      {
        id: 'trk-3',
        battleId: 'btl-05',
        startSeconds: 0,
        note: 'R-指定 vs 鎮座DOPENESS - 音楽性とフロウの極致',
        addedAt: '2026-10-16T00:00:00Z',
      },
      {
        id: 'trk-4',
        battleId: 'btl-07',
        startSeconds: 0,
        note: '晋平太 vs 呂布カルマ - 魂のぶつかり合い',
        addedAt: '2026-10-16T00:00:00Z',
      },
    ],
    likes: 1,
    playCount: 0,
    createdAt: '2026-10-16T00:00:00Z',
    updatedAt: '2026-10-16T00:00:00Z',
    isPreset: true,
  },
  {
    id: 'alb-skill-groove',
    title: '作業用・中毒性MAXフロウ＆スキル集',
    description:
      '何度でもループ再生したくなるビートアプローチと超絶ライムの試合をまとめたプレイリスト。自分好みに曲順や収録バトルを編集可能。',
    themeTag: 'FLOW & RHYME',
    jacketStyle: 'VINYL_LP',
    jacketTheme: 'GOLD',
    tracks: [
      {
        id: 'trk-5',
        battleId: 'btl-04',
        startSeconds: 0,
        note: 'MU-TON vs 呂布カルマ - スモーキーなフロウと重厚な言葉',
        addedAt: '2026-10-16T00:00:00Z',
      },
      {
        id: 'trk-6',
        battleId: 'btl-10',
        startSeconds: 0,
        note: 'Authority vs MU-TON - 東北頂上対決',
        addedAt: '2026-10-16T00:00:00Z',
      },
      {
        id: 'trk-7',
        battleId: 'btl-06',
        startSeconds: 0,
        note: '百足 vs 韻マン - 高速ライムの応酬',
        addedAt: '2026-10-16T00:00:00Z',
      },
    ],
    likes: 1,
    playCount: 0,
    createdAt: '2026-10-16T00:00:00Z',
    updatedAt: '2026-10-16T00:00:00Z',
    isPreset: true,
  },
];

let cachedClient: SupabaseClient | null = null;
let cachedConfigKey = '';

export function getSupabaseConfig(): SupabaseConfig | null {
  const envUrl = (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_SUPABASE_URL;
  const envKey = (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_SUPABASE_ANON_KEY;

  if (
    envUrl &&
    envKey &&
    !envUrl.includes('your-project-id') &&
    envUrl.startsWith('http')
  ) {
    return { url: envUrl.trim(), anonKey: envKey.trim() };
  }

  try {
    const raw = localStorage.getItem(DB_STORAGE_KEYS.SUPABASE_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw) as SupabaseConfig;
      if (parsed.url && parsed.anonKey && parsed.url.startsWith('http')) {
        return {
          url: parsed.url.trim(),
          anonKey: parsed.anonKey.trim(),
        };
      }
    }
  } catch {
    // Ignore storage error
  }

  return null;
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  localStorage.setItem(
    DB_STORAGE_KEYS.SUPABASE_CONFIG,
    JSON.stringify({
      url: config.url.trim(),
      anonKey: config.anonKey.trim(),
    })
  );
  cachedClient = null;
  cachedConfigKey = '';
}

export function clearSupabaseConfig(): void {
  localStorage.removeItem(DB_STORAGE_KEYS.SUPABASE_CONFIG);
  cachedClient = null;
  cachedConfigKey = '';
}

export function getSupabaseClient(): SupabaseClient | null {
  const cfg = getSupabaseConfig();
  if (!cfg) return null;

  const key = `${cfg.url}::${cfg.anonKey}`;
  if (cachedClient && cachedConfigKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession: false },
    });
    cachedConfigKey = key;
    return cachedClient;
  } catch {
    return null;
  }
}

export async function testSupabaseConnection(overrideConfig?: SupabaseConfig): Promise<{
  ok: boolean;
  message: string;
  tablesReady: boolean;
}> {
  if (overrideConfig) {
    cachedClient = null;
    cachedConfigKey = '';
  }
  const cfg = overrideConfig || getSupabaseConfig();
  if (!cfg || !cfg.url || !cfg.anonKey) {
    return {
      ok: false,
      message: 'SupabaseのURLまたはAnon Keyが未設定です。',
      tablesReady: false,
    };
  }

  try {
    const client = overrideConfig
      ? createClient(cfg.url, cfg.anonKey, { auth: { persistSession: false } })
      : getSupabaseClient();

    if (!client) {
      return {
        ok: false,
        message: 'Supabaseクライアントの初期化に失敗しました。URLの形式を確認してください。',
        tablesReady: false,
      };
    }

    const { data, error } = await client.from('battles').select('id').limit(1);
    if (error) {
      if (
        error.code === '42P01' ||
        error.message.includes('does not exist') ||
        error.message.includes('schema cache')
      ) {
        return {
          ok: true,
          message:
            'Supabaseへの通信に成功しました！続けてSQLスキーマを実行してテーブルを作成してください。',
          tablesReady: false,
        };
      }
      return {
        ok: false,
        message: `接続エラー: ${error.message}`,
        tablesReady: false,
      };
    }

    return {
      ok: true,
      message: 'Supabase Cloud DB に正常接続されており、全テーブルが稼働中です。',
      tablesReady: true,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes('Failed to fetch') || errMsg.includes('fetch')) {
      return {
        ok: false,
        message: 'ネットワークエラー: ブラウザの広告ブロック/トラッキング防止拡張機能、またはCORS制限によってSupabaseへの通信が遮断されている可能性があります。',
        tablesReady: false,
      };
    }
    return {
      ok: false,
      message: `通信エラー: ${errMsg}`,
      tablesReady: false,
    };
  }
}

// ============================================================================
// Cloud Sync Operations (Non-blocking, graceful fallback to LocalStorage)
// ============================================================================

export async function fetchCloudState(baseBattles: Battle[]): Promise<{
  mergedBattles: Battle[];
  cloudAlbums: Album[] | null;
  cloudActivities: ActivityItem[] | null;
  cloudAnalytics: AnalyticsData | null;
} | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const [battlesRes, stampsRes, albumsRes, activitiesRes, analyticsRes] =
      await Promise.all([
        client
          .from('battles')
          .select('*')
          .order('last_active_at', { ascending: false })
          .limit(2000),
        client
          .from('stamps')
          .select('*')
          .order('seconds', { ascending: true })
          .limit(5000),
        client
          .from('albums')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(200),
        client
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
        client.from('site_analytics').select('*').eq('id', 'global').maybeSingle(),
      ]);

    if (battlesRes.error && stampsRes.error) {
      return null;
    }

    // Group stamps by battle_id
    const stampsByBattle = new Map<string, Verse[]>();
    if (stampsRes.data) {
      for (const row of stampsRes.data) {
        const verse: Verse = {
          id: row.id,
          battleId: row.battle_id,
          seconds: Number(row.seconds) || 0,
          tag: (row.tag as StampTag) || 'BEST_VERSE',
          text: row.text || '',
          mc: row.mc || '',
          likes: Number(row.likes) || 0,
          replays: Number(row.replays) || 0,
          createdAt: row.created_at || new Date().toISOString(),
          isUserCreated: Boolean(row.is_user_created),
        };
        const list = stampsByBattle.get(verse.battleId) || [];
        list.push(verse);
        stampsByBattle.set(verse.battleId, list);
      }
    }

    // Merge baseBattles with cloud battles & cloud stamps
    const battleMap = new Map<string, Battle>();
    for (const b of baseBattles) {
      const cloudStamps = stampsByBattle.get(b.id);
      if (cloudStamps && cloudStamps.length > 0) {
        // Merge unique stamps by id
        const existingIds = new Set(b.verses.map((v) => v.id));
        const combined = [
          ...b.verses,
          ...cloudStamps.filter((cs) => !existingIds.has(cs.id)),
        ];
        battleMap.set(b.id, { ...b, verses: combined });
      } else {
        battleMap.set(b.id, b);
      }
    }

    if (battlesRes.data) {
      for (const row of battlesRes.data) {
        const existing = battleMap.get(row.id);
        const cloudStamps = stampsByBattle.get(row.id) || [];
        if (existing) {
          const existingIds = new Set(existing.verses.map((v) => v.id));
          const combinedVerses = [
            ...existing.verses,
            ...cloudStamps.filter((cs) => !existingIds.has(cs.id)),
          ];
          battleMap.set(row.id, {
            ...existing,
            outboundPlays: Math.max(
              existing.outboundPlays,
              Number(row.outbound_plays) || 0
            ),
            shares: Math.max(existing.shares, Number(row.shares) || 0),
            lastActiveAt: row.last_active_at || existing.lastActiveAt,
            verses: combinedVerses,
          });
        } else {
          // User-submitted battle from cloud
          battleMap.set(row.id, {
            id: row.id,
            youtubeId: row.youtube_id,
            title: row.title,
            mcA: row.mc_a,
            mcB: row.mc_b,
            tournament: (row.tournament as Exclude<TournamentTag, 'ALL'>) || '戦極',
            stageOrEvent: row.stage_or_event || '',
            year: row.year || '2024',
            verses: cloudStamps,
            evaluation: { word: 0, flow: 0, vibe: 0 },
            outboundPlays: Number(row.outbound_plays) || 0,
            shares: Number(row.shares) || 0,
            createdAt: row.created_at || new Date().toISOString(),
            lastActiveAt: row.last_active_at || row.created_at,
            isUserSubmitted: Boolean(row.is_user_submitted),
          });
        }
      }
    }

    let cloudAlbums: Album[] | null = null;
    if (albumsRes.data && albumsRes.data.length > 0) {
      cloudAlbums = albumsRes.data.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description || '',
        themeTag: row.theme_tag || 'BEST BOUTS',
        tracks: Array.isArray(row.tracks) ? row.tracks : [],
        likes: Number(row.likes) || 0,
        playCount: Number(row.play_count) || 0,
        isPreset: Boolean(row.is_preset),
        createdAt: row.created_at || new Date().toISOString(),
        updatedAt: row.updated_at || new Date().toISOString(),
      }));
    }

    let cloudActivities: ActivityItem[] | null = null;
    if (activitiesRes.data && activitiesRes.data.length > 0) {
      cloudActivities = activitiesRes.data.map((row) => ({
        id: row.id,
        type: row.type,
        battleId: row.battle_id || undefined,
        albumId: row.album_id || undefined,
        summary: row.summary,
        detail: row.detail || undefined,
        seconds: row.seconds != null ? Number(row.seconds) : undefined,
        createdAt: row.created_at || new Date().toISOString(),
      }));
    }

    let cloudAnalytics: AnalyticsData | null = null;
    if (analyticsRes.data) {
      const d = analyticsRes.data;
      cloudAnalytics = {
        totalPv: Number(d.total_pv) || 0,
        uniqueVisitors: Number(d.unique_visitors) || 0,
        totalPlays: Number(d.total_plays) || 0,
        totalVersesLogged: Number(d.total_verses_logged) || 0,
        viralShares: Number(d.viral_shares) || 0,
        tournamentTraffic: d.tournament_traffic || {},
        mcSearchCounts: d.mc_search_counts || {},
      };
    }

    return {
      mergedBattles: Array.from(battleMap.values()),
      cloudAlbums,
      cloudActivities,
      cloudAnalytics,
    };
  } catch {
    return null;
  }
}

export async function upsertBattleToCloud(battle: Battle): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('battles').upsert(
      {
        id: battle.id,
        youtube_id: battle.youtubeId,
        title: battle.title,
        mc_a: battle.mcA,
        mc_b: battle.mcB,
        tournament: battle.tournament,
        stage_or_event: battle.stageOrEvent,
        year: battle.year,
        outbound_plays: battle.outboundPlays,
        shares: battle.shares,
        is_user_submitted: Boolean(battle.isUserSubmitted),
        created_at: battle.createdAt,
        last_active_at: battle.lastActiveAt || new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  } catch {
    // Non-blocking
  }
}

export async function upsertStampToCloud(
  battle: Battle,
  verse: Verse
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    // Ensure parent battle exists in cloud first
    await upsertBattleToCloud(battle);
    await client.from('stamps').upsert(
      {
        id: verse.id,
        battle_id: verse.battleId,
        seconds: verse.seconds,
        tag: verse.tag || 'BEST_VERSE',
        text: verse.text,
        mc: verse.mc,
        likes: verse.likes,
        replays: verse.replays,
        is_user_created: verse.isUserCreated ?? true,
        created_at: verse.createdAt,
      },
      { onConflict: 'id' }
    );
  } catch {
    // Non-blocking
  }
}

export async function removeStampFromCloud(verseId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('stamps').delete().eq('id', verseId);
  } catch {
    // Non-blocking
  }
}

export async function upsertAlbumToCloud(album: Album): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('albums').upsert(
      {
        id: album.id,
        title: album.title,
        description: album.description,
        theme_tag: album.themeTag,
        tracks: album.tracks,
        likes: album.likes,
        play_count: album.playCount,
        is_preset: Boolean(album.isPreset),
        created_at: album.createdAt,
        updated_at: album.updatedAt,
      },
      { onConflict: 'id' }
    );
  } catch {
    // Non-blocking
  }
}

export async function removeAlbumFromCloud(albumId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('albums').delete().eq('id', albumId);
  } catch {
    // Non-blocking
  }
}

export async function insertActivityToCloud(item: ActivityItem): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('activity_logs').upsert(
      {
        id: item.id,
        type: item.type,
        battle_id: item.battleId || null,
        album_id: item.albumId || null,
        summary: item.summary,
        detail: item.detail || null,
        seconds: item.seconds ?? null,
        created_at: item.createdAt,
      },
      { onConflict: 'id' }
    );
  } catch {
    // Non-blocking
  }
}

export async function syncAnalyticsToCloud(
  analytics: AnalyticsData
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('site_analytics').upsert(
      {
        id: 'global',
        total_pv: analytics.totalPv,
        unique_visitors: analytics.uniqueVisitors,
        total_plays: analytics.totalPlays,
        total_verses_logged: analytics.totalVersesLogged,
        viral_shares: analytics.viralShares,
        tournament_traffic: analytics.tournamentTraffic,
        mc_search_counts: analytics.mcSearchCounts,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  } catch {
    // Non-blocking
  }
}

export async function syncAllDataToSupabase(
  battles: Battle[],
  albums: Album[],
  activities: ActivityItem[],
  analytics: AnalyticsData,
  onProgress?: (msg: string) => void
): Promise<{ ok: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, message: 'Supabaseが未設定です。' };
  }

  try {
    onProgress?.('バトルマスターデータをクラウドへ同期中...');
    const battleRows = battles.map((b) => ({
      id: b.id,
      youtube_id: b.youtubeId,
      title: b.title,
      mc_a: b.mcA,
      mc_b: b.mcB,
      tournament: b.tournament,
      stage_or_event: b.stageOrEvent,
      year: b.year,
      outbound_plays: b.outboundPlays,
      shares: b.shares,
      is_user_submitted: Boolean(b.isUserSubmitted),
      created_at: b.createdAt,
      last_active_at: b.lastActiveAt || b.createdAt,
    }));

    // Upsert in chunks of 200
    for (let i = 0; i < battleRows.length; i += 200) {
      const chunk = battleRows.slice(i, i + 200);
      const { error } = await client
        .from('battles')
        .upsert(chunk, { onConflict: 'id' });
      if (error) {
        return {
          ok: false,
          message: `battlesテーブル同期エラー: ${error.message}`,
        };
      }
      onProgress?.(
        `バトル同期進行中 (${Math.min(i + 200, battleRows.length)} / ${battleRows.length}件)...`
      );
    }

    // Stamps
    const allStamps: Array<Record<string, unknown>> = [];
    for (const b of battles) {
      for (const v of b.verses) {
        allStamps.push({
          id: v.id,
          battle_id: b.id,
          seconds: v.seconds,
          tag: v.tag || 'BEST_VERSE',
          text: v.text,
          mc: v.mc,
          likes: v.likes,
          replays: v.replays,
          is_user_created: v.isUserCreated ?? true,
          created_at: v.createdAt,
        });
      }
    }

    if (allStamps.length > 0) {
      onProgress?.(`刻印・スタンプ (${allStamps.length}件) を同期中...`);
      for (let i = 0; i < allStamps.length; i += 200) {
        const chunk = allStamps.slice(i, i + 200);
        await client.from('stamps').upsert(chunk, { onConflict: 'id' });
      }
    }

    // Albums
    if (albums.length > 0) {
      onProgress?.(`マイアルバム (${albums.length}件) を同期中...`);
      for (const alb of albums) {
        await upsertAlbumToCloud(alb);
      }
    }

    // Activities
    if (activities.length > 0) {
      for (const act of activities.slice(0, 30)) {
        await insertActivityToCloud(act);
      }
    }

    // Analytics
    onProgress?.('インサイト集計データを同期中...');
    await syncAnalyticsToCloud(analytics);

    return {
      ok: true,
      message: `同期完了！バトル ${battles.length}件、刻印 ${allStamps.length}件、アルバム ${albums.length}件をSupabaseへ保存しました。`,
    };
  } catch (err) {
    return {
      ok: false,
      message: `同期中にエラーが発生しました: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
}

export const SUPABASE_SCHEMA_SQL = `-- 1verce Cloud Database Schema (Supabase SQL Editorに貼り付けてRunしてください)
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

ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Access Battles" ON public.battles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Stamps" ON public.stamps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Albums" ON public.albums FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Activities" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Analytics" ON public.site_analytics FOR ALL USING (true) WITH CHECK (true);`;

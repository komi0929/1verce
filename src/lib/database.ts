import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Album,
  AlbumJacketStyle,
  AlbumJacketTheme,
  Battle,
  TournamentTag,
} from '../types';

export const DB_STORAGE_KEYS = {
  BATTLES: '1verce_battles_v5',
  SAVED: '1verce_saved_v5',
  ALBUMS: '1verce_albums_v2',
  DELETED_ALBUMS: '1verce_deleted_albums_v1',
};

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

const DEFAULT_SUPABASE_URL = 'https://bousfwdffigyvumnzlhy.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvdXNmd2RmZmlneXZ1bW56bGh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxMjMzMTIsImV4cCI6MjEwNzY5OTMxMn0.wchRAj5uFkUot6iRKIjJ6giFjOruXf4bdNgdYWfWBTk';

export const DEFAULT_ALBUMS: Album[] = [
  {
    id: 'alb-legend-bouts',
    title: '殿堂入り・伝説の頂上決戦 LP',
    description:
      '日本のMCバトル史を動かした外せない名勝負セレクション。針を落として連続再生で一気に浴びるベストバウト盤。',
    themeTag: 'LEGEND BOUTS',
    jacketStyle: 'VINYL_LP',
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
      {
        id: 'trk-5',
        battleId: 'btl-02',
        startSeconds: 0,
        note: 'R-指定 vs 晋平太 - ADRENALINE 2019 伝説の決勝戦',
        addedAt: '2026-10-16T00:00:00Z',
      },
    ],
    likes: 12,
    playCount: 28,
    createdAt: '2026-10-16T00:00:00Z',
    updatedAt: '2026-10-16T00:00:00Z',
    isPreset: true,
  },
  {
    id: 'alb-skill-groove',
    title: '作業用・中毒性MAXフロウ＆スキル集',
    description:
      '何度でもループ再生したくなるビートアプローチと超絶ライムの試合をまとめたレコード盤。曲順や収録バトルも自由にカスタム可能。',
    themeTag: 'FLOW & RHYME',
    jacketStyle: 'MOSAIC_4',
    jacketTheme: 'GOLD',
    tracks: [
      {
        id: 'trk-6',
        battleId: 'btl-04',
        startSeconds: 0,
        note: 'MU-TON vs 呂布カルマ - スモーキーなフロウと重厚な言葉',
        addedAt: '2026-10-16T00:00:00Z',
      },
      {
        id: 'trk-7',
        battleId: 'btl-10',
        startSeconds: 0,
        note: 'Authority vs MU-TON - 東北頂上対決',
        addedAt: '2026-10-16T00:00:00Z',
      },
      {
        id: 'trk-8',
        battleId: 'btl-06',
        startSeconds: 0,
        note: '百足 vs 韻マン - 高速ライムの応酬',
        addedAt: '2026-10-16T00:00:00Z',
      },
      {
        id: 'trk-9',
        battleId: 'btl-13',
        startSeconds: 0,
        note: 'S-kaine vs Authority - 低音フロウと緻密なライム',
        addedAt: '2026-10-16T00:00:00Z',
      },
    ],
    likes: 9,
    playCount: 19,
    createdAt: '2026-10-16T00:00:00Z',
    updatedAt: '2026-10-16T00:00:00Z',
    isPreset: true,
  },
  {
    id: 'alb-passion-roar',
    title: '魂の咆哮・ハードヒット名勝負 MIX',
    description:
      '言葉の重みと熱量がダイレクトに胸を打つベストバウト集。',
    themeTag: 'RAW PASSION',
    jacketStyle: 'HERO_SLEEVE',
    jacketTheme: 'MONO',
    tracks: [
      {
        id: 'trk-10',
        battleId: 'btl-11',
        startSeconds: 0,
        note: '呂布カルマ vs FORK - KING OF KINGS 頂上決戦',
        addedAt: '2026-10-16T00:00:00Z',
      },
      {
        id: 'trk-11',
        battleId: 'btl-17',
        startSeconds: 0,
        note: '輪入道 vs 呂布カルマ - 真 ADRENALINE 決勝',
        addedAt: '2026-10-16T00:00:00Z',
      },
      {
        id: 'trk-12',
        battleId: 'btl-15',
        startSeconds: 0,
        note: '晋平太 vs ふぁんく - 戦極第28章 大阪関西公演',
        addedAt: '2026-10-16T00:00:00Z',
      },
    ],
    likes: 7,
    playCount: 14,
    createdAt: '2026-10-16T00:00:00Z',
    updatedAt: '2026-10-16T00:00:00Z',
    isPreset: true,
  },
];

let cachedClient: SupabaseClient | null = null;
let cachedConfigKey = '';

export function getSupabaseConfig(): SupabaseConfig {
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

  return {
    url: DEFAULT_SUPABASE_URL,
    anonKey: DEFAULT_SUPABASE_ANON_KEY,
  };
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

// ============================================================================
// Cloud Sync Operations (Automatic, non-blocking, graceful fallback to LocalStorage)
// ============================================================================

export async function fetchCloudState(baseBattles: Battle[]): Promise<{
  mergedBattles: Battle[];
  cloudAlbums: Album[] | null;
} | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const [battlesRes, albumsRes] = await Promise.all([
      client
        .from('battles')
        .select('*')
        .order('last_active_at', { ascending: false })
        .limit(2000),
      client
        .from('albums')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(200),
    ]);

    if (battlesRes.error && albumsRes.error) {
      return null;
    }

    const battleMap = new Map<string, Battle>();
    for (const b of baseBattles) {
      battleMap.set(b.id, b);
    }

    if (battlesRes.data) {
      for (const row of battlesRes.data) {
        const existing = battleMap.get(row.id);
        if (existing) {
          battleMap.set(row.id, {
            ...existing,
            outboundPlays: Math.max(
              existing.outboundPlays,
              Number(row.outbound_plays) || 0
            ),
            shares: Math.max(existing.shares, Number(row.shares) || 0),
            lastActiveAt: row.last_active_at || existing.lastActiveAt,
          });
        } else {
          battleMap.set(row.id, {
            id: row.id,
            youtubeId: row.youtube_id,
            title: row.title,
            mcA: row.mc_a,
            mcB: row.mc_b,
            tournament:
              (row.tournament as Exclude<TournamentTag, 'ALL'>) || '戦極',
            stageOrEvent: row.stage_or_event || '',
            year: row.year || '2025',
            verses: [],
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
      cloudAlbums = albumsRes.data.map((row) => {
        const rawTag = String(row.theme_tag || 'BEST BOUTS');
        const parts = rawTag.split('::');
        const themeTag = parts[0] || 'BEST BOUTS';
        const jacketStyle = (parts[1] as AlbumJacketStyle) || 'VINYL_LP';
        const jacketTheme = (parts[2] as AlbumJacketTheme) || 'CRIMSON';
        return {
          id: row.id,
          title: row.title,
          description: row.description || '',
          themeTag,
          jacketStyle,
          jacketTheme,
          tracks: Array.isArray(row.tracks) ? row.tracks : [],
          likes: Number(row.likes) || 0,
          playCount: Number(row.play_count) || 0,
          isPreset: Boolean(row.is_preset),
          createdAt: row.created_at || new Date().toISOString(),
          updatedAt: row.updated_at || new Date().toISOString(),
        };
      });
    }

    return {
      mergedBattles: Array.from(battleMap.values()),
      cloudAlbums,
    };
  } catch {
    return null;
  }
}

export function mergeAlbumsWithCloud(
  localAlbums: Album[],
  cloudAlbums: Album[] | null
): Album[] {
  if (!cloudAlbums || cloudAlbums.length === 0) return localAlbums;

  let deletedSet = new Set<string>();
  try {
    const rawDel = localStorage.getItem(DB_STORAGE_KEYS.DELETED_ALBUMS);
    if (rawDel) {
      const arr = JSON.parse(rawDel);
      if (Array.isArray(arr)) deletedSet = new Set(arr);
    }
  } catch {}

  const mergedMap = new Map<string, Album>();

  for (const cAlb of cloudAlbums) {
    if (!deletedSet.has(cAlb.id)) {
      mergedMap.set(cAlb.id, cAlb);
    }
  }

  for (const lAlb of localAlbums) {
    if (deletedSet.has(lAlb.id)) continue;
    const existing = mergedMap.get(lAlb.id);
    if (!existing) {
      mergedMap.set(lAlb.id, lAlb);
      upsertAlbumToCloud(lAlb);
    } else {
      const localTime = new Date(lAlb.updatedAt || lAlb.createdAt).getTime();
      const cloudTime = new Date(
        existing.updatedAt || existing.createdAt
      ).getTime();
      if (
        localTime >= cloudTime ||
        lAlb.tracks.length > existing.tracks.length
      ) {
        mergedMap.set(lAlb.id, {
          ...existing,
          ...lAlb,
          playCount: Math.max(lAlb.playCount || 0, existing.playCount || 0),
          likes: Math.max(lAlb.likes || 0, existing.likes || 0),
        });
      }
    }
  }

  const result = Array.from(mergedMap.values());
  return result.length > 0 ? result : DEFAULT_ALBUMS;
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

export async function upsertAlbumToCloud(album: Album): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const cleanTag = (album.themeTag || 'BEST BOUTS').split('::')[0];
    const encodedTag = `${cleanTag}::${album.jacketStyle || 'VINYL_LP'}::${
      album.jacketTheme || 'CRIMSON'
    }`;
    await client.from('albums').upsert(
      {
        id: album.id,
        title: album.title,
        description: album.description,
        theme_tag: encodedTag,
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
  try {
    const rawDel = localStorage.getItem(DB_STORAGE_KEYS.DELETED_ALBUMS);
    const delArr: string[] = rawDel ? JSON.parse(rawDel) : [];
    if (!delArr.includes(albumId)) {
      delArr.push(albumId);
      localStorage.setItem(
        DB_STORAGE_KEYS.DELETED_ALBUMS,
        JSON.stringify(delArr)
      );
    }
  } catch {}
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('albums').delete().eq('id', albumId);
  } catch {
    // Non-blocking
  }
}

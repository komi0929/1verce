import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Album,
  AlbumJacketStyle,
  AlbumJacketTheme,
  Battle,
  TournamentTag,
  VideoFormat,
} from '../types';
import { INITIAL_BATTLES } from '../data/initialData';

export const DB_STORAGE_KEYS = {
  BATTLES: '1verce_battles_v6',
  BATTLES_LEGACY: '1verce_battles_v5',
  SAVED: '1verce_saved_v5',
  ALBUMS: '1verce_albums_v2',
  DELETED_ALBUMS: '1verce_deleted_albums_v1',
  DEVICE_ID: '1verce_device_id_v1',
  PLAY_THROTTLE: '1verce_play_throttle_v1',
  BATTLE_REQUESTS: '1verce_requests_v1',
};

export interface BattleRequestItem {
  id: string;
  youtubeId: string;
  url: string;
  note?: string;
  title?: string;
  createdAt: string;
  status: 'sent' | 'pending';
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

const DEFAULT_SUPABASE_URL = 'https://bousfwdffigyvumnzlhy.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvdXNmd2RmZmlneXZ1bW56bGh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxMjMzMTIsImV4cCI6MjEwNzY5OTMxMn0.wchRAj5uFkUot6iRKIjJ6giFjOruXf4bdNgdYWfWBTk';

export function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(DB_STORAGE_KEYS.DEVICE_ID);
    if (existing && existing.length >= 6) return existing;
    const generated = `dev-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    localStorage.setItem(DB_STORAGE_KEYS.DEVICE_ID, generated);
    return generated;
  } catch {
    return 'dev-local';
  }
}

/**
 * Throttles repeated play count increments for the same battle/album within `windowMs` (default 30 min).
 */
export function shouldCountPlay(
  key: string,
  windowMs: number = 30 * 60 * 1000
): boolean {
  if (!key) return false;
  const now = Date.now();
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEYS.PLAY_THROTTLE);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    const last = map[key];
    if (typeof last === 'number' && now - last < windowMs) {
      return false;
    }
    // Prune expired entries to keep storage small
    const nextMap: Record<string, number> = {};
    for (const [k, ts] of Object.entries(map)) {
      if (typeof ts === 'number' && now - ts < windowMs) {
        nextMap[k] = ts;
      }
    }
    nextMap[key] = now;
    localStorage.setItem(
      DB_STORAGE_KEYS.PLAY_THROTTLE,
      JSON.stringify(nextMap)
    );
    return true;
  } catch {
    return true;
  }
}

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

function parseCloudAlbumRow(row: Record<string, unknown>): Album {
  const rawTag = String(row.theme_tag || 'BEST BOUTS');
  const parts = rawTag.split('::');
  const themeTag = parts[0] || 'BEST BOUTS';
  const jacketStyle =
    (row.jacket_style as AlbumJacketStyle) ||
    (parts[1] as AlbumJacketStyle) ||
    'VINYL_LP';
  const jacketTheme =
    (row.jacket_theme as AlbumJacketTheme) ||
    (parts[2] as AlbumJacketTheme) ||
    'CRIMSON';
  const ownerDeviceId =
    (typeof row.owner_device_id === 'string' && row.owner_device_id) ||
    parts[3] ||
    undefined;

  return {
    id: String(row.id),
    title: String(row.title || 'UNTITLED'),
    description: String(row.description || ''),
    themeTag,
    jacketStyle,
    jacketTheme,
    ownerDeviceId,
    tracks: Array.isArray(row.tracks) ? (row.tracks as Album['tracks']) : [],
    likes: Number(row.likes) || 0,
    playCount: Number(row.play_count) || 0,
    isPreset: Boolean(row.is_preset),
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

async function fetchAllCloudBattles(
  client: SupabaseClient
): Promise<Record<string, unknown>[] | null> {
  const pageSize = 1000;
  const maxPages = 10;
  const rows: Record<string, unknown>[] = [];

  for (let page = 0; page < maxPages; page++) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await client
      .from('battles')
      .select('*')
      .order('last_active_at', { ascending: false })
      .range(from, to);

    if (error) {
      return page === 0 ? null : rows;
    }
    if (!data || data.length === 0) break;
    rows.push(...(data as Record<string, unknown>[]));
    if (data.length < pageSize) break;
  }

  return rows;
}

// ============================================================================
// Cloud Sync Operations (Automatic, non-blocking, safe per-device isolation)
// ============================================================================

export async function fetchCloudState(baseBattles: Battle[]): Promise<{
  mergedBattles: Battle[];
  cloudAlbums: Album[] | null;
  communityAlbums: Album[];
} | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const [cloudBattleRows, albumsRes] = await Promise.all([
      fetchAllCloudBattles(client),
      client
        .from('albums')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(200),
    ]);

    if (!cloudBattleRows && albumsRes.error) {
      return null;
    }

    const presetIdSet = new Set(INITIAL_BATTLES.map((b) => b.id));
    const battleMap = new Map<string, Battle>();
    const youtubeIdToBattleId = new Map<string, string>();

    for (const b of baseBattles) {
      battleMap.set(b.id, b);
      youtubeIdToBattleId.set(b.youtubeId, b.id);
    }

    if (cloudBattleRows) {
      for (const row of cloudBattleRows) {
        if (row.is_hidden === true) continue;
        const ytId = String(row.youtube_id || '');
        if (!/^[a-zA-Z0-9_-]{11}$/.test(ytId)) {
          continue;
        }
        const rowId = String(row.id || '');
        if (!rowId) continue;

        const targetId = battleMap.has(rowId)
          ? rowId
          : youtubeIdToBattleId.get(ytId);

        if (targetId && battleMap.has(targetId)) {
          const existing = battleMap.get(targetId)!;
          battleMap.set(targetId, {
            ...existing,
            outboundPlays: Math.max(
              existing.outboundPlays,
              Number(row.outbound_plays) || 0
            ),
            shares: Math.max(existing.shares, Number(row.shares) || 0),
            lastActiveAt:
              typeof row.last_active_at === 'string'
                ? row.last_active_at
                : existing.lastActiveAt,
          });
        } else {
          const isUserSubmitted = Boolean(row.is_user_submitted);
          const sourceVal =
            row.source === 'auto' ||
            row.source === 'user' ||
            row.source === 'preset'
              ? row.source
              : isUserSubmitted
              ? 'user'
              : 'preset';

          // Skip stale preset rows that were deleted from INITIAL_BATTLES
          if (
            !isUserSubmitted &&
            sourceVal !== 'auto' &&
            !presetIdSet.has(rowId)
          ) {
            continue;
          }

          battleMap.set(rowId, {
            id: rowId,
            youtubeId: ytId,
            title: String(row.title || ''),
            mcA: String(row.mc_a || 'MC A'),
            mcB: String(row.mc_b || 'MC B'),
            tournament:
              (row.tournament as Exclude<TournamentTag, 'ALL'>) || '戦極',
            stageOrEvent: String(row.stage_or_event || ''),
            year: String(row.year || new Date().getFullYear()),
            verses: [],
            evaluation: { word: 0, flow: 0, vibe: 0 },
            outboundPlays: Number(row.outbound_plays) || 0,
            shares: Number(row.shares) || 0,
            createdAt: String(row.created_at || new Date().toISOString()),
            lastActiveAt: String(
              row.last_active_at || row.created_at || new Date().toISOString()
            ),
            isUserSubmitted,
            format:
              row.format === 'FULL' ||
              row.format === 'SHORT' ||
              row.format === 'CLIP'
                ? (row.format as VideoFormat)
                : undefined,
            durationSec:
              typeof row.duration_sec === 'number'
                ? row.duration_sec
                : undefined,
            duplicateOf:
              typeof row.duplicate_of === 'string' && row.duplicate_of
                ? row.duplicate_of
                : undefined,
            publishedAt:
              typeof row.published_at === 'string' && row.published_at
                ? row.published_at
                : undefined,
            source: sourceVal,
          });
          youtubeIdToBattleId.set(ytId, rowId);
        }
      }
    }

    const myDeviceId = getOrCreateDeviceId();
    let cloudAlbums: Album[] | null = null;
    const communityAlbums: Album[] = [];

    if (albumsRes.data && albumsRes.data.length > 0) {
      const activeRows = (albumsRes.data as Record<string, unknown>[]).filter(
        (r) => r.is_deleted !== true
      );
      const parsedAll = activeRows.map((r) => parseCloudAlbumRow(r));
      cloudAlbums = parsedAll;
      for (const alb of parsedAll) {
        if (
          !alb.isPreset &&
          !DEFAULT_ALBUMS.some((d) => d.id === alb.id) &&
          alb.ownerDeviceId !== myDeviceId &&
          alb.tracks.length > 0
        ) {
          communityAlbums.push(alb);
        }
      }
    }

    return {
      mergedBattles: Array.from(battleMap.values()),
      cloudAlbums,
      communityAlbums,
    };
  } catch {
    return null;
  }
}

export function mergeAlbumsWithCloud(
  localAlbums: Album[],
  cloudAlbums: Album[] | null,
  sharedTargetAlbumId?: string | null
): Album[] {
  if (!cloudAlbums || cloudAlbums.length === 0) return localAlbums;

  const myDeviceId = getOrCreateDeviceId();
  let deletedSet = new Set<string>();
  try {
    const rawDel = localStorage.getItem(DB_STORAGE_KEYS.DELETED_ALBUMS);
    if (rawDel) {
      const arr = JSON.parse(rawDel);
      if (Array.isArray(arr)) deletedSet = new Set(arr);
    }
  } catch {}

  const localIds = new Set(localAlbums.map((a) => a.id));
  const mergedMap = new Map<string, Album>();

  // 1. Start with local albums (preserving user's personal shelf order and customizations)
  for (const lAlb of localAlbums) {
    if (!deletedSet.has(lAlb.id)) {
      mergedMap.set(lAlb.id, lAlb);
    }
  }

  // 2. Sync playCount/likes or restore albums owned by this device (or explicitly requested via ?album= deep link)
  for (const cAlb of cloudAlbums) {
    if (deletedSet.has(cAlb.id) && cAlb.id !== sharedTargetAlbumId) continue;

    const existing = mergedMap.get(cAlb.id);
    if (existing) {
      mergedMap.set(cAlb.id, {
        ...existing,
        playCount: Math.max(existing.playCount || 0, cAlb.playCount || 0),
        likes: Math.max(existing.likes || 0, cAlb.likes || 0),
      });
    } else if (
      cAlb.ownerDeviceId === myDeviceId ||
      cAlb.id === sharedTargetAlbumId ||
      localIds.has(cAlb.id)
    ) {
      mergedMap.set(cAlb.id, cAlb);
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

  // Never overwrite the global default preset tracks in the cloud when a user customizes their local preset copy;
  // only sync user-created albums or play_count updates.
  const isDefaultPreset = DEFAULT_ALBUMS.some((d) => d.id === album.id);
  const myDeviceId = album.ownerDeviceId || getOrCreateDeviceId();

  try {
    if (isDefaultPreset) {
      const { error: rpcErr } = await client.rpc('increment_album_play', {
        target_album_id: album.id,
      });
      if (rpcErr) {
        await client
          .from('albums')
          .update({
            play_count: album.playCount,
            likes: album.likes,
          })
          .eq('id', album.id);
      }
      return;
    }

    const cleanTag = (album.themeTag || 'BEST BOUTS').split('::')[0];
    const jacketStyle = album.jacketStyle || 'VINYL_LP';
    const jacketTheme = album.jacketTheme || 'CRIMSON';
    const encodedTag = `${cleanTag}::${jacketStyle}::${jacketTheme}::${myDeviceId}`;

    const { error: rpcError } = await client.rpc('upsert_album', {
      p_id: album.id,
      p_owner_device_id: myDeviceId,
      p_title: album.title,
      p_description: album.description,
      p_theme_tag: encodedTag,
      p_jacket_style: jacketStyle,
      p_jacket_theme: jacketTheme,
      p_tracks: album.tracks,
    });

    if (rpcError) {
      await client.from('albums').upsert(
        {
          id: album.id,
          title: album.title,
          description: album.description,
          theme_tag: encodedTag,
          tracks: album.tracks,
          likes: album.likes,
          play_count: album.playCount,
          is_preset: false,
          created_at: album.createdAt,
          updated_at: album.updatedAt,
        },
        { onConflict: 'id' }
      );
    }
  } catch {
    // Non-blocking
  }
}

export async function removeAlbumFromCloud(
  albumId: string,
  ownerDeviceId?: string
): Promise<void> {
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

  // Never delete preset albums or another user's album from the shared Supabase table
  if (DEFAULT_ALBUMS.some((d) => d.id === albumId)) return;
  const myDeviceId = getOrCreateDeviceId();
  if (ownerDeviceId && ownerDeviceId !== myDeviceId) return;

  const client = getSupabaseClient();
  if (!client) return;
  try {
    const { error: rpcError } = await client.rpc('delete_album', {
      p_id: albumId,
      p_owner_device_id: myDeviceId,
    });
    if (rpcError) {
      await client.from('albums').delete().eq('id', albumId);
    }
  } catch {
    // Non-blocking
  }
}

export async function recordAlbumPlayToCloud(albumId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.rpc('increment_album_play', {
      target_album_id: albumId,
    });
  } catch {
    // Non-blocking
  }
}

export async function recordBattlePlayToCloud(battleId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.rpc('increment_battle_play', {
      target_battle_id: battleId,
    });
  } catch {
    // Non-blocking
  }
}

export async function recordBattleShareToCloud(battleId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.rpc('increment_battle_share', {
      target_battle_id: battleId,
    });
  } catch {
    // Non-blocking
  }
}

// ============================================================================
// Battle Request Queue (Weekly Auto-Ingest Candidate Submissions)
// ============================================================================

export function getLocalBattleRequests(): BattleRequestItem[] {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEYS.BATTLE_REQUESTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalBattleRequests(items: BattleRequestItem[]): void {
  try {
    localStorage.setItem(
      DB_STORAGE_KEYS.BATTLE_REQUESTS,
      JSON.stringify(items.slice(0, 50))
    );
  } catch {}
}

export async function submitBattleRequest(input: {
  youtubeId: string;
  url: string;
  note?: string;
  title?: string;
}): Promise<{ ok: boolean; queuedLocally: boolean; alreadyRequested: boolean }> {
  const existing = getLocalBattleRequests();
  const prev = existing.find((r) => r.youtubeId === input.youtubeId);
  if (prev && prev.status === 'sent') {
    return { ok: true, queuedLocally: false, alreadyRequested: true };
  }

  const deviceId = getOrCreateDeviceId();
  const nowIso = new Date().toISOString();
  const cleanNote = input.note?.trim().slice(0, 200) || undefined;
  const item: BattleRequestItem = {
    id: prev?.id || `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    youtubeId: input.youtubeId,
    url: input.url.trim() || `https://www.youtube.com/watch?v=${input.youtubeId}`,
    note: cleanNote,
    title: input.title?.trim() || undefined,
    createdAt: prev?.createdAt || nowIso,
    status: 'pending',
  };

  const client = getSupabaseClient();
  let queuedLocally = true;
  let alreadyRequested = false;

  if (client) {
    try {
      const { error } = await client.from('battle_requests').insert({
        youtube_id: item.youtubeId,
        url: item.url,
        note: cleanNote || null,
        device_id: deviceId,
      });

      if (!error) {
        item.status = 'sent';
        queuedLocally = false;
      } else if (error.code === '23505') {
        // Unique constraint violation on youtube_id -> already requested in cloud
        item.status = 'sent';
        queuedLocally = false;
        alreadyRequested = true;
      }
    } catch {
      queuedLocally = true;
    }
  }

  const nextList = [
    item,
    ...existing.filter((r) => r.youtubeId !== input.youtubeId),
  ];
  saveLocalBattleRequests(nextList);

  return { ok: true, queuedLocally, alreadyRequested };
}

export async function retryPendingBattleRequests(): Promise<void> {
  const list = getLocalBattleRequests();
  const pending = list.filter((r) => r.status === 'pending');
  if (pending.length === 0) return;

  const client = getSupabaseClient();
  if (!client) return;

  const deviceId = getOrCreateDeviceId();
  let changed = false;

  for (const req of pending) {
    try {
      const { error } = await client.from('battle_requests').insert({
        youtube_id: req.youtubeId,
        url: req.url,
        note: req.note || null,
        device_id: deviceId,
      });
      if (!error || error.code === '23505') {
        req.status = 'sent';
        changed = true;
      }
    } catch {
      // Keep pending
    }
  }

  if (changed) {
    saveLocalBattleRequests(list);
  }
}

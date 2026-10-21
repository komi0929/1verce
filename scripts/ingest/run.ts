import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Battle } from '../../src/types';
import { INITIAL_BATTLES } from '../../src/data/initialData';
import { normalizeMcName } from '../../src/utils/youtube';
import {
  CHANNEL_BY_ID,
  OFFICIAL_CHANNELS,
  type OfficialChannel,
} from './channels';
import {
  fetchChannelVideos,
  fetchOEmbed,
  fetchWatchPageMeta,
  fetchWithRetry,
  type FetchedVideo,
} from './youtube';
import {
  classifyByRules,
  refineWithGemini,
  type ClassifiedBattle,
} from './classify';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');
const AUTO_BATTLES_PATH = path.join(REPO_ROOT, 'src/data/autoBattles.json');
const INGEST_META_PATH = path.join(REPO_ROOT, 'src/data/ingestMeta.json');

const DEFAULT_SUPABASE_URL = 'https://bousfwdffigyvumnzlhy.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvdXNmd2RmZmlneXZ1bW56bGh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxMjMzMTIsImV4cCI6MjEwNzY5OTMxMn0.wchRAj5uFkUot6iRKIjJ6giFjOruXf4bdNgdYWfWBTk';

interface CliOptions {
  dryRun: boolean;
  sinceDays: number;
  max: number;
}

function parseArgs(argv: string[]): CliOptions {
  let dryRun = false;
  let sinceDays = 14;
  let max = 60;

  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg.startsWith('--since-days=')) {
      const n = Number(arg.split('=')[1]);
      if (Number.isFinite(n) && n > 0) sinceDays = n;
    } else if (arg.startsWith('--max=')) {
      const n = Number(arg.split('=')[1]);
      if (Number.isFinite(n) && n > 0) max = n;
    }
  }
  return { dryRun, sinceDays, max };
}

function mcPairKey(mcA: string, mcB: string): string {
  const a = normalizeMcName(mcA).toLowerCase();
  const b = normalizeMcName(mcB).toLowerCase();
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

/**
 * 既存のバトルと「本当に同一の試合（別動画・再アップロード）」かどうかを判定する。
 * 同じ大会・同じ年・同じ対戦カードであっても、
 * - 1st Round と 2nd Round（FSL 等）
 * - 決勝1本目 と 決勝2本目（ENTER 等）
 * - (DRAW) と (延長)
 * - 異なる予選・異なる章
 * は別試合（または別ラウンド動画）としてそれぞれカウント・表示できるように区別する。
 */
function normalizeStageSignature(stageOrEvent: string, title: string): string {
  const combined = `${stageOrEvent} ${title}`.normalize('NFKC').toLowerCase();
  const tokens: string[] = [];

  const roundMatch = combined.match(/\b(1st|2nd|3rd|\d+th)\s*round\b|\bround\s*(\d+)/i);
  if (roundMatch) tokens.push(`r:${roundMatch[1] || roundMatch[2]}`);

  const honmeMatch = combined.match(/決勝\s*(\d+)\s*本目/);
  if (honmeMatch) tokens.push(`hon:${honmeMatch[1]}`);

  if (/\(draw\)|ドロー/i.test(combined)) tokens.push('draw');
  if (/\(延長\)|延長戦?/i.test(combined) && !/ノーカット延長込み/.test(combined)) {
    tokens.push('ext');
  }

  const umbQual = combined.match(/([^\s"”/|｜]+予選)/);
  if (umbQual) tokens.push(`qual:${umbQual[1]}`);

  const matchNum = combined.match(/(1回戦|2回戦|3回戦|準々決勝|準決勝|決勝戦?|final|best\s*\d+)\s*(第\d+試合)?/i);
  if (matchNum) tokens.push(`stage:${matchNum[1]}${matchNum[2] || ''}`);

  const chapter = combined.match(/第\d+章/);
  if (chapter) tokens.push(`ch:${chapter[0]}`);

  return tokens.join('|');
}

function findDuplicateOf(
  candidate: ClassifiedBattle,
  existingBattles: Battle[]
): string | undefined {
  const pair = mcPairKey(candidate.mcA, candidate.mcB);
  const candSig = normalizeStageSignature(candidate.stageOrEvent, candidate.title);

  for (const ex of existingBattles) {
    if (ex.duplicateOf) continue;
    if ((ex.format ?? 'FULL') !== 'FULL') continue;
    if (ex.tournament !== candidate.tournament) continue;
    if (ex.year !== candidate.year) continue;
    if (mcPairKey(ex.mcA, ex.mcB) !== pair) continue;

    const exSig = normalizeStageSignature(ex.stageOrEvent || '', ex.title || '');
    // 両方に明確なステージ/ラウンド識別子があり、かつ一致しない場合は別ラウンド/別試合
    if (candSig && exSig && candSig !== exSig) {
      continue;
    }
    // 片方にだけラウンド番号（1st Round / 2nd Round / 決勝1本目 / 延長 等）がある場合も別動画として扱う
    if ((candSig && !exSig) || (!candSig && exSig)) {
      if (/^(?:r:|hon:|draw|ext)/.test(candSig || exSig)) {
        continue;
      }
    }
    return ex.id;
  }
  return undefined;
}

/**
 * Supabase の battle_requests テーブルからユーザーリクエストの youtube_id を取得（テーブル未作成時は空配列）
 */
async function fetchUserRequestedVideoIds(): Promise<string[]> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseKey =
    process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/battle_requests?select=youtube_id,note,created_at&order=created_at.desc&limit=200`;
  try {
    const res = await fetchWithRetry(
      url,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      },
      1
    );
    if (!res.ok) {
      // テーブル未作成 (404 / 400) 等は静かに無視
      return [];
    }
    const rows = (await res.json()) as Array<{ youtube_id?: string }>;
    if (!Array.isArray(rows)) return [];
    const ids = new Set<string>();
    for (const r of rows) {
      const id = (r.youtube_id || '').trim();
      if (/^[\w-]{11}$/.test(id)) ids.add(id);
    }
    return [...ids];
  } catch {
    return [];
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const now = new Date();
  const cutoffMs = now.getTime() - opts.sinceDays * 86_400_000;
  const youtubeApiKey = process.env.YOUTUBE_API_KEY || '';
  const geminiApiKey = process.env.GEMINI_API_KEY || '';

  console.log(
    `[ingest] start (dryRun=${opts.dryRun}, sinceDays=${opts.sinceDays}, max=${opts.max}, cutoff=${new Date(cutoffMs).toISOString()})`
  );

  // 既存の autoBattles.json を読み込み
  let existingAutoBattles: Battle[] = [];
  try {
    const raw = fs.readFileSync(AUTO_BATTLES_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) existingAutoBattles = parsed;
  } catch {
    existingAutoBattles = [];
  }

  // 全既存バトル（PRESET + 既存 autoBattles）の youtubeId セット
  const allExistingBattles: Battle[] = [...INITIAL_BATTLES];
  const seenYoutubeIds = new Set<string>(allExistingBattles.map((b) => b.youtubeId));
  for (const ab of existingAutoBattles) {
    if (!seenYoutubeIds.has(ab.youtubeId)) {
      allExistingBattles.push(ab);
      seenYoutubeIds.add(ab.youtubeId);
    }
  }

  const skippedStats: Record<string, number> = {};
  const bumpSkip = (reason: string) => {
    skippedStats[reason] = (skippedStats[reason] ?? 0) + 1;
  };

  const candidates: {
    video: FetchedVideo;
    channel: OfficialChannel | null;
  }[] = [];

  // 1. 公式チャンネル11件から最新動画を取得
  for (const ch of OFFICIAL_CHANNELS) {
    try {
      const res = await fetchChannelVideos(ch.id, now, youtubeApiKey || undefined);
      console.log(
        `[channel] ${ch.handle} (${ch.id}): fetched ${res.videos.length} videos via ${res.method}`
      );
      for (const v of res.videos) {
        if (seenYoutubeIds.has(v.youtubeId)) {
          bumpSkip('already-exists');
          continue;
        }
        if (v.publishedAt) {
          const pubMs = new Date(v.publishedAt).getTime();
          if (Number.isFinite(pubMs) && pubMs < cutoffMs) {
            bumpSkip('older-than-cutoff');
            continue;
          }
        } else {
          // publishedAt が取得できなかった場合は安全のためスキップ
          bumpSkip('missing-published-at');
          continue;
        }
        candidates.push({ video: v, channel: ch });
      }
    } catch (e) {
      console.warn(`[channel] ${ch.handle} (${ch.id}) failed: ${(e as Error).message}`);
      bumpSkip(`channel-error:${ch.handle}`);
    }
  }

  // 2. Supabase battle_requests からのリクエスト動画を取得（存在する場合）
  const requestedIds = await fetchUserRequestedVideoIds();
  if (requestedIds.length > 0) {
    console.log(`[requests] fetched ${requestedIds.length} user-requested video IDs`);
  }
  for (const reqId of requestedIds) {
    if (seenYoutubeIds.has(reqId) || candidates.some((c) => c.video.youtubeId === reqId)) {
      continue;
    }
    const oembed = await fetchOEmbed(reqId);
    if (!oembed) {
      bumpSkip('request-unavailable');
      continue;
    }
    const meta = await fetchWatchPageMeta(reqId);
    const ch = meta.channelId ? (CHANNEL_BY_ID.get(meta.channelId) ?? null) : null;
    if (!ch) {
      bumpSkip('request-untrusted-channel');
      continue;
    }
    candidates.push({
      video: {
        youtubeId: reqId,
        title: oembed.title,
        channelId: ch.id,
        publishedAt: meta.publishedAt ?? now.toISOString(),
        publishedApprox: !meta.publishedAt,
        durationSec: meta.durationSec,
      },
      channel: ch,
    });
  }

  // 3. ルールベース分類 + （任意）Gemini 検証
  const withRules = candidates.map((c) => ({
    ...c,
    ruleOutcome: classifyByRules(c.video, c.channel, now),
  }));

  const finalOutcomes = await refineWithGemini(withRules, geminiApiKey, now);

  const accepted: ClassifiedBattle[] = [];
  for (const c of withRules) {
    const out = finalOutcomes.get(c.video.youtubeId) ?? c.ruleOutcome;
    if (out.kind === 'skipped') {
      bumpSkip(out.reason);
      continue;
    }
    accepted.push(out.battle);
  }

  // 公開日時の新しい順にソートし、上限 --max 件に絞る
  accepted.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
  const limited = accepted.slice(0, opts.max);
  if (accepted.length > limited.length) {
    bumpSkip('exceeded-max-limit');
  }

  // 4. oEmbed 生存確認 + Battle オブジェクト構築
  const newlyAddedBattles: Battle[] = [];
  for (const item of limited) {
    if (seenYoutubeIds.has(item.youtubeId)) {
      bumpSkip('already-exists');
      continue;
    }
    const oembed = await fetchOEmbed(item.youtubeId);
    if (!oembed) {
      bumpSkip('oembed-unavailable');
      continue;
    }

    const duplicateOf = findDuplicateOf(item, allExistingBattles);
    const newBattle: Battle = {
      id: `auto-${item.youtubeId}`,
      youtubeId: item.youtubeId,
      title: item.title,
      mcA: item.mcA,
      mcB: item.mcB,
      tournament: item.tournament,
      stageOrEvent: item.stageOrEvent,
      year: item.year,
      verses: [],
      evaluation: { word: 0, flow: 0, vibe: 0 },
      outboundPlays: 0,
      shares: 0,
      createdAt: item.publishedAt,
      publishedAt: item.publishedAt,
      mcAFocal: '20% 35%',
      mcBFocal: '80% 35%',
      format: item.format,
      ...(item.durationSec != null ? { durationSec: item.durationSec } : {}),
      ...(duplicateOf ? { duplicateOf } : {}),
      source: 'auto',
    };

    newlyAddedBattles.push(newBattle);
    allExistingBattles.push(newBattle);
    seenYoutubeIds.add(item.youtubeId);
  }

  console.log(`\n[ingest] newly accepted battles: ${newlyAddedBattles.length}`);
  for (const b of newlyAddedBattles) {
    console.log(
      `  + [${b.tournament} ${b.year}] ${b.mcA} vs ${b.mcB} | stage="${b.stageOrEvent}" | id=${b.youtubeId} | pub=${b.publishedAt.slice(0, 10)}${b.duplicateOf ? ` (dupOf=${b.duplicateOf})` : ''}`
    );
  }
  console.log(`[ingest] skipped breakdown:`, skippedStats);

  if (opts.dryRun) {
    console.log('[ingest] --dry-run specified; skipping file writes.');
    return;
  }

  // 既存 autoBattles とマージし、公開日時の新しい順（同日なら id 順）に安定ソート
  const mergedAuto = [...newlyAddedBattles, ...existingAutoBattles];
  mergedAuto.sort((a, b) => {
    const tA = new Date(a.publishedAt || a.createdAt || 0).getTime();
    const tB = new Date(b.publishedAt || b.createdAt || 0).getTime();
    if (tB !== tA) return tB - tA;
    return a.id.localeCompare(b.id);
  });

  const meta = {
    lastRunAt: now.toISOString(),
    lastAddedCount: newlyAddedBattles.length,
    totalAutoBattles: mergedAuto.length,
    skipped: skippedStats,
  };

  fs.writeFileSync(AUTO_BATTLES_PATH, JSON.stringify(mergedAuto, null, 2) + '\n', 'utf8');
  fs.writeFileSync(INGEST_META_PATH, JSON.stringify(meta, null, 2) + '\n', 'utf8');
  console.log(
    `[ingest] wrote ${mergedAuto.length} battles to src/data/autoBattles.json and updated src/data/ingestMeta.json`
  );
}

main().catch((err) => {
  console.error('[ingest] fatal error:', err);
  process.exit(1);
});

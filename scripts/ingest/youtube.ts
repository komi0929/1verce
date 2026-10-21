/**
 * YouTube 取得レイヤー
 *  1. YOUTUBE_API_KEY があれば Data API v3（uploads プレイリスト → videos.list）
 *  2. 無ければチャンネルの /videos ページの ytInitialData を解析（Shorts は含まれない）
 *  3. 最後のフォールバックとして RSS（不安定なので期待しない）
 * どの経路も失敗したチャンネルは例外を投げる → 呼び出し側でログしてスキップする。
 */

export interface FetchedVideo {
  youtubeId: string;
  title: string;
  channelId: string;
  /** ISO8601（Data API / RSS は正確、ページ解析は相対表記からの概算） */
  publishedAt: string | null;
  /** 公開日時が相対表記からの概算かどうか */
  publishedApprox: boolean;
  durationSec: number | null;
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  retries = 3
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) });
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status}`);
      } else {
        return res;
      }
    } catch (e) {
      lastErr = e;
    }
    if (attempt < retries) await sleep(1000 * 2 ** attempt + Math.random() * 500);
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** ISO8601 duration (PT1H2M3S) → 秒 */
export function parseIsoDuration(iso: string | undefined): number | null {
  if (!iso) return null;
  const m = iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  const [, d, h, mi, s] = m.map((x) => (x ? Number(x) : 0));
  return d * 86400 + h * 3600 + mi * 60 + s;
}

/** "7:12" / "1:02:03" → 秒 */
export function parseClockDuration(text: string | undefined): number | null {
  if (!text) return null;
  const m = text.trim().match(/^(\d+):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  return m[3]
    ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
    : Number(m[1]) * 60 + Number(m[2]);
}

/** "3 日前" / "2週間前" / "1 か月前" / "5 hours ago" → 概算 ISO（基準: now） */
export function parseRelativeTime(text: string | undefined, now: Date): string | null {
  if (!text) return null;
  const t = text.replace(/\s+/g, '').replace(/^(?:配信済み|公開済み|Streamed)/i, '');
  const m = t.match(/(\d+)(秒|分|時間|日|週間|か月|ヶ月|ヵ月|カ月|年|second|minute|hour|day|week|month|year)/i);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const sec: Record<string, number> = {
    秒: 1, second: 1,
    分: 60, minute: 60,
    時間: 3600, hour: 3600,
    日: 86400, day: 86400,
    週間: 604800, week: 604800,
    か月: 2592000, ヶ月: 2592000, ヵ月: 2592000, カ月: 2592000, month: 2592000,
    年: 31536000, year: 31536000,
  };
  const s = sec[unit];
  if (!s) return null;
  return new Date(now.getTime() - n * s * 1000).toISOString();
}

// ---------------------------------------------------------------------------
// 1. Data API v3
// ---------------------------------------------------------------------------
async function fetchViaDataApi(channelId: string, apiKey: string): Promise<FetchedVideo[]> {
  const playlistId = 'UU' + channelId.slice(2);
  const plUrl =
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50` +
    `&playlistId=${playlistId}&key=${apiKey}`;
  const plRes = await fetchWithRetry(plUrl);
  if (!plRes.ok) throw new Error(`playlistItems HTTP ${plRes.status}`);
  const pl = (await plRes.json()) as { items?: any[] };
  const ids = (pl.items ?? [])
    .map((it) => it?.contentDetails?.videoId as string | undefined)
    .filter((x): x is string => !!x);
  if (ids.length === 0) return [];

  const vUrl =
    `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${ids.join(',')}` +
    `&key=${apiKey}`;
  const vRes = await fetchWithRetry(vUrl);
  if (!vRes.ok) throw new Error(`videos HTTP ${vRes.status}`);
  const v = (await vRes.json()) as { items?: any[] };
  return (v.items ?? []).map((it) => ({
    youtubeId: it.id,
    title: it.snippet?.title ?? '',
    channelId: it.snippet?.channelId ?? channelId,
    publishedAt: it.snippet?.publishedAt ?? null,
    publishedApprox: false,
    durationSec: parseIsoDuration(it.contentDetails?.duration),
  }));
}

// ---------------------------------------------------------------------------
// 2. チャンネルページ解析（ytInitialData）
// ---------------------------------------------------------------------------
export function extractYtInitialData(html: string): any | null {
  const m =
    html.match(/var ytInitialData = (\{.*?\});<\/script>/s) ??
    html.match(/window\["ytInitialData"\] = (\{.*?\});/s);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

/** オブジェクトツリーを歩いて指定キーのノードを集める */
function collectNodes(root: unknown, key: string, out: any[] = []): any[] {
  const stack: unknown[] = [root];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;
    if (Array.isArray(node)) {
      for (const c of node) stack.push(c);
      continue;
    }
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === key) out.push(v);
      if (v && typeof v === 'object') stack.push(v);
    }
  }
  return out;
}

/** lockupViewModel 内の文字列を全部拾う（構造変化に強くするため） */
function collectStrings(root: unknown, keyName: string, out: string[] = []): string[] {
  for (const v of collectNodes(root, keyName)) {
    if (typeof v === 'string') out.push(v);
  }
  return out;
}

export function parseVideosFromInitialData(
  data: any,
  channelId: string,
  now: Date
): FetchedVideo[] {
  const videos = new Map<string, FetchedVideo>();

  // 新UI: lockupViewModel
  for (const lv of collectNodes(data, 'lockupViewModel')) {
    const id: string | undefined = lv?.contentId;
    if (!id || !/^[\w-]{11}$/.test(id)) continue;
    if (lv?.contentType && lv.contentType !== 'LOCKUP_CONTENT_TYPE_VIDEO') continue;
    const title: string | undefined = lv?.metadata?.lockupMetadataViewModel?.title?.content;
    if (!title) continue;
    const texts = collectStrings(lv?.metadata, 'content');
    const rel = texts.find((t) => /前|ago/.test(t) && /\d/.test(t));
    const badgeTexts = collectStrings(lv?.contentImage, 'text');
    const dur = badgeTexts.map((t) => parseClockDuration(t)).find((x) => x !== null) ?? null;
    const publishedAt = parseRelativeTime(rel, now);
    videos.set(id, {
      youtubeId: id,
      title,
      channelId,
      publishedAt,
      publishedApprox: true,
      durationSec: dur,
    });
  }

  // 旧UI: videoRenderer / gridVideoRenderer
  for (const key of ['videoRenderer', 'gridVideoRenderer']) {
    for (const vr of collectNodes(data, key)) {
      const id: string | undefined = vr?.videoId;
      if (!id || videos.has(id)) continue;
      const title: string =
        vr?.title?.runs?.map((r: any) => r.text).join('') ?? vr?.title?.simpleText ?? '';
      if (!title) continue;
      videos.set(id, {
        youtubeId: id,
        title,
        channelId,
        publishedAt: parseRelativeTime(vr?.publishedTimeText?.simpleText, now),
        publishedApprox: true,
        durationSec: parseClockDuration(vr?.lengthText?.simpleText),
      });
    }
  }
  return [...videos.values()];
}

async function fetchViaChannelPage(channelId: string, now: Date): Promise<FetchedVideo[]> {
  const res = await fetchWithRetry(`https://www.youtube.com/channel/${channelId}/videos`, {
    headers: {
      'User-Agent': UA,
      'Accept-Language': 'ja-JP,ja;q=0.9',
      // EU 同意画面を回避
      Cookie: 'CONSENT=YES+1; SOCS=CAI',
    },
  });
  if (!res.ok) throw new Error(`channel page HTTP ${res.status}`);
  const html = await res.text();
  const data = extractYtInitialData(html);
  if (!data) throw new Error('ytInitialData not found');
  const vids = parseVideosFromInitialData(data, channelId, now);
  if (vids.length === 0) throw new Error('no videos parsed from ytInitialData');
  return vids;
}

// ---------------------------------------------------------------------------
// 3. RSS（最後の手段）
// ---------------------------------------------------------------------------
async function fetchViaRss(channelId: string): Promise<FetchedVideo[]> {
  const res = await fetchWithRetry(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
    { headers: { 'User-Agent': UA } },
    1
  );
  if (!res.ok) throw new Error(`rss HTTP ${res.status}`);
  const xml = await res.text();
  const out: FetchedVideo[] = [];
  for (const entry of xml.split('<entry>').slice(1)) {
    const id = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const title = entry.match(/<title>([^<]*)<\/title>/)?.[1];
    const pub = entry.match(/<published>([^<]+)<\/published>/)?.[1];
    if (!id || !title) continue;
    out.push({
      youtubeId: id,
      title: decodeXml(title),
      channelId,
      publishedAt: pub ? new Date(pub).toISOString() : null,
      publishedApprox: false,
      durationSec: null,
    });
  }
  return out;
}

function decodeXml(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

export interface ChannelFetchResult {
  videos: FetchedVideo[];
  method: 'data-api' | 'channel-page' | 'rss';
  errors: string[];
}

/**
 * 3段フォールバックでチャンネルの最新動画を取得。全滅時は例外。
 * channel-page 解析で直近動画の publishedAt / durationSec が欠落している場合（プレミア公開直後など）、
 * RSS や watch ページからベストエフォートで補完する。
 */
export async function fetchChannelVideos(
  channelId: string,
  now: Date,
  apiKey?: string
): Promise<ChannelFetchResult> {
  const errors: string[] = [];
  if (apiKey) {
    try {
      return { videos: await fetchViaDataApi(channelId, apiKey), method: 'data-api', errors };
    } catch (e) {
      errors.push(`data-api: ${(e as Error).message}`);
    }
  }
  try {
    const videos = await fetchViaChannelPage(channelId, now);
    const missing = videos.filter((v) => !v.publishedAt || v.durationSec == null);
    if (missing.length > 0) {
      // RSS が取れれば正確な publishedAt を補完
      try {
        const rssVids = await fetchViaRss(channelId);
        const rssMap = new Map(rssVids.map((r) => [r.youtubeId, r]));
        for (const v of videos) {
          const r = rssMap.get(v.youtubeId);
          if (r?.publishedAt) {
            v.publishedAt = r.publishedAt;
            v.publishedApprox = false;
          }
        }
      } catch {
        // RSS 失敗は無視
      }
      // それでも publishedAt または durationSec が欠けている先頭数件は watch ページから補完
      const stillMissing = videos.filter((v) => !v.publishedAt || v.durationSec == null).slice(0, 12);
      for (const v of stillMissing) {
        const meta = await fetchWatchPageMeta(v.youtubeId);
        if (!v.publishedAt && meta.publishedAt) {
          v.publishedAt = meta.publishedAt;
          v.publishedApprox = false;
        }
        if (v.durationSec == null && meta.durationSec != null) {
          v.durationSec = meta.durationSec;
        }
      }
    }
    return { videos, method: 'channel-page', errors };
  } catch (e) {
    errors.push(`channel-page: ${(e as Error).message}`);
  }
  try {
    return { videos: await fetchViaRss(channelId), method: 'rss', errors };
  } catch (e) {
    errors.push(`rss: ${(e as Error).message}`);
  }
  throw new Error(errors.join(' / '));
}

/** oEmbed: 存在確認 + タイトル/投稿者取得。401/403/404 は削除・非公開扱いで null。 */
export async function fetchOEmbed(
  youtubeId: string
): Promise<{ title: string; authorName: string; authorUrl: string } | null> {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${youtubeId}`
  )}&format=json`;
  const res = await fetchWithRetry(url, { headers: { 'User-Agent': UA } });
  if (res.status === 401 || res.status === 403 || res.status === 404 || res.status === 400) {
    return null;
  }
  if (!res.ok) throw new Error(`oembed HTTP ${res.status}`);
  const j = (await res.json()) as { title?: string; author_name?: string; author_url?: string };
  if (!j.title) return null;
  return { title: j.title, authorName: j.author_name ?? '', authorUrl: j.author_url ?? '' };
}

/**
 * 動画ページから channelId / publishDate / 長さを取得（リクエスト動画用、ベストエフォート）。
 */
export async function fetchWatchPageMeta(youtubeId: string): Promise<{
  channelId: string | null;
  publishedAt: string | null;
  durationSec: number | null;
}> {
  try {
    const res = await fetchWithRetry(`https://www.youtube.com/watch?v=${youtubeId}`, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'ja-JP', Cookie: 'CONSENT=YES+1; SOCS=CAI' },
    });
    if (!res.ok) return { channelId: null, publishedAt: null, durationSec: null };
    const html = await res.text();
    const channelId = html.match(/"channelId":"(UC[\w-]{22})"/)?.[1] ?? null;
    const pub =
      html.match(/<meta itemprop="datePublished" content="([^"]+)"/)?.[1] ??
      html.match(/"publishDate":"([^"]+)"/)?.[1] ??
      null;
    const lenSec = html.match(/"lengthSeconds":"(\d+)"/)?.[1];
    let publishedAt: string | null = null;
    if (pub) {
      const d = new Date(pub);
      if (!Number.isNaN(d.getTime())) publishedAt = d.toISOString();
    }
    return { channelId, publishedAt, durationSec: lenSec ? Number(lenSec) : null };
  } catch {
    return { channelId: null, publishedAt: null, durationSec: null };
  }
}

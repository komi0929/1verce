import { Battle, VideoFormat } from '../types';
import { INITIAL_BATTLES } from '../data/initialData';

/**
 * Video format classification
 * - FULL  : 試合本編（試合数としてカウントする動画）
 * - SHORT : YouTube ショート（縦型の切り抜き）
 * - CLIP  : 字幕版・解説・リアクション・立体音響・ビート等の関連動画
 *
 * Preset battles carry a pre-verified `format` / `duplicateOf` (checked against YouTube).
 * Battles restored from older localStorage caches or the cloud may lack these fields,
 * so we always re-hydrate from the preset catalog by id, and fall back to title heuristics.
 */

const PRESET_META = new Map<string, Pick<Battle, 'format' | 'duplicateOf' | 'durationSec'>>(
  INITIAL_BATTLES.map((b) => [
    b.id,
    { format: b.format, duplicateOf: b.duplicateOf, durationSec: b.durationSec },
  ])
);

const SHORT_TITLE_RE = /#shorts?\b|#ショート|Short choreography/i;
const CLIP_TITLE_RE =
  /字幕|立体音響|海外の反応|REACTION|リアクション|解説|バトルビート|裏話|警備員が観る|ハイライト|切り抜き|まとめ|名場面|名言/i;

export function inferVideoFormat(title: string, sourceUrl?: string): VideoFormat {
  if (sourceUrl && /youtube\.com\/shorts\//i.test(sourceUrl)) return 'SHORT';
  if (SHORT_TITLE_RE.test(title)) return 'SHORT';
  if (CLIP_TITLE_RE.test(title)) return 'CLIP';
  return 'FULL';
}

export function getBattleFormat(b: Battle): VideoFormat {
  const preset = PRESET_META.get(b.id);
  if (preset?.format) return preset.format;
  if (b.format) return b.format;
  return inferVideoFormat(b.title || '');
}

export function getDuplicateOf(b: Battle): string | undefined {
  const preset = PRESET_META.get(b.id);
  return preset?.format ? preset.duplicateOf : b.duplicateOf;
}

export function getDurationSec(b: Battle): number | undefined {
  return PRESET_META.get(b.id)?.durationSec ?? b.durationSec;
}

/** 試合としてカウントする動画（フル試合 かつ 同一試合の重複アップロードではない） */
export function isCountableMatch(b: Battle): boolean {
  return getBattleFormat(b) === 'FULL' && !getDuplicateOf(b);
}

/** ショート・切り抜き・関連動画 */
export function isClipVideo(b: Battle): boolean {
  return getBattleFormat(b) !== 'FULL';
}

export function formatDuration(sec?: number): string | null {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

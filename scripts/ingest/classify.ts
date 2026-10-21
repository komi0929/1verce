import type { VideoFormat } from '../../src/types';
import {
  normalizeMcName,
  isSameMc,
  detectTournament,
} from '../../src/utils/youtube';
import {
  ALLOWED_TOURNAMENTS,
  type OfficialChannel,
  type Tournament,
} from './channels';
import { fetchWithRetry, type FetchedVideo } from './youtube';

export interface ClassifiedBattle {
  youtubeId: string;
  title: string;
  mcA: string;
  mcB: string;
  tournament: Tournament;
  stageOrEvent: string;
  year: string;
  format: VideoFormat;
  durationSec?: number;
  publishedAt: string;
}

export type ClassifyOutcome =
  | { kind: 'accepted'; battle: ClassifiedBattle }
  | { kind: 'skipped'; reason: string };

// 1on1 試合本編ではない動画を除外する正規表現
const NON_BATTLE_RE =
  /INTERVIEW\s*AFTER\s*THE\s*BATTLE|試合後インタビュー|インタビュー|対談|記者会見|舞台裏|密着|潜入|予告編|告知|CM\b|ティザー|TEASER|TRAILER|ハイライト|highlight|ダイジェスト|まとめ|総集編|振り返り|トーク|とうとう来たなこのトーク|バトル解説|解説動画|This\s*is\s*MC\s*Battle|MCバトルビート|バトルビート|バース集|名場面|名言|切り抜き|リアクション|REACTION|海外の反応|立体音響|クイズ王|組手\d*試合|\d+MC\b|ノーカット全\d+試合|全試合ノーカット|優勝フリースタイル|サイファー|CYPHER|SPライブ|フリーライブ|ショーケース|セルフ解説|MV実況|THE\s*LYRICS|my\s*name\s*is|RECTRUCK|RAPSTAR|\bLive\b|【Live】|\bMV\b|Music\s*Video|OFFICIAL\s*THEME|【REMIX】|\bfeat\.|\bProd[\s.]/i;

// 2on2 / 3on3 / 5on5 / 特殊複数人ルール
const MULTI_MC_RULE_RE =
  /[2345]on[2345]|[2345]対[2345]|タッグ|TAG\s*MATCH|団体戦|一騎当千|アスレチックバース|ドラフトルール|5on5ルール|3on3|2on2|\bTEAM\s+/i;

// 明らかに MC 名ではない語
const INVALID_MC_TOKEN_RE =
  /^(?:TEAM|MC\s*BATTLE|BATTLE|UMB|KOK|KING\s*OF\s*KINGS|ADRENALINE|真\s*ADRENALINE|SPOTLIGHT|FSL|戦極|凱旋|口喧嘩祭|渋谷レゲエ祭|高校生RAP選手権|FINAL|BEST\s*\d+|ROUND\s*\d+|1回戦|2回戦|3回戦|準決勝|決勝戦?|延長戦?|\d+MC)$/i;

/**
 * タイトルから開催年（または公開年）を抽出
 */
function extractYear(rawTitle: string, publishedAt: string | null, now: Date): string {
  const norm = rawTitle.normalize('NFKC');
  // 1. 20xx.mm.dd / 20xx/mm/dd / 20xx年
  const dateMatch = norm.match(/(20\d{2})\s*[./年]\s*\d{1,2}/);
  if (dateMatch) return dateMatch[1];

  // 2. 大会名直後などの 20xx
  const yearMatches = [...norm.matchAll(/(?:^|\D)(20\d{2})(?!\d)/g)].map((m) => Number(m[1]));
  const maxAllowed = now.getFullYear() + 1;
  const validYear = yearMatches.find((y) => y >= 2005 && y <= maxAllowed);
  if (validYear) return String(validYear);

  // 3. 公開日時
  if (publishedAt) {
    const d = new Date(publishedAt);
    if (!Number.isNaN(d.getTime())) return String(d.getUTCFullYear());
  }
  return String(now.getFullYear());
}

/**
 * 大会判定:
 * - KOK チャンネルの MC BATTLE MATSURI 等、タイトルに明示された別大会があればそちらを優先
 * - ただし "KING OF KINGS vs 真 ADRENALINE" のような合同大会はアップロード元チャンネルの大会を優先
 */
function resolveTournament(rawTitle: string, channel: OfficialChannel | null): Tournament | null {
  const norm = rawTitle.normalize('NFKC');

  // BATTLE SUMMIT はどのチャンネルに上がっていても BATTLE SUMMIT
  if (/BATTLE\s*SUMMIT|バトルサミット/i.test(norm)) return 'BATTLE SUMMIT';

  // MC BATTLE MATSURI / 口喧嘩祭 は KOK チャンネルでも口喧嘩祭として扱う
  if (/口喧嘩祭|MC\s*BATTLE\s*MATSURI/i.test(norm)) return '口喧嘩祭';

  // 凱旋チャンネルの「KING OF KINGS 2026への陣」は凱旋の大会
  if (channel?.tournament === '凱旋' && /凱旋/.test(norm)) return '凱旋';

  // KOK vs ADRENALINE 合同大会は投稿チャンネルの大会に従う
  if (
    /KING\s*OF\s*KINGS\s*vs\s*(?:真\s*)?ADRENALINE/i.test(norm) &&
    (channel?.tournament === 'KOK' || channel?.tournament === 'ADRENALINE')
  ) {
    return channel.tournament;
  }

  // チャンネル固定大会があればそれを採用、なければタイトルから判定
  if (channel?.tournament) return channel.tournament;

  const detected = detectTournament(norm);
  if (detected && ALLOWED_TOURNAMENTS.includes(detected)) return detected;
  return null;
}

/**
 * タイトルから MC 名の候補文字列をクリーンアップし、1on1 の単一 MC 名として妥当か検証する
 */
function cleanAndValidateMc(rawSide: string): string | null {
  let s = rawSide
    .normalize('NFKC')
    // 半角カナ長音「ｰ」(NFKC後「ー」)が英字名の間にある場合（例: SHEYｰD / Ryｰlax）はハイフンに統一
    .replace(/([A-Za-z0-9])ー([A-Za-z0-9])/g, '$1-$2')
    // 先頭・末尾の装飾やブラケット類を除去
    .replace(/^(?:【[^】]*】|\[[^\]]*\]|「[^」]*」|『[^』]*』)+\s*/g, '')
    .replace(/\s*(?:【[^】]*】|\[[^\]]*\])$/, '')
    // 末尾のラウンド表記・ルール表記・延長表記などを除去
    .replace(
      /\s*(?:\((?:ノーカット[^)]*|延長[^)]*|DRAW|再戦|1on1[^)]*)\)|（(?:ノーカット[^）]*|延長[^）]*|DRAW|再戦|1on1[^）]*)）)\s*$/gi,
      ''
    )
    .replace(
      /\s+(?:1st\s*Round|2nd\s*Round|3rd\s*Round|Round\s*\d+|全試合|決勝\d*本目|決勝戦?|準決勝|延長戦?|再戦|1回戦|2回戦|3回戦|BEST\s*\d+|FINAL)\s*$/i,
      ''
    )
    .replace(/^["'””「『]+|["'””」』]+$/g, '')
    .trim();

  if (!s) return null;

  // タッグ・複数MC記号が含まれていたら 1on1 ではないので棄却
  // ※ a.k.a. や D-Nut's. や L.B.R.L や A$F などは許可し、& / × / , / 、 / / を弾く
  if (/[&＆×✕,、/／]/.test(s)) return null;
  if (/\b(?:vs|VS)\b/.test(s)) return null;

  // MC☆ニガリ a.k.a 赤い稲妻 等の表記ゆれを吸収
  if (/ニガリ/.test(s) && /赤い稲妻|リアルブッダ/.test(s)) {
    s = 'MCニガリ';
  }

  const normalized = normalizeMcName(s);
  if (!normalized || normalized.length > 28) return null;
  if (INVALID_MC_TOKEN_RE.test(normalized)) return null;
  if (/^\d+MC$/i.test(normalized)) return null;

  return normalized;
}

/**
 * ステージ・イベント名の整形
 */
function cleanStageOrEvent(rawRest: string, bracketHints: string[], tournament: Tournament): string {
  const cleanedBrackets = bracketHints
    .map((b) => b.trim())
    .filter(
      (b) =>
        b &&
        !/^(?:公式字幕動画|再編集版|ベストバウト|ベストバトラー|MCバトルビート|バトル解説.*|1on1|1on1ルール)$/i.test(
          b
        )
    );

  let rest = rawRest
    .normalize('NFKC')
    .replace(/#\S+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 先頭の区切り文字を除去
  rest = rest
    .replace(/^[/／|｜:：\-－―]+\s*/, '')
    .replace(/【1on1(?:ルール)?】/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (rest && cleanedBrackets.length > 0) {
    const b0 = cleanedBrackets[0];
    if (!rest.includes(b0)) {
      return `${rest} (${b0})`.slice(0, 80);
    }
  }
  if (rest) return rest.slice(0, 80);
  if (cleanedBrackets.length > 0) return cleanedBrackets.join(' ').slice(0, 80);
  return `${tournament} OFFICIAL BOUT`;
}

/**
 * ルールベースでの厳密な 1on1 バトル判定・メタデータ抽出
 */
export function classifyByRules(
  video: FetchedVideo,
  channel: OfficialChannel | null,
  now: Date
): ClassifyOutcome {
  const rawTitle = (video.title || '').trim();
  if (!rawTitle) return { kind: 'skipped', reason: 'empty-title' };

  const normTitle = rawTitle.normalize('NFKC');

  // 1. 短尺（60秒未満）または Shorts・CM を除外
  if (video.durationSec !== null && video.durationSec < 60) {
    return { kind: 'skipped', reason: 'too-short' };
  }
  if (/#shorts?\b|#ショート/i.test(normTitle)) {
    return { kind: 'skipped', reason: 'shorts' };
  }

  // 2. 非バトル動画（インタビュー・対談・ビート・まとめ・組手・ライブ等）を除外
  if (NON_BATTLE_RE.test(normTitle)) {
    return { kind: 'skipped', reason: 'non-battle-keyword' };
  }

  // 3. 2on2 / 3on3 / 5on5 / 特殊ルールを除外（ただし GOLDEN TAG 等のイベント名で 1on1 ラウンドの場合は個別判定）
  if (MULTI_MC_RULE_RE.test(normTitle)) {
    // 「真 ADRENALINE 3on3超上決戦」の中の【1on1】試合だけは許可
    const isExplicit1on1 = /【1on1(?:ルール)?】/i.test(normTitle);
    if (!isExplicit1on1) {
      return { kind: 'skipped', reason: 'multi-mc-rule' };
    }
  }

  // 4. 大会判定
  const tournament = resolveTournament(rawTitle, channel);
  if (!tournament || !ALLOWED_TOURNAMENTS.includes(tournament)) {
    return { kind: 'skipped', reason: 'unknown-tournament' };
  }

  // 5. ブラケット情報の退避
  const bracketMatches = [...rawTitle.matchAll(/【([^】]+)】/g)].map((m) => m[1]);

  let mcACandidate: string | null = null;
  let mcBCandidate: string | null = null;
  let restEvent = '';

  // パターンA: UMB 形式 `"MC A vs MC B" UMB2026 ...`
  const umbQuoteMatch = rawTitle.match(/^[""”「『]([^""”」』]+?)[""”」』]\s*(.*)$/);
  if (umbQuoteMatch && /\bvs\b|VS|ＶＳ/i.test(umbQuoteMatch[1])) {
    const inside = umbQuoteMatch[1];
    restEvent = umbQuoteMatch[2] || '';
    const vsSplit = inside.split(/\s*(?:\.?vs\.?|VS|ＶＳ)\s*/i);
    if (vsSplit.length !== 2) {
      return { kind: 'skipped', reason: 'invalid-vs-split' };
    }
    mcACandidate = vsSplit[0];
    mcBCandidate = vsSplit[1];
  } else {
    // 先頭の【公式字幕動画】【再編集版】【決勝戦】などを除去した文字列で解析
    const withoutLeadingBrackets = rawTitle
      .replace(/^(?:\s*【[^】]*】\s*)+/, '')
      .trim();

    // パターンB: FSL トライアウト等の『梵頭 VS Z-TONのすべて！！』形式はまとめ動画なのでスキップ
    if (/のすべて/.test(withoutLeadingBrackets)) {
      return { kind: 'skipped', reason: 'compilation-video' };
    }

    // パターンC: セパレータ（ `｜` `|` `：` `:` ）またはイベント区切りの `/` で「対戦カード部」と「大会名部」を分離
    // 注意: 真ADRENALINE では `MOGURA / DOTAMA / ふぁんく vs ... / 真 ADRENALINE` のように `/` が MC 区切りにも使われる。
    // そのため、まず最初の `vs` を見つけ、`vs` の左側にある `/` は MC 複数人区切りとして扱う（＝スキップ対象）。
    const firstVsMatch = withoutLeadingBrackets.match(/\s*(?:\.?vs\.?|VS|ＶＳ)\s*/i);
    if (!firstVsMatch || firstVsMatch.index === undefined) {
      return { kind: 'skipped', reason: 'no-vs-in-title' };
    }

    const leftOfVs = withoutLeadingBrackets.slice(0, firstVsMatch.index).trim();
    const rightOfVsFull = withoutLeadingBrackets
      .slice(firstVsMatch.index + firstVsMatch[0].length)
      .trim();

    // 左側に `/` `|` `：` が含まれる場合:
    // 例: `FSL T-Pablow` のようなプレフィックスは除去、`/` があれば 3on3 等なので cleanAndValidateMc で弾かれる
    const cleanedLeft = leftOfVs.replace(/^FSL\s+/i, '').trim();

    // 右側を最初のイベント区切り（`|`, `｜`, `:`, `：`, `/`, `／`, `【FSL`）で分割
    let rightMcPart = rightOfVsFull;
    const sepMatch = rightOfVsFull.match(/(?:[|｜:：/／]|【FSL)/);
    if (sepMatch && sepMatch.index !== undefined) {
      rightMcPart = rightOfVsFull.slice(0, sepMatch.index).trim();
      restEvent = rightOfVsFull.slice(sepMatch.index).trim();
      // もし rightMcPart の後にさらに別の MCs が `/` で繋がっていた場合（例: `vs ID / クボタカイ / 真 ADRENALINE`）を検出するため、
      // 分割文字が `/` のとき、直後のトークンが大会名でなければ multi-mc として弾く
      if (sepMatch[0] === '/' || sepMatch[0] === '／') {
        const afterSlash = rightOfVsFull.slice(sepMatch.index + 1).trim();
        const looksLikeEvent =
          /^(?:戦極|凱旋|UMB|KING\s*OF\s*KINGS|KOK|真?\s*ADRENALINE|渋谷レゲエ祭|口喧嘩祭|MC\s*BATTLE|SPOTLIGHT|ENTER\s*MC\s*BATTLE|FSL|BATTLE\s*SUMMIT|20\d{2})/i.test(
            afterSlash.normalize('NFKC')
          );
        if (!looksLikeEvent) {
          return { kind: 'skipped', reason: 'multi-mc-slash' };
        }
      }
    } else {
      // 区切り文字が無い場合（例: `T-Pablow vs R-指定 FSLスペシャルエキシビジョンマッチ` / `BONBERO VS BENJAZZY 1st Round FSL VOL 2...`）
      const tailEventMatch = rightOfVsFull.match(
        /\s+((?:1st\s*Round|2nd\s*Round|3rd\s*Round|Round\s*\d+|全試合|FSL).+)$/i
      );
      if (tailEventMatch && tailEventMatch.index !== undefined) {
        rightMcPart = rightOfVsFull.slice(0, tailEventMatch.index).trim();
        restEvent = tailEventMatch[1].trim();
      }
    }

    mcACandidate = cleanedLeft;
    mcBCandidate = rightMcPart;
  }

  const mcA = mcACandidate ? cleanAndValidateMc(mcACandidate) : null;
  const mcB = mcBCandidate ? cleanAndValidateMc(mcBCandidate) : null;

  if (!mcA || !mcB) {
    return { kind: 'skipped', reason: 'invalid-mc-names' };
  }
  if (isSameMc(mcA, mcB)) {
    return { kind: 'skipped', reason: 'same-mc' };
  }

  // フォーマット判定: 公式字幕動画は CLIP、それ以外の本編は FULL
  const format: VideoFormat = /公式字幕|字幕動画|【字幕】/.test(normTitle) ? 'CLIP' : 'FULL';

  const year = extractYear(rawTitle, video.publishedAt, now);
  const stageOrEvent = cleanStageOrEvent(restEvent, bracketMatches, tournament);
  const publishedAt = video.publishedAt ?? now.toISOString();

  return {
    kind: 'accepted',
    battle: {
      youtubeId: video.youtubeId,
      title: rawTitle,
      mcA,
      mcB,
      tournament,
      stageOrEvent,
      year,
      format,
      ...(video.durationSec != null ? { durationSec: video.durationSec } : {}),
      publishedAt,
    },
  };
}

// ---------------------------------------------------------------------------
// Optional Gemini 2.5 Flash バッチ検証 / 補完（GEMINI_API_KEY 設定時のみ）
// ---------------------------------------------------------------------------
interface GeminiJudgment {
  youtubeId: string;
  is1on1Battle: boolean;
  mcA: string;
  mcB: string;
  tournament: Tournament | null;
  stageOrEvent: string;
  year: string;
}

export async function refineWithGemini(
  candidates: { video: FetchedVideo; channel: OfficialChannel | null; ruleOutcome: ClassifyOutcome }[],
  apiKey: string,
  now: Date
): Promise<Map<string, ClassifyOutcome>> {
  const result = new Map<string, ClassifyOutcome>();
  for (const c of candidates) {
    result.set(c.video.youtubeId, c.ruleOutcome);
  }
  if (!apiKey || candidates.length === 0) return result;

  // ルールで accepted になったもの、または border-line（invalid-mc-names）になったものをバッチで確認
  const toCheck = candidates.filter(
    (c) =>
      c.ruleOutcome.kind === 'accepted' ||
      (c.ruleOutcome.kind === 'skipped' && c.ruleOutcome.reason === 'invalid-mc-names')
  );
  if (toCheck.length === 0) return result;

  const batchSize = 30;
  for (let i = 0; i < toCheck.length; i += batchSize) {
    const chunk = toCheck.slice(i, i + batchSize);
    const payload = chunk.map((c) => ({
      youtubeId: c.video.youtubeId,
      title: c.video.title,
      channelHandle: c.channel?.handle ?? '',
      defaultTournament: c.channel?.tournament ?? null,
      durationSec: c.video.durationSec,
    }));

    const prompt = `あなたは日本語MCバトルの公式YouTube動画分類器です。
以下の動画配列について、1on1のMCバトル試合動画（本編または公式字幕付き試合）かどうかを厳密に判定してください。
- 2on2 / 3on3 / 5on5 / タッグ戦 / 一騎当千 / 組手 / サイファー / インタビュー / 対談 / 解説 / ビート / ハイライト / ライブ / MV は is1on1Battle: false にしてください。
- tournament は ${JSON.stringify(ALLOWED_TOURNAMENTS)} のいずれか、該当しない場合は null にしてください。
- 入力JSON:
${JSON.stringify(payload)}`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const res = await fetchWithRetry(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0,
              responseMimeType: 'application/json',
            },
          }),
        },
        1
      );
      if (!res.ok) continue;
      const data = (await res.json()) as any;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) continue;
      const parsed = JSON.parse(text) as GeminiJudgment[];
      if (!Array.isArray(parsed)) continue;

      for (const g of parsed) {
        const orig = chunk.find((c) => c.video.youtubeId === g.youtubeId);
        if (!orig) continue;
        if (orig.ruleOutcome.kind === 'accepted' && g.is1on1Battle === false) {
          result.set(g.youtubeId, { kind: 'skipped', reason: 'gemini-rejected' });
        } else if (
          orig.ruleOutcome.kind === 'skipped' &&
          g.is1on1Battle &&
          g.tournament &&
          ALLOWED_TOURNAMENTS.includes(g.tournament)
        ) {
          const mcA = cleanAndValidateMc(g.mcA);
          const mcB = cleanAndValidateMc(g.mcB);
          if (mcA && mcB && !isSameMc(mcA, mcB)) {
            result.set(g.youtubeId, {
              kind: 'accepted',
              battle: {
                youtubeId: orig.video.youtubeId,
                title: orig.video.title,
                mcA,
                mcB,
                tournament: g.tournament,
                stageOrEvent: g.stageOrEvent || `${g.tournament} OFFICIAL BOUT`,
                year: g.year || extractYear(orig.video.title, orig.video.publishedAt, now),
                format: 'FULL',
                ...(orig.video.durationSec != null ? { durationSec: orig.video.durationSec } : {}),
                publishedAt: orig.video.publishedAt ?? now.toISOString(),
              },
            });
          }
        }
      }
    } catch {
      // Gemini API エラー時はルールベースの結果をそのまま維持
    }
  }

  return result;
}

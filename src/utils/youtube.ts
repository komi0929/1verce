import { TournamentTag } from '../types';

export function formatTimestamp(totalSeconds: number): string {
  const safeSec = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safeSec / 60);
  const secs = safeSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function parseTimestampInput(input: string): number {
  const cleaned = input.trim().replace(/[\[\]]/g, '');
  if (cleaned.includes(':')) {
    const parts = cleaned.split(':').map((p) => parseInt(p, 10) || 0);
    if (parts.length === 2) {
      return Math.max(0, parts[0] * 60 + parts[1]);
    }
    if (parts.length === 3) {
      return Math.max(0, parts[0] * 3600 + parts[1] * 60 + parts[2]);
    }
  }
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : Math.max(0, num);
}

export function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

export function getYouTubeThumbnail(
  youtubeId: string,
  quality: 'hq' | 'mq' | 'default' | 'maxres' = 'hq'
): string {
  const file =
    quality === 'maxres'
      ? 'maxresdefault.jpg'
      : quality === 'mq'
        ? 'mqdefault.jpg'
        : quality === 'default'
          ? 'default.jpg'
          : 'hqdefault.jpg';
  return `https://i.ytimg.com/vi/${youtubeId}/${file}`;
}

const MC_ALIAS_MAP: Record<string, string> = {
  'r指定': 'R-指定',
  'r-指定': 'R-指定',
  'r-shitei': 'R-指定',
  'mc dotama': 'DOTAMA',
  'dotama': 'DOTAMA',
  'ドタマ': 'DOTAMA',
  'authority': 'Authority',
  'オーソリティ': 'Authority',
  'fork': 'FORK',
  'fork(ice bahn)': 'FORK',
  'fork (ice bahn)': 'FORK',
  'mu-ton': 'MU-TON',
  'muton': 'MU-TON',
  'ムートン': 'MU-TON',
  's-kaine': 'S-kaine',
  'skaine': 'S-kaine',
  'エスケーネ': 'S-kaine',
  '鎮座dopeness': '鎮座DOPENESS',
  '鎮座ドープネス': '鎮座DOPENESS',
  'gil': 'GIL',
  'ギル': 'GIL',
  '呂布カルマ': '呂布カルマ',
  '晋平太': '晋平太',
  '百足': '百足',
  '韻マン': '韻マン',
  'ふぁんく': 'ふぁんく',
  '輪入道': '輪入道',
  'mol53': 'MOL53',
  'rawaxxx': 'MOL53',
  'chico carlito': 'CHICO CARLITO',
  'チコカリート': 'CHICO CARLITO',
  '句潤': '句潤',
  '早雲': '早雲',
  'sam': 'SAM',
  'skryu': 'SKRYU',
  't-pablow': 'T-Pablow',
  't pablow': 'T-Pablow',
  'tpablow': 'T-Pablow',
  'novel core': 'Novel Core',
  'id': 'ID',
  '崇勲': '崇勲',
  'fuma no ktr': 'Fuma no KTR',
  'simon jap': 'SIMON JAP',
  'がーどまん': 'がーどまん',
  'sitissy luvit': 'Sitissy luvit',
  'mcニガリ': 'MCニガリ',
  'mc☆ニガリ': 'MCニガリ',
  'kt-chan': 'KT-CHAN',
  'ktchan': 'KT-CHAN',
  'ktちゃん': 'KT-CHAN',
  '漢 a.k.a. gami': '漢 a.k.a. GAMI',
  '漢 a.k.a gami': '漢 a.k.a. GAMI',
  '漢a.k.a.gami': '漢 a.k.a. GAMI',
  '漢a.k.a gami': '漢 a.k.a. GAMI',
  '漢': '漢 a.k.a. GAMI',
  'mc漢': '漢 a.k.a. GAMI',
  'kan a.k.a. gami': '漢 a.k.a. GAMI',
  '般若': '般若',
  'hannya': '般若',
  'cima': 'CIMA',
  'シーマ': 'CIMA',
  'naika mc': 'NAIKA MC',
  'naika': 'NAIKA MC',
  'ナイカ': 'NAIKA MC',
  'bonbero': 'Bonbero',
  'ボンベロ': 'Bonbero',
  'benjazzy': 'Benjazzy',
  'ベンジャジー': 'Benjazzy',
  'chehon': 'CHEHON',
  'チェホン': 'CHEHON',
  'maka': 'MAKA',
  'マカ': 'MAKA',
  '梵頭': '梵頭',
  'bonzu': '梵頭',
  '9for': '9for',
  'ナインフォー': '9for',
  'mc☆ニガリ a.k.a リアルブッダ': 'MCニガリ',
  'mc☆ニガリ a.k.a. リアルブッダ': 'MCニガリ',
  'mcニガリ a.k.a リアルブッダ': 'MCニガリ',
  'リアルブッダ': 'MCニガリ',
  'rykey': 'RYKEY',
  'rykey daddy dirty': 'RYKEY',
  'rykeydaddydirty': 'RYKEY',
  'leon a.k.a 獅子': 'OZworld',
  'leon a.k.a. 獅子': 'OZworld',
  'leon a.k.a 獅子 (ozworld)': 'OZworld',
  'kenthe390': 'KEN THE 390',
  'ken the 390': 'KEN THE 390',
  'ケンザ390': 'KEN THE 390',
  '¥ellow bucks': '¥ellow Bucks',
  'yellow bucks': '¥ellow Bucks',
  'イエローバックス': '¥ellow Bucks',
  'rude-α': 'Rude-α',
  'rude-a': 'Rude-α',
  'ルードアルファ': 'Rude-α',
  't-tangg': 'T-TANGG',
  'l.b.r.l': 'L.B.R.L',
  'lbrl': 'L.B.R.L',
  'silent killa joint': 'SILENT KILLA JOINT',
  'jumbo maatch': 'JUMBO MAATCH',
  'power wave': 'POWER WAVE',
  'ray': 'RAY',
  'zeebra': 'Zeebra',
  'ジブラ': 'Zeebra',
  'kbd': 'KBD',
  '古武道': 'KBD',
  'golby': 'GOLBY',
  'hidaddy': 'HIDADDY',
  'ヒダディー': 'HIDADDY',
  'bes': 'BES',
  'lick-g': 'Lick-G',
  'koperu': 'KOPERU',
  'g-hope': 'G-HOPE',
  'gotit': 'GOTIT',
  'ミステリオ': 'ミステリオ',
  'かしわ': 'かしわ',
  'だーひー': 'だーひー',
  'dk': 'DK',
  '龍鬼': '龍鬼',
  'red eye': 'Red Eye',
  'redeye': 'Red Eye',
};

export function normalizeMcName(raw: string): string {
  const cleaned = (raw || '')
    // 全角英数・半角カナ等の表記ゆれを吸収（￥→¥、ＦＯＲＫ→FORK、（）→() など）
    .normalize('NFKC')
    // 各種ダッシュ記号をASCIIハイフンへ統一（長音記号「ー」は対象外）
    .replace(/[‐‑‒–—―−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    // ハッシュタグ表記（#呂布カルマ）を除去
    .replace(/^#+\s*/, '')
    .replace(/（.*?）|\(.*?\)/g, '')
    .replace(/^["'「『【]+|["'」』】]+$/g, '')
    .replace(/^MC\s+/i, '')
    .trim();
  const key = cleaned.toLowerCase();
  if (MC_ALIAS_MAP[key]) {
    return MC_ALIAS_MAP[key];
  }
  return cleaned;
}

export function isSameMc(a: string, b: string): boolean {
  return normalizeMcName(a).toLowerCase() === normalizeMcName(b).toLowerCase();
}

function toHiragana(str: string): string {
  return str.replace(/[\u30a1-\u30f6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

const MC_SEARCH_KEYWORDS: Record<string, string[]> = {
  '呂布カルマ': ['りょふかるま', 'りょふ', 'ryoff karma', 'ryofu'],
  'FORK': ['ふぉーく', 'あいすばーん', 'fork', 'ice bahn'],
  'R-指定': ['あーるしてい', 'rしてい', 'r-shitei', 'rshitei', 'creepy nuts'],
  '晋平太': ['しんぺいた', 'shinpeita'],
  '鎮座DOPENESS': ['ちんざどーぷねす', 'ちんざ', 'chinza dopeness'],
  'Authority': ['おーそりてぃ', 'おーそりてぃー', 'authority'],
  'MU-TON': ['むーとん', 'muton', 'mu-ton'],
  'DOTAMA': ['どたま', 'dotama'],
  '百足': ['むかで', 'mukade'],
  '韻マン': ['いんまん', 'inman'],
  'S-kaine': ['えすけーね', 'えすかいね', 'skaine', 's-kaine'],
  'GIL': ['ぎる', 'gil'],
  'ふぁんく': ['ふぁんく', 'funk', '梅田サイファー'],
  '輪入道': ['わにゅうどう', 'wanyudo'],
  'MOL53': ['もるごーさん', 'もる', 'mol53', 'rawaxxx', 'らわっくす'],
  'CHICO CARLITO': ['ちこかりーと', 'ちこ', 'chico carlito'],
  '句潤': ['くじゅん', 'くーる', 'kujun', 'cool'],
  '早雲': ['そううん', 'soun'],
  'SAM': ['さむ', 'sam'],
  'SKRYU': ['すくりゅー', 'skryu'],
  'T-Pablow': ['てぃーぱぶろー', 'ぱぶろー', 'tpablow', 't-pablow', 'bad hop'],
  'Novel Core': ['のべるこあ', 'novel core'],
  'ID': ['あいでぃー', 'id'],
  '崇勲': ['すうくん', 'sukun'],
  'Fuma no KTR': ['ふうまのこたろー', 'ふうま', 'fuma no ktr', 'ktr'],
  'SIMON JAP': ['さいもんじゃっぷ', 'さいもん', 'simon jap'],
  'がーどまん': ['がーどまん', 'guardman'],
  'Sitissy luvit': ['してぃっしーらびっと', 'してぃっしー', 'sitissy luvit'],
  'MCニガリ': ['えむしーにがり', 'にがり', 'mc nigari', 'nigari'],
  '裂固': ['れっこ', 'rekko'],
  '漢 a.k.a. GAMI': ['かん', 'えむしーかん', 'kan', 'gami', '9sari'],
  '般若': ['はんにゃ', 'hannya'],
  'CIMA': ['しーま', 'cima', 'boil rhyme'],
  'NAIKA MC': ['ないかえむしー', 'ないか', 'naika mc'],
  'Bonbero': ['ぼんべろ', 'bonbero'],
  'Benjazzy': ['べんじゃじー', 'benjazzy', 'bad hop'],
  'CHEHON': ['ちぇほん', 'chehon'],
  'MAKA': ['まか', 'maka'],
  '梵頭': ['ぼんず', 'bonzu'],
  '9for': ['ないんふぉー', '9for', 'nine for'],
  'ミメイ': ['みめい', 'mimei'],
  'じょう': ['じょう', 'jo', 'jou'],
  'TERU': ['てる', 'teru'],
  'KT-CHAN': ['けーてぃーちゃん', 'ktちゃん', 'kt-chan', 'ktchan'],
  'チプルソ': ['ちぷるそ', 'tipleso'],
  'GOMESS': ['ごめす', 'gomess'],
  'だーひー': ['だーひー', 'dahi'],
  'Red Eye': ['れっどあい', 'redeye', 'red eye'],
  'Rude-α': ['るーどあるふぁ', 'rude-a', 'rude alpha'],
  'Lick-G': ['りっくじー', 'lick-g', 'lickg'],
  '八咫烏': ['やたがらす', 'yatagarasu'],
  '長瀬': ['ながせ', 'nagase'],
  'G-HOPE': ['じーほーぷ', 'ghope', 'g-hope'],
  'DK': ['でぃーけー', 'dk'],
  'かしわ': ['かしわ', 'kashiwa'],
  'KEN THE 390': ['けんざさんきゅーまる', 'ken the 390'],
  'RYKEY': ['りっきー', 'rykey', 'rykeydaddydirty'],
  'Zeebra': ['じぶら', 'zeebra'],
  'HIDADDY': ['ひだでぃー', 'hidaddy'],
  'OZworld': ['おずわーるど', 'ozworld'],
  'Leon Fanourakis': ['れおんふぁぬらきす', 'leon fanourakis'],
  '¥ellow Bucks': ['いえろーばっくす', 'yellow bucks'],
};

export function matchesMcQuery(
  mcName: string,
  query: string,
  enName?: string,
  styleTag?: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const qHira = toHiragana(q);
  const norm = normalizeMcName(mcName);
  const normLower = norm.toLowerCase();
  const normHira = toHiragana(normLower);

  if (normLower.includes(q) || normHira.includes(qHira)) return true;
  if (enName && enName.toLowerCase().includes(q)) return true;
  if (styleTag && styleTag.toLowerCase().includes(q)) return true;

  const keywords = MC_SEARCH_KEYWORDS[norm];
  if (keywords) {
    for (const kw of keywords) {
      const kwLower = kw.toLowerCase();
      const kwHira = toHiragana(kwLower);
      if (kwLower.includes(q) || kwHira.includes(qHira)) return true;
    }
  }
  return false;
}

export interface ParsedBattleMeta {
  title: string;
  mcA: string;
  mcB: string;
  /** 判定できない場合は null（勝手に「戦極」等へ寄せない） */
  tournament: Exclude<TournamentTag, 'ALL'> | null;
  stageOrEvent: string;
  year: string;
}

/** タイトル（＋チャンネル名）から大会を判定。判定不能なら null */
export function detectTournament(
  text: string
): Exclude<TournamentTag, 'ALL'> | null {
  // 判定順に注意: 口喧嘩祭（MC BATTLE MATSURI）は KOK チャンネルからも配信されるため KOK より先に判定
  if (/凱旋/.test(text)) return '凱旋';
  if (/口喧嘩祭|MC\s*BATTLE\s*MATSURI|MATSURI/i.test(text)) return '口喧嘩祭';
  if (/BATTLE\s*SUMMIT|バトルサミット/i.test(text)) return 'BATTLE SUMMIT';
  if (/SPOTLIGHT|スポットライト/i.test(text)) return 'SPOTLIGHT';
  if (/(?<![A-Za-z])UMB(?![A-Za-z])|ULTIMATE\s*MC\s*BATTLE|CHOICE\s*IS\s*YOURS/i.test(text)) return 'UMB';
  if (/KING\s*OF\s*KINGS|(?<![A-Za-z])KOK(?![A-Za-z])|大抗争|9SARI/i.test(text)) return 'KOK';
  if (/ADRENALINE|アドレナリン/i.test(text)) return 'ADRENALINE';
  if (/(?<![A-Za-z])FSL(?![A-Za-z])|FREE\s*STYLE\s*LEAGUE/i.test(text)) return 'FSL';
  if (/高校生\s*(?:RAP|ラップ)\s*選手権|高ラ/i.test(text)) return '高校生RAP選手権';
  if (/戦極/.test(text)) return '戦極';
  return null;
}

export function parseBattleTitle(
  rawTitle: string,
  authorName: string = ''
): ParsedBattleMeta {
  // タイトルを優先し、タイトルで判定できない時だけチャンネル名を参照する
  const tournament =
    detectTournament(rawTitle.normalize('NFKC')) ??
    detectTournament(authorName.normalize('NFKC'));

  // Extract bracketed tournament / stage info
  const bracketMatches = [...rawTitle.matchAll(/【([^】]+)】|\[([^\]]+)\]/g)]
    .map((m) => m[1] || m[2])
    .filter(Boolean);

  // Clean title before extracting MCs
  const strippedForVs = rawTitle
    .replace(/【[^】]*】|\[[^\]]*\]/g, ' ')
    .replace(/["'””]/g, ' ')
    .replace(/#[^\s]+/g, ' ')
    .trim();

  let mcA = 'MC A';
  let mcB = 'MC B';

  // Look for `A vs B`, `A VS B`, `A × B`, `A .vs. B`
  const vsRegex =
    /([^\s/|｜:：.]+(?:\s*\([^)]+\)|\s*（[^）]+）)?)\s*(?:\.?vs\.?|VS|ＶＳ|×|対)\s*([^\s/|｜:：.]+(?:\s*\([^)]+\)|\s*（[^）]+）)?)/i;
  const vsMatch = strippedForVs.match(vsRegex);

  if (vsMatch) {
    mcA = normalizeMcName(vsMatch[1]);
    // Clean trailing suffix like "決勝戦" or "Full" from mcB
    const rawMcB = vsMatch[2]
      .replace(/(?:決勝戦?|準決勝|延長戦?|1回戦|2回戦|BEST\d+|Full).*$/i, '')
      .trim();
    mcB = normalizeMcName(rawMcB || vsMatch[2]);
  }

  // Extract year if present（無ければ現在の年。固定値にしない）
  const currentYear = new Date().getFullYear();
  const yearMatch = rawTitle.match(/(?:^|\D)(20\d{2})(?!\d)/);
  const year =
    yearMatch && Number(yearMatch[1]) <= currentYear + 1
      ? yearMatch[1]
      : String(currentYear);

  const stageOrEvent =
    bracketMatches.find((b) => !/解説|字幕|ショート|最強/.test(b)) ||
    (tournament ? `${tournament} OFFICIAL ARCHIVE` : '');

  return {
    title: rawTitle,
    mcA,
    mcB,
    tournament,
    stageOrEvent,
    year,
  };
}

export async function fetchYouTubeOEmbed(
  youtubeId: string
): Promise<{ title: string; author_name: string; thumbnail_url: string } | null> {
  const watchUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
  const endpoints = [
    `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`,
    `https://noembed.com/embed?url=${encodeURIComponent(watchUrl)}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (data && data.title) {
          return {
            title: data.title,
            author_name: data.author_name || '',
            thumbnail_url:
              data.thumbnail_url || getYouTubeThumbnail(youtubeId, 'hq'),
          };
        }
      }
    } catch {
      // Try next endpoint
    }
  }
  return null;
}

export type YouTubeVideoCheck =
  | {
      status: 'ok';
      meta: { title: string; author_name: string; thumbnail_url: string };
    }
  /** 非公開・削除済み・存在しないID（oEmbed 400/401/403/404） */
  | { status: 'unavailable'; httpStatus: number }
  /** ネットワークエラー等で判定できない */
  | { status: 'unknown' };

/**
 * 動画の公開状態を oEmbed で確認する。
 * noembed.com はエラー時も HTTP 200 + `{ error: "400 Bad Request" }` を返すため、
 * ブラウザコンソールに不要な 404 ネットワークエラーを出さずに公開可否を判定できる。
 * 失敗時のみ YouTube 公式 oEmbed にフォールバック。
 */
export async function checkYouTubeVideo(
  youtubeId: string
): Promise<YouTubeVideoCheck> {
  const watchUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
  const isUnavailableCode = (code: number) =>
    code === 400 || code === 401 || code === 403 || code === 404;

  try {
    const res = await fetch(
      `https://noembed.com/embed?url=${encodeURIComponent(watchUrl)}`
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.title) {
        return {
          status: 'ok',
          meta: {
            title: data.title,
            author_name: data.author_name || '',
            thumbnail_url:
              data.thumbnail_url || getYouTubeThumbnail(youtubeId, 'hq'),
          },
        };
      }
      const code = parseInt(String(data?.error || ''), 10);
      if (isUnavailableCode(code) || data?.error) {
        return { status: 'unavailable', httpStatus: code || 404 };
      }
    }
  } catch {
    // noembed エラー時は公式 oEmbed へフォールバック
  }

  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.title) {
        return {
          status: 'ok',
          meta: {
            title: data.title,
            author_name: data.author_name || '',
            thumbnail_url:
              data.thumbnail_url || getYouTubeThumbnail(youtubeId, 'hq'),
          },
        };
      }
    } else if (isUnavailableCode(res.status)) {
      return { status: 'unavailable', httpStatus: res.status };
    }
  } catch {
    // 判定不能
  }
  return { status: 'unknown' };
}

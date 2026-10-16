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
  quality: 'hq' | 'maxres' = 'hq'
): string {
  const file = quality === 'maxres' ? 'maxresdefault.jpg' : 'hqdefault.jpg';
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
  const cleaned = raw
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
  tournament: Exclude<TournamentTag, 'ALL'>;
  stageOrEvent: string;
  year: string;
}

export function parseBattleTitle(
  rawTitle: string,
  authorName: string = ''
): ParsedBattleMeta {
  const combined = `${rawTitle} ${authorName}`;

  // Detect Tournament
  let tournament: Exclude<TournamentTag, 'ALL'> = '戦極';
  if (/凱旋/.test(combined)) {
    tournament = '凱旋';
  } else if (/UMB|ULTIMATE\s*MC\s*BATTLE|CHOICE\s*IS\s*YOURS/i.test(combined)) {
    tournament = 'UMB';
  } else if (/KING\s*OF\s*KINGS|KOK|大抗争|9SARI/i.test(combined)) {
    tournament = 'KOK';
  } else if (/ADRENALINE|アドレナリン/i.test(combined)) {
    tournament = 'ADRENALINE';
  } else if (/FSL|FREE\s*STYLE\s*LEAGUE/i.test(combined)) {
    tournament = 'FSL';
  } else if (/高校生\s*(?:RAP|ラップ)\s*選手権|高ラ/i.test(combined)) {
    tournament = '高校生RAP選手権';
  } else if (/戦極/.test(combined)) {
    tournament = '戦極';
  }

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

  // Extract year if present
  const yearMatch = rawTitle.match(/\b(20[0-2]\d)\b/);
  const year = yearMatch ? yearMatch[1] : '2024';

  const stageOrEvent =
    bracketMatches.find((b) => !/解説|字幕|ショート|最強/.test(b)) ||
    `${tournament} OFFICIAL ARCHIVE`;

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

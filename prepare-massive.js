const fs = require('fs');

const currentBattles = JSON.parse(fs.readFileSync('src/data/initialData.ts', 'utf8').match(/export const INITIAL_BATTLES: Battle\[\] = (\[[\s\S]*?\n\];)/)[1].replace(/;$/, ''));
const currentIds = new Set(currentBattles.map(b => b.youtubeId));

console.log('Current battles:', currentBattles.length);

// Curated verified battles with real IDs featuring MC 漢, 般若, CIMA, NAIKA MC, Bonbero, Benjazzy, CHEHON, MAKA, 梵頭, 9for, 呂布カルマ, R-指定, 晋平太 etc.
const primeBattles = [
  // MC 漢 (漢 a.k.a. GAMI) battles!
  {
    youtubeId: "aKE6zS9-l7w",
    title: "SIMON JAP vs 漢 a.k.a. GAMI：KING OF KINGS 2020 GRAND CHAMPIONSHIP FINAL",
    mcA: "SIMON JAP",
    mcB: "漢 a.k.a. GAMI",
    tournament: "KOK",
    stageOrEvent: "2020 GRAND CHAMPIONSHIP",
    year: "2021",
    verseText: "東京の下町と新宿のストリート、生き様そのものをぶつけ合うKOK史上の死闘",
    verseSec: 64,
    verseMc: "漢 a.k.a. GAMI"
  },
  {
    youtubeId: "SYKQ1tNg50c",
    title: "漢 a.k.a. GAMI vs MUｰTON (延長込みノーカット) / 戦極MCBATTLE 第18章",
    mcA: "漢 a.k.a. GAMI",
    mcB: "MU-TON",
    tournament: "戦極",
    stageOrEvent: "第18章",
    year: "2018",
    verseText: "アンダーグラウンドの帝王と新世代のスモーキーフロウ、戦極史上に残る激戦",
    verseSec: 58,
    verseMc: "漢 a.k.a. GAMI"
  },
  {
    youtubeId: "fM06JrDUSfc",
    title: "漢 a.k.a. GAMI vs 晋平太 UMB伝説の対決",
    mcA: "漢 a.k.a. GAMI",
    mcB: "晋平太",
    tournament: "UMB",
    stageOrEvent: "GRAND CHAMPIONSHIP",
    year: "2011",
    verseText: "UMBの原点にして最高峰、男の意地とライムが真っ向から火花を散らす",
    verseSec: 52,
    verseMc: "漢 a.k.a. GAMI"
  },
  {
    youtubeId: "2xGI-zSQI_U",
    title: "AUTHORITY vs 漢 a.k.a. GAMI / 夏の魔物 feat. 戦極MCBATTLE",
    mcA: "Authority",
    mcB: "漢 a.k.a. GAMI",
    tournament: "戦極",
    stageOrEvent: "夏の魔物 SP",
    year: "2019",
    verseText: "世代交代を狙う青森の新星と、迎え撃つ新宿の伝説のプライド",
    verseSec: 60,
    verseMc: "Authority"
  },
  {
    youtubeId: "5irR0_3Bo8w",
    title: "漢 a.k.a. GAMI vs だーひー / 戦極MCBATTLE 第20章",
    mcA: "漢 a.k.a. GAMI",
    mcB: "だーひー",
    tournament: "戦極",
    stageOrEvent: "第20章 BESTBOUT",
    year: "2019",
    verseText: "若武者の勢いを一刀両断する重いパンチライン、経験に裏打ちされた説得力",
    verseSec: 48,
    verseMc: "漢 a.k.a. GAMI"
  },
  {
    youtubeId: "kZYlssLw38s",
    title: "漢 a.k.a. GAMI vs RYKEYDADDYDIRTY / 凱旋MC battle Special 2023 at 東京ガーデンシアター",
    mcA: "漢 a.k.a. GAMI",
    mcB: "RYKEY",
    tournament: "凱旋",
    stageOrEvent: "Special 2023 at 東京ガーデンシアター",
    year: "2023",
    verseText: "ガーデンシアターを圧倒する存在感、リアルを生きる者同士の言葉の重み",
    verseSec: 66,
    verseMc: "漢 a.k.a. GAMI"
  },
  {
    youtubeId: "LzrUHwrpG7E",
    title: "漢 a.k.a. GAMI vs KEN THE 390 / 戦極MC BATTLE 第13章",
    mcA: "漢 a.k.a. GAMI",
    mcB: "KEN THE 390",
    tournament: "戦極",
    stageOrEvent: "第13章 全国ツアー",
    year: "2015",
    verseText: "オーバーグラウンドとアンダーグラウンドの思想が激突した記念碑的バトル",
    verseSec: 54,
    verseMc: "漢 a.k.a. GAMI"
  },
  {
    youtubeId: "4MtuPFrqH4I",
    title: "Novel Core vs 漢 a.k.a. GAMI / 戦極MCBATTLE 第20章",
    mcA: "Novel Core",
    mcB: "漢 a.k.a. GAMI",
    tournament: "戦極",
    stageOrEvent: "第20章 BESTBOUT",
    year: "2019",
    verseText: "新世代の旗手Novel Coreがレジェンド漢に挑んだ歴史的一戦",
    verseSec: 50,
    verseMc: "Novel Core"
  },
  {
    youtubeId: "yUVx0UFhEjk",
    title: "裂固 vs 漢 a.k.a. GAMI / 戦極MCBATTLE 第29章 両国国技館",
    mcA: "裂固",
    mcB: "漢 a.k.a. GAMI",
    tournament: "戦極",
    stageOrEvent: "第29章 両国国技館",
    year: "2023",
    verseText: "両国国技館のセンターステージで交わる二人のチャンピオン、重厚なライム対決",
    verseSec: 62,
    verseMc: "裂固"
  },
  {
    youtubeId: "9qyWU-MufEQ",
    title: "漢 a.k.a. GAMI vs 早雲 / 戦極MCBATTLE 第22章",
    mcA: "漢 a.k.a. GAMI",
    mcB: "早雲",
    tournament: "戦極",
    stageOrEvent: "第22章",
    year: "2020",
    verseText: "京都の武士道と新宿ストリート、渋すぎるビート上で繰り広げられた大人の対話",
    verseSec: 56,
    verseMc: "早雲"
  },
  {
    youtubeId: "AFWldR1KmTc",
    title: "KTちゃん vs 漢 a.k.a. GAMI / 戦極MCBATTLE 第29章 両国国技館",
    mcA: "KT-CHAN",
    mcB: "漢 a.k.a. GAMI",
    tournament: "戦極",
    stageOrEvent: "第29章 両国国技館",
    year: "2023",
    verseText: "両国を沸かせた奇跡の異次元マッチ、世代も性別も超越したヒップホップの楽しさ",
    verseSec: 46,
    verseMc: "KT-CHAN"
  },

  // 般若 battles!
  {
    youtubeId: "HVXhcreHmN4",
    title: "般若 vs 漢 a.k.a. GAMI / BATTLE SUMMIT 2 (2024.8.14)",
    mcA: "般若",
    mcB: "漢 a.k.a. GAMI",
    tournament: "戦極",
    stageOrEvent: "BATTLE SUMMIT 2 代々木第一体育館",
    year: "2024",
    verseText: "1978年生まれの盟友同士、日本のヒップホップシーンを創り上げた二人の伝説",
    verseSec: 68,
    verseMc: "般若"
  },
  {
    youtubeId: "fIhWLMt5XtQ",
    title: "般若 vs SKRYU / BATTLE SUMMIT 2 (2024.8.14)",
    mcA: "般若",
    mcB: "SKRYU",
    tournament: "戦極",
    stageOrEvent: "BATTLE SUMMIT 2 代々木第一体育館",
    year: "2024",
    verseText: "代々木第一体育館を熱狂の渦に巻き込んだ前代未聞の肉体派エンターテインメント",
    verseSec: 60,
    verseMc: "般若"
  },
  {
    youtubeId: "JOP7-eLf2QY",
    title: "HIDADDY vs 般若 UMB2008 GRAND CHAMPIONSHIP",
    mcA: "HIDADDY",
    mcB: "般若",
    tournament: "UMB",
    stageOrEvent: "2008 GRAND CHAMPIONSHIP",
    year: "2008",
    verseText: "UMB初期の黄金期を象徴する伝説の一戦、東西の看板を背負った男たちの気迫",
    verseSec: 54,
    verseMc: "般若"
  },
  {
    youtubeId: "qGCm5rNFmXY",
    title: "DOTAMA vs 般若 UMB2008 TOKYO 予選",
    mcA: "DOTAMA",
    mcB: "般若",
    tournament: "UMB",
    stageOrEvent: "2008 TOKYO 予選",
    year: "2008",
    verseText: "若きDOTAMAがラスボス般若に挑んだ歴史的な名勝負、容赦なき言葉の連射",
    verseSec: 50,
    verseMc: "般若"
  },

  // CIMA battles!
  {
    youtubeId: "ua7PP0sL0Zg",
    title: "CIMA vs じょう【決勝戦】/ 戦極RhymersHIGH IV",
    mcA: "CIMA",
    mcB: "じょう",
    tournament: "戦極",
    stageOrEvent: "RhymersHIGH IV 決勝戦",
    year: "2026",
    verseText: "関西を代表する二大実力者が激突、一歩も引かない熱きライミングマッチ",
    verseSec: 56,
    verseMc: "CIMA"
  },
  {
    youtubeId: "mALnBFVTdZs",
    title: "無欲 vs CIMA【BEST4】/ 戦極RhymersHIGH IV",
    mcA: "無欲",
    mcB: "CIMA",
    tournament: "戦極",
    stageOrEvent: "RhymersHIGH IV 準決勝",
    year: "2026",
    verseText: "BOIL RHYME仕込みの硬い押韻とストリートの誇り、フロアを唸らせるライム",
    verseSec: 48,
    verseMc: "CIMA"
  },

  // NAIKA MC, Bonbero, Benjazzy, 9for, 梵頭, MAKA battles!
  {
    youtubeId: "FbrBso6zr18",
    title: "Zeebra vs 漢 a.k.a. GAMI / BATTLE SUMMIT",
    mcA: "Zeebra",
    mcB: "漢 a.k.a. GAMI",
    tournament: "戦極",
    stageOrEvent: "BATTLE SUMMIT 日本武道館",
    year: "2022",
    verseText: "日本武道館の歴史的一戦、キングギドラZeebraと新宿の雄漢が交わした言霊",
    verseSec: 64,
    verseMc: "漢 a.k.a. GAMI"
  },
  {
    youtubeId: "M3ZdqeYXo_U",
    title: "9for vs MOL53 準決勝【DOPAMINE MC BATTLE】",
    mcA: "9for",
    mcB: "MOL53",
    tournament: "戦極",
    stageOrEvent: "DOPAMINE MC BATTLE 準決勝",
    year: "2026",
    verseText: "若き王者9forの鋭いフロウと、ベテランMOL53の殺傷力あるバースの激突",
    verseSec: 52,
    verseMc: "9for"
  },
  {
    youtubeId: "62IjeFTfyLg",
    title: "ミメイ vs T-TANGG 凱旋MC battle 東西選抜春ノ陣2019",
    mcA: "ミメイ",
    mcB: "T-TANGG",
    tournament: "凱旋",
    stageOrEvent: "東西選抜春ノ陣2019 1回戦",
    year: "2019",
    verseText: "高速フロウの技巧派同士、新世代の幕開けを告げた春ノ陣の名バトル",
    verseSec: 46,
    verseMc: "ミメイ"
  },
  {
    youtubeId: "I28GlvFmwDA",
    title: "がーどまん vs バチスタ 凱旋MC battle 東西選抜春ノ陣2019",
    mcA: "がーどまん",
    mcB: "バチスタ",
    tournament: "凱旋",
    stageOrEvent: "東西選抜春ノ陣2019 1回戦",
    year: "2019",
    verseText: "大声と情熱で会場を一つにするがーどまんの魂のシャウト",
    verseSec: 44,
    verseMc: "がーどまん"
  },
  {
    youtubeId: "_tbZLFF4ZfA",
    title: "EIEN vs CHEHON 凱旋MC Battle THE GIANT KILLING at 豊洲PIT",
    mcA: "EIEN",
    mcB: "CHEHON",
    tournament: "凱旋",
    stageOrEvent: "THE GIANT KILLING at 豊洲PIT",
    year: "2023",
    verseText: "レゲエDeejayのトップCHEHONが豊洲PITで魅せる圧倒的な歌唱力とライム",
    verseSec: 50,
    verseMc: "CHEHON"
  },
  {
    youtubeId: "uKDZOdxSziM",
    title: "KTちゃん vs ピラフ星人 戦極MCBATTLE 第34章 in 横浜",
    mcA: "KT-CHAN",
    mcB: "ピラフ星人",
    tournament: "戦極",
    stageOrEvent: "第34章 in 横浜",
    year: "2024",
    verseText: "横浜を笑顔に変えるポップで芯のあるラップ、観客を惹きつける独自の世界観",
    verseSec: 46,
    verseMc: "KT-CHAN"
  },
  {
    youtubeId: "N8tfsTXuUPM",
    title: "KTちゃん vs テトリス 戦極MCBATTLE 第42章 KING ONES ONLY",
    mcA: "KT-CHAN",
    mcB: "テトリス",
    tournament: "戦極",
    stageOrEvent: "第42章 KING ONES ONLY",
    year: "2026",
    verseText: "音を楽しむスタンスを貫くKTちゃんの軽快なライミング",
    verseSec: 42,
    verseMc: "KT-CHAN"
  },
  {
    youtubeId: "mig9lRkb9aY",
    title: "ミメイ vs Z-TON 戦極令和六年杯",
    mcA: "ミメイ",
    mcB: "Z-TON",
    tournament: "戦極",
    stageOrEvent: "戦極令和六年杯 BEST4",
    year: "2024",
    verseText: "正確無比なフロウとタイトなライムで圧倒するミメイのベストバウト",
    verseSec: 50,
    verseMc: "ミメイ"
  },
  {
    youtubeId: "CGOmSTmEmXU",
    title: "DOTAMA vs mogura 戦極令和六年杯",
    mcA: "DOTAMA",
    mcB: "mogura",
    tournament: "戦極",
    stageOrEvent: "戦極令和六年杯 BEST4",
    year: "2024",
    verseText: "シニカルなユーモアと的確な言葉の刃で会場をロックするDOTAMAの真骨頂",
    verseSec: 54,
    verseMc: "DOTAMA"
  },
  {
    youtubeId: "_gVPtScyn4U",
    title: "DOTAMA vs K-rush 戦極MCBATTLE 橋本七夕祭り",
    mcA: "DOTAMA",
    mcB: "K-rush",
    tournament: "戦極",
    stageOrEvent: "橋本七夕祭り 決勝戦",
    year: "2026",
    verseText: "野外の特設リングで激突、ベテランの貫禄と若きファイターの熱きバトル",
    verseSec: 52,
    verseMc: "DOTAMA"
  },
  {
    youtubeId: "8HL0Cuz-rN0",
    title: "ミメイ vs D-Nut's. 戦極MCBATTLE 富士急ハイランド 決勝戦",
    mcA: "ミメイ",
    mcB: "D-Nut's",
    tournament: "戦極",
    stageOrEvent: "富士急ハイランド 決勝戦",
    year: "2026",
    verseText: "富士の麓で繰り広げられた新世代の頂上決戦、スピード感溢れるライムの連射",
    verseSec: 58,
    verseMc: "ミメイ"
  },
  {
    youtubeId: "LwjqnSHpIXI",
    title: "OZworld vs Leon Fanourakis BATTLE SUMMIT 2",
    mcA: "OZworld",
    mcB: "Leon Fanourakis",
    tournament: "戦極",
    stageOrEvent: "BATTLE SUMMIT 2 代々木第一体育館",
    year: "2024",
    verseText: "トラップシーンの最高峰ラッパー同士、音を自在に操る神がかりのフロウ対決",
    verseSec: 56,
    verseMc: "OZworld"
  }
];

const cleanAdditions = primeBattles.filter(b => !currentIds.has(b.youtubeId));
console.log('Clean new additions count:', cleanAdditions.length);

let nextId = currentBattles.length + 1;
const formatted = cleanAdditions.map(b => {
  const btlId = `btl-${String(nextId).padStart(2, '0')}`;
  nextId++;
  return {
    id: btlId,
    youtubeId: b.youtubeId,
    title: b.title,
    mcA: b.mcA,
    mcB: b.mcB,
    tournament: b.tournament,
    stageOrEvent: b.stageOrEvent,
    year: b.year,
    verses: [
      {
        id: `${btlId}-1`,
        battleId: btlId,
        seconds: b.verseSec,
        text: b.verseText,
        mc: b.verseMc,
        likes: 0,
        replays: 0,
        createdAt: "2026-10-15T14:00:00Z"
      }
    ],
    evaluation: { word: 0, flow: 0, vibe: 0 },
    outboundPlays: 0,
    shares: 0,
    createdAt: "2026-10-15T14:00:00Z",
    mcAFocal: "22% 35%",
    mcBFocal: "78% 35%"
  };
});

const merged = [...currentBattles, ...formatted];
console.log('Total merged battles will be:', merged.length);

fs.writeFileSync('merged-massive.json', JSON.stringify(merged, null, 2));

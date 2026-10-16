const fs = require('fs');

const newProfiles = [
  {
    name: "漢 a.k.a. GAMI",
    enName: "KAN A.K.A. GAMI",
    avatarUrl: "/artists/han.jpg",
    repYoutubeId: "A1dHrq_c450",
    focalPosition: "50% 30%",
    styleTag: "SHINJUKU / REAL HIPHOP"
  },
  {
    name: "般若",
    enName: "HANNYA",
    avatarUrl: "/artists/hannya.jpg",
    repYoutubeId: "HVXhcreHmN4",
    focalPosition: "50% 30%",
    styleTag: "TOKYO STREET / LEGEND"
  },
  {
    name: "CIMA",
    enName: "CIMA (BOIL RHYME)",
    avatarUrl: "/artists/cima.jpg",
    repYoutubeId: "ua7PP0sL0Zg",
    focalPosition: "50% 30%",
    styleTag: "KANSAI / RHYME"
  },
  {
    name: "NAIKA MC",
    enName: "NAIKA MC",
    avatarUrl: "/artists/naika.jpg",
    repYoutubeId: "cqkroqOL0Ew",
    focalPosition: "50% 30%",
    styleTag: "GUNMA / RAW PASSION"
  },
  {
    name: "Bonbero",
    enName: "BONBERO",
    avatarUrl: "/artists/bonbero.jpg",
    repYoutubeId: "7W2HmD8__Z0",
    focalPosition: "50% 30%",
    styleTag: "TRAP / FAST FLOW"
  },
  {
    name: "Benjazzy",
    enName: "BENJAZZY",
    avatarUrl: "/artists/benjazzy.jpg",
    repYoutubeId: "821kuuvCnWE",
    focalPosition: "50% 30%",
    styleTag: "BAD HOP / GOD FLOW"
  },
  {
    name: "CHEHON",
    enName: "CHEHON",
    avatarUrl: "/artists/chehon.jpg",
    repYoutubeId: "vgZHaRdQoJk",
    focalPosition: "50% 30%",
    styleTag: "REGGAE DEEJAY"
  },
  {
    name: "MAKA",
    enName: "MAKA",
    avatarUrl: "/artists/maka.jpg",
    repYoutubeId: "MMHbFMLni8Y",
    focalPosition: "50% 30%",
    styleTag: "TOCHIGI / HARMONY"
  },
  {
    name: "梵頭",
    enName: "BONZU (HIKARU)",
    avatarUrl: "/artists/bonzu.jpg",
    repYoutubeId: "uMUpm1rLdkY",
    focalPosition: "50% 30%",
    styleTag: "GIFU / STREET SMOKE"
  },
  {
    name: "9for",
    enName: "9FOR",
    avatarUrl: "/artists/9for.jpg",
    repYoutubeId: "IDnVqafcKpo",
    focalPosition: "50% 30%",
    styleTag: "KANAGAWA / FLOW & RHYME"
  }
];

let content = fs.readFileSync('src/data/initialData.ts', 'utf8');

// Insert newProfiles before "];\n\nexport const INITIAL_BATTLES"
const targetStr = `  {\n    "name": "裂固",\n    "enName": "REKKO",\n    "avatarUrl": "/artists/rekko.jpg",\n    "repYoutubeId": "lrff0D28kw0",\n    "focalPosition": "18% 35%",\n    "styleTag": "HIDA / HARD WORK"\n  }\n];`;

const newProfilesFormatted = newProfiles.map(p => `  ${JSON.stringify(p, null, 4)}`).join(',\n');
const replacementStr = `  {\n    "name": "裂固",\n    "enName": "REKKO",\n    "avatarUrl": "/artists/rekko.jpg",\n    "repYoutubeId": "lrff0D28kw0",\n    "focalPosition": "18% 35%",\n    "styleTag": "HIDA / HARD WORK"\n  },\n${newProfilesFormatted}\n];`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  console.log('Successfully added new MC Profiles!');
} else {
  console.error('Target string not found for MC Profiles');
}

// Now replace INITIAL_BATTLES with merged-massive.json
const merged = JSON.parse(fs.readFileSync('merged-massive.json', 'utf8'));

// Also zero-out dummy evaluation / outboundPlays / shares in all battles
for (const b of merged) {
  b.evaluation = { word: 0, flow: 0, vibe: 0 };
  b.outboundPlays = 0;
  b.shares = 0;
  for (const v of b.verses) {
    v.likes = 0;
    v.replays = 0;
  }
}

const battlesRegex = /export const INITIAL_BATTLES: Battle\[\] = \[[\s\S]*?\n\];/;
content = content.replace(battlesRegex, `export const INITIAL_BATTLES: Battle[] = ${JSON.stringify(merged, null, 2)};`);

// Also zero-out INITIAL_ANALYTICS dummy numbers
const analyticsRegex = /export const INITIAL_ANALYTICS: AnalyticsData = \{[\s\S]*?\n\};/;
const cleanAnalytics = `export const INITIAL_ANALYTICS: AnalyticsData = {
  totalPv: 0,
  uniqueVisitors: 0,
  totalPlays: 0,
  totalVersesLogged: 0,
  viralShares: 0,
  tournamentTraffic: {
    '戦極': { outboundViews: 0, ctr: 0, verseTriggers: 0 },
    '凱旋': { outboundViews: 0, ctr: 0, verseTriggers: 0 },
    'UMB': { outboundViews: 0, ctr: 0, verseTriggers: 0 },
    'KOK': { outboundViews: 0, ctr: 0, verseTriggers: 0 },
    'ADRENALINE': { outboundViews: 0, ctr: 0, verseTriggers: 0 },
    'FSL': { outboundViews: 0, ctr: 0, verseTriggers: 0 },
    '高校生RAP選手権': { outboundViews: 0, ctr: 0, verseTriggers: 0 },
  },
  mcSearchCounts: {},
};`;
content = content.replace(analyticsRegex, cleanAnalytics);

fs.writeFileSync('src/data/initialData.ts', content);
console.log('src/data/initialData.ts updated with 139 battles, 40 MC profiles, and zero dummy numbers!');

const https = require('https');
const fs = require('fs');

function searchYouTubeIds(query) {
  return new Promise(resolve => {
    https.get('https://www.youtube.com/results?search_query=' + encodeURIComponent(query), {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const matches = data.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/g) || [];
        const unique = [...new Set(matches.map(m => m.replace('/watch?v=', '')))];
        resolve(unique);
      });
    }).on('error', () => resolve([]));
  });
}

function checkOembed(id) {
  return new Promise(resolve => {
    https.get('https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=' + id + '&format=json', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          resolve({ id, title: j.title });
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

const currentBattles = JSON.parse(fs.readFileSync('src/data/initialData.ts', 'utf8').match(/export const INITIAL_BATTLES: Battle\[\] = (\[[\s\S]*?\n\];)/)[1].replace(/;$/, ''));
const currentIds = new Set(currentBattles.map(b => b.youtubeId));

console.log('Current battles:', currentBattles.length);

async function run() {
  const queries = [
    '漢 a.k.a. GAMI vs',
    'MC漢 vs',
    '般若 vs',
    'CIMA vs',
    'NAIKA MC vs',
    'Bonbero vs',
    'Benjazzy vs',
    'CHEHON vs',
    'MAKA vs',
    '梵頭 vs',
    '9for vs',
    '戦極MCBATTLE 決勝',
    '戦極MCBATTLE 準決勝',
    '凱旋MC BATTLE 決勝',
    'KOK 決勝',
    'KOK 準決勝',
    'UMB 決勝',
    '真ADRENALINE 決勝',
    'FSL VOL',
    '高校生RAP選手権 決勝'
  ];

  const candidateIds = new Set();
  for (const q of queries) {
    const ids = await searchYouTubeIds(q);
    ids.forEach(id => {
      if (!currentIds.has(id)) {
        candidateIds.add(id);
      }
    });
  }

  console.log('Total new candidate IDs to test:', candidateIds.size);
  const battleVideos = [];
  for (const id of candidateIds) {
    const res = await checkOembed(id);
    if (res && res.title) {
      const t = res.title;
      if (/[vV][sS]|ｖｓ|×/i.test(t) && !t.includes('3on3') && !t.includes('2on2') && !t.includes('5on5') && !t.includes('&') && !t.includes('ショート') && !t.includes('まとめ')) {
        battleVideos.push({ id, title: t });
      }
    }
  }

  console.log('Verified 1on1 battles:', battleVideos.length);
  fs.writeFileSync('massive-battles.json', JSON.stringify(battleVideos, null, 2));
}

run();

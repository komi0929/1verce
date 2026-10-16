const https = require('https');

function fetchJson(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch(e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

async function check(name) {
  const data = await fetchJson('https://itunes.apple.com/search?term=' + encodeURIComponent(name) + '&entity=album&country=jp&limit=6');
  console.log('===', name, '===');
  if (data && data.results) {
    data.results.forEach(r => {
      console.log(r.collectionName, 'by', r.artistName, ':', r.artworkUrl100?.replace('100x100bb', '600x600bb'));
    });
  }
}

async function run() {
  await check('SAM 舟平');
  await check('SAM Per Life');
  await check('ミメイ');
  await check('じょう 怪物');
  await check('CIMA BOIL RHYME');
  await check('ふぁんく 梅田サイファー');
  await check('がーどまん');
  await check('MAKA 栃木');
  await check('MCニガリ');
  await check('梵頭 HIKIGANE');
  await check('R-指定');
}

run();

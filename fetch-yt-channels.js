const https = require('https');

function fetchHtml(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
      let d = '';
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchHtml(res.headers.location).then(resolve);
      }
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', () => resolve(''));
  });
}

async function test(name, handle) {
  const html = await fetchHtml(`https://www.youtube.com/${handle}`);
  const m = html.match(/property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
            html.match(/content=["']([^"']+)["']\s+property=["']og:image["']/i);
  console.log(name, '=>', m ? m[1] : 'null');
  return m ? m[1] : null;
}

async function run() {
  await test('がーどまん', '@gardman55');
  await test('がーどまん2', '@kyafe_gardman');
  await test('ミメイ', '@mimei_official');
  await test('じょう', '@NA9ES');
  await test('CIMA', '@boilrhyme_official');
  await test('梵頭', '@bonchannel058');
}

run();

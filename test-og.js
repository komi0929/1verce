const https = require('https');

function testOg(name, url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        const m = d.match(/property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                  d.match(/content=["']([^"']+)["']\s+property=["']og:image["']/i);
        console.log(name, '=>', m ? m[1] : 'null');
        resolve(m ? m[1] : null);
      });
    }).on('error', () => resolve(null));
  });
}

async function run() {
  await testOg('Authority', 'https://music.apple.com/jp/artist/authority/1445500142');
  await testOg('ミメイ', 'https://music.apple.com/jp/artist/%E3%83%9F%E3%83%A1%E3%82%A4/1476348267');
  await testOg('SAM', 'https://music.apple.com/jp/artist/sam/1489124571');
  await testOg('KT-CHAN', 'https://music.apple.com/jp/artist/ktchan/1670275640');
}

run();

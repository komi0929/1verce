const https = require('https');
const fs = require('fs');

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

function findImages(html) {
  const ogMatch = html.match(/property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                  html.match(/content=["']([^"']+)["']\s+property=["']og:image["']/i);
  return ogMatch ? ogMatch[1] : null;
}

const targets = [
  { name: 'TERU', url: 'https://www.tunecore.co.jp/artists/teru' },
  { name: 'GIL', url: 'https://www.tunecore.co.jp/artists/gil' },
  { name: '早雲', url: 'https://www.tunecore.co.jp/artists/SOUUN' },
  { name: 'じょう', url: 'https://www.tunecore.co.jp/artists/NA9ES' },
  { name: 'SAM', url: 'https://www.tunecore.co.jp/artists/syuhei' },
  { name: 'ミメイ', url: 'https://www.tunecore.co.jp/artists/mimai' },
  { name: 'がーどまん', url: 'https://music.apple.com/jp/artist/%E3%81%8C%E3%83%BC%E3%81%A9%E3%81%BE%E3%82%93/1498188151' },
  { name: 'MCニガリ', url: 'https://music.apple.com/jp/artist/mc-%E3%83%8B%E3%82%AC%E3%83%AA-a-k-a-%E8%B5%A4%E3%81%84%E7%A8%B2%E5%A5%BB/1044431780' },
  { name: 'CIMA', url: 'https://music.apple.com/jp/artist/cima/1446732360' },
  { name: 'ふぁんく', url: 'https://music.apple.com/jp/artist/%E3%81%B5%E3%81%82%E3%82%93%E3%81%8F/1586524962' },
  { name: 'R-指定', url: 'https://music.apple.com/jp/artist/r-%E6%8C%87%E5%AE%9A/874836069' }
];

async function run() {
  for (const t of targets) {
    const html = await fetchHtml(t.url);
    const img = findImages(html);
    console.log(t.name, '=>', img);
  }
}

run();

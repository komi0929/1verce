const https = require('https');
const fs = require('fs');

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

const queries = [
  { key: 'sam', search: 'SAM 栃木' },
  { key: 'sam_raw', search: 'SAM G-kidd' },
  { key: 'funk', search: 'ふぁんく 梅田' },
  { key: 'mol53', search: 'RAWAXXX' },
  { key: 'mol53_2', search: 'MOL53' },
  { key: 'soun', search: '早雲 WARAJI' },
  { key: 'soun_2', search: '早雲' },
  { key: 'guardman', search: 'がーどまん' },
  { key: 'maka', search: 'MAKA 栃木' },
  { key: 'nigari', search: 'MCニガリ' },
  { key: 'gil', search: 'GIL 福島' },
  { key: 'cima', search: 'CIMA BOIL' },
  { key: 'bonzu', search: '梵頭 HIKARU' },
  { key: 'bonzu_2', search: '梵頭' },
  { key: 'mimei', search: 'ミメイ' },
  { key: 'teru', search: 'TERU 滋賀' },
  { key: 'teru_2', search: 'TERU rapper' },
  { key: 'jou', search: 'じょう' },
  { key: 'tipleso', search: 'チプルソ' },
  { key: 'gomess', search: 'GOMESS' },
  { key: 'redeye', search: 'Red Eye' },
  { key: 'dahi', search: 'だーひー' }
];

async function run() {
  for (const q of queries) {
    const itunes = await fetchJson('https://itunes.apple.com/search?term=' + encodeURIComponent(q.search) + '&country=jp&entity=musicArtist&limit=3');
    if (itunes && itunes.results && itunes.results.length > 0) {
      for (const r of itunes.results) {
        const html = await fetchHtml(r.artistLinkUrl);
        const m = html.match(/property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                  html.match(/content=["']([^"']+)["']\s+property=["']og:image["']/i);
        const og = m ? m[1] : null;
        console.log(q.key, `(${r.artistName}) =>`, og);
        if (og && (og.includes('AMCArtistImages') || og.includes('Features'))) {
          break;
        }
      }
    } else {
      console.log(q.key, '=> No iTunes artist results');
    }
  }
}

run();

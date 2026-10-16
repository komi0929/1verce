const https = require('https');
const fs = require('fs');

function fetchJson(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

function getOgImage(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const m = data.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) || data.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
        resolve(m ? m[1] : null);
      });
    }).on('error', () => resolve(null));
  });
}

function downloadImage(url, dest) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        https.get(res.headers.location, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res2) => {
          const f = fs.createWriteStream(dest);
          res2.pipe(f);
          f.on('finish', () => resolve(fs.statSync(dest).size > 1000));
        });
      } else if (res.statusCode === 200) {
        const f = fs.createWriteStream(dest);
        res.pipe(f);
        f.on('finish', () => resolve(fs.statSync(dest).size > 1000));
      } else {
        resolve(false);
      }
    }).on('error', () => resolve(false));
  });
}

const targets = [
  { name: '漢 a.k.a. GAMI', key: 'han', search: '漢 a.k.a. GAMI' },
  { name: '般若', key: 'hannya', search: '般若' },
  { name: 'CIMA', key: 'cima', search: 'CIMA BOIL RHYME' },
  { name: 'NAIKA MC', key: 'naika', search: 'NAIKA MC' },
  { name: 'Bonbero', key: 'bonbero', search: 'Bonbero' },
  { name: 'Benjazzy', key: 'benjazzy', search: 'Benjazzy' },
  { name: 'CHEHON', key: 'chehon', search: 'CHEHON' },
  { name: 'MAKA', key: 'maka', search: 'MAKA 栃木' },
  { name: '梵頭', key: 'bonzu', search: '梵頭 HIKARU' },
  { name: '9for', key: '9for', search: '9for rapper' }
];

async function run() {
  for (const t of targets) {
    const dest = `public/artists/${t.key}.jpg`;
    // 1. Try Apple Music Artist og:image
    let imgUrl = null;
    const itunes = await fetchJson('https://itunes.apple.com/search?term=' + encodeURIComponent(t.search) + '&entity=musicArtist&limit=3&country=jp');
    if (itunes && itunes.results) {
      for (const r of itunes.results) {
        if (r.artistLinkUrl) {
          const og = await getOgImage(r.artistLinkUrl);
          if (og && !og.includes('apple-touch-icon') && !og.includes('default_music')) {
            imgUrl = og;
            break;
          }
        }
      }
    }

    // 2. If not found, try album artwork
    if (!imgUrl) {
      const alb = await fetchJson('https://itunes.apple.com/search?term=' + encodeURIComponent(t.search) + '&entity=album&limit=1&country=jp');
      if (alb && alb.results && alb.results[0]?.artworkUrl100) {
        imgUrl = alb.results[0].artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg');
      }
    }

    if (imgUrl) {
      const ok = await downloadImage(imgUrl, dest);
      console.log(t.name, '=> downloaded:', ok, imgUrl);
    } else {
      console.log(t.name, '=> NOT FOUND');
    }
  }
}

run();

const https = require('https');
const fs = require('fs');

function fetchText(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
      let data = '';
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchText(res.headers.location).then(resolve);
      }
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
  });
}

async function findOgImage(url) {
  const html = await fetchText(url);
  const m = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
            html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  return m ? m[1] : null;
}

async function main() {
  const pages = [
    { name: 'Authority', url: 'https://natalie.mu/music/news/489957' }, // Battle Summit winner Authority
    { name: 'ふぁんく', url: 'https://natalie.mu/music/artist/116932' },
    { name: 'SAM', url: 'https://natalie.mu/music/news/439736' },
    { name: 'CIMA', url: 'https://natalie.mu/music/news/462947' },
    { name: 'MCニガリ', url: 'https://natalie.mu/music/news/126079' },
    { name: 'チプルソ', url: 'https://natalie.mu/music/artist/18972' },
    { name: 'KTちゃん', url: 'https://natalie.mu/music/artist/124705' },
    { name: 'じょう', url: 'https://natalie.mu/music/news/200057' },
    { name: 'Red Eye', url: 'https://natalie.mu/music/artist/110594' },
    { name: 'GOMESS', url: 'https://natalie.mu/music/artist/77353' },
    { name: 'がーどまん', url: 'https://natalie.mu/music/artist/121858' }
  ];

  for (const p of pages) {
    const og = await findOgImage(p.url);
    console.log(p.name, '=>', og);
  }
}

main();

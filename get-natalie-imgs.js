const https = require('https');

https.get('https://natalie.mu/music/news/389823', { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const m = [...d.matchAll(/https:\/\/ogre\.natalie\.mu\/media\/news\/music\/2020\/0731\/[^\s"']+/gi)];
    console.log([...new Set(m.map(x => x[0]))]);
  });
});

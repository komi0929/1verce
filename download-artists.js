const https = require('https');
const fs = require('fs');
const path = require('path');

const artistMap = {
  'ryoff': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/54/Ryoffkarma-outdoor-live.jpg/500px-Ryoffkarma-outdoor-live.jpg',
  'fork': 'https://is1-ssl.mzstatic.com/image/thumb/Music/8f/b0/2c/mzi.xnjjaahc.jpg/600x600bb.jpg',
  'r_shitei': 'https://is1-ssl.mzstatic.com/image/thumb/Features221/v4/85/f5/ee/85f5ee0a-3710-3b75-4477-fcdd0f6bc9ba/mzl.kqicplhp.png/600x600bb.jpg',
  'shinpeita': 'https://is1-ssl.mzstatic.com/image/thumb/Features124/v4/e1/32/07/e1320796-c6c8-5f3b-1565-50c303b52e53/pr_source.png/600x600bb.jpg',
  'chinza': 'https://is1-ssl.mzstatic.com/image/thumb/AMCArtistImages126/v4/54/bc/85/54bc855a-18d4-8c09-65f8-4ccc9e279ab3/491afe77-2adb-4e79-ab44-822fffeb5826_file_cropped.png/600x600bb.jpg',
  'authority': 'https://is1-ssl.mzstatic.com/image/thumb/Features125/v4/b7/37/09/b73709de-5e70-3ae3-f675-d1d700029d32/mzm.zxgudqvp.jpg/600x600bb.jpg',
  'muton': 'https://is1-ssl.mzstatic.com/image/thumb/Features114/v4/65/fe/20/65fe20b2-ac9f-a987-cc4f-a062241552a7/mzl.avmmsber.jpg/600x600bb.jpg',
  'dotama': 'https://is1-ssl.mzstatic.com/image/thumb/AMCArtistImages126/v4/df/09/cb/df09cb06-ddea-72ba-319b-060a14d9b539/b78b84d9-4a05-402a-8c22-ea9f2ca1fd0f_ami-identity-753276d511961e0326fa4163c55e0069-2023-01-28T09-18-01.483Z_cropped.png/600x600bb.jpg',
  'mukade': 'https://is1-ssl.mzstatic.com/image/thumb/AMCArtistImages211/v4/09/aa/47/09aa479f-7fd4-b6e1-a73c-7c2d4cf85f5b/file_cropped.png/600x600bb.jpg',
  'inman': 'https://is1-ssl.mzstatic.com/image/thumb/AMCArtistImages211/v4/d5/93/7d/d5937d81-6031-d505-8e2c-202b9969dae1/ami-identity-a44a7ba5044b05e3e515b058e103942b-2025-04-08T14-18-19.486Z_cropped.png/600x600bb.jpg',
  'skaine': 'https://is1-ssl.mzstatic.com/image/thumb/AMCArtistImages221/v4/b5/0e/79/b50e7948-a66e-0a1b-c1a5-a8aace8a39e0/file_cropped.png/600x600bb.jpg',
  'gil': 'https://is1-ssl.mzstatic.com/image/thumb/AMCArtistImages221/v4/89/5d/d8/895dd8f2-d204-8219-63ea-be67fab9d78d/ami-identity-06a2c233dad4e1410b8685c9abd4ab33-2026-03-20T13-24-33.453Z_cropped.png/600x600bb.jpg',
  'funk': 'https://is1-ssl.mzstatic.com/image/thumb/Music123/v4/c6/fa/86/c6fa86b9-35bf-2ab2-a0e4-13cf42444824/081860_J.jpg/600x600bb.jpg',
  'wanyudo': 'https://is1-ssl.mzstatic.com/image/thumb/Features126/v4/62/7e/30/627e3038-277f-e2f3-78f3-9b11fcf54c4c/mzl.wslxysmh.jpg/600x600bb.jpg',
  'mol53': 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/43/34/35/43343526-28ed-f513-5787-e4b0037b87fe/SGKC-012.jpg/600x600bb.jpg',
  'chico': 'https://is1-ssl.mzstatic.com/image/thumb/AMCArtistImages126/v4/08/d9/ad/08d9ad6e-90f9-1d77-cabe-d9f0ebdeda86/777fbac0-38c4-4629-bbf7-f722730ac1ed_ami-identity-6ced06236fd6d5deeb18735df2192a66-2023-06-28T15-33-14.630Z_cropped.png/600x600bb.jpg',
  'cool': 'https://is1-ssl.mzstatic.com/image/thumb/Features126/v4/6d/9e/2f/6d9e2fd1-620b-bb52-8f36-e4b165cb5687/mzl.ywfobxcf.jpg/600x600bb.jpg',
  'soun': 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/98/e0/57/98e0573f-52c5-b8bf-f2cf-6246d055c60d/dj.kmbgqmzy.jpg/600x600bb.jpg',
  'sam': 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/58/2e/96/582e967f-3f9b-156c-f8cc-3542d0f18ccc/859755440810_cover.jpg/600x600bb.jpg',
  'skryu': 'https://is1-ssl.mzstatic.com/image/thumb/AMCArtistImages221/v4/68/7f/11/687f11e0-c82e-b788-b8f0-149842326af1/ami-identity-618e56daafe386c750dffc8cde6bed06-2026-06-25T08-03-12.569Z_cropped.png/600x600bb.jpg',
  'tpablow': 'https://is1-ssl.mzstatic.com/image/thumb/Features125/v4/e6/33/9d/e6339d48-ba91-c57a-8419-9aca59423004/mzl.ucsgakkc.png/600x600bb.jpg',
  'novel_core': 'https://is1-ssl.mzstatic.com/image/thumb/AMCArtistImages211/v4/7a/38/ed/7a38ed9e-6a48-658a-b7fc-c03fdfd3578f/ami-identity-3fe07474a17e1fad52c6d58d83c1d2ad-2025-10-07T16-42-46.762Z_cropped.png/600x600bb.jpg',
  'id': 'https://is1-ssl.mzstatic.com/image/thumb/AMCArtistImages211/v4/17/f0/a7/17f0a76e-d7e0-adcb-541e-d21900ec7308/ami-identity-f59ce5d57212ea5c52396e5f4563f03f-2026-02-21T12-26-33.233Z_cropped.png/600x600bb.jpg',
  'sukun': 'https://is1-ssl.mzstatic.com/image/thumb/Features126/v4/7c/5f/93/7c5f9371-baeb-5620-88ec-50f22cd01ec2/mzl.twuwlpyd.jpg/600x600bb.jpg',
  'fuma': 'https://is1-ssl.mzstatic.com/image/thumb/AMCArtistImages126/v4/a8/01/cc/a801cc94-8feb-cf00-7169-4db65b175cdc/387c4f1a-97ab-4573-8ba7-1f1d5839817c_file_cropped.png/600x600bb.jpg',
  'simon_jap': 'https://is1-ssl.mzstatic.com/image/thumb/Features114/v4/c4/2a/53/c42a5329-97eb-7621-e051-7ad9f2098b26/mzl.abxqjbyi.jpg/600x600bb.jpg',
  'guardman': 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/fa/d3/19/fad319a4-f98a-4e01-9bbd-d8d2c4a641b3/859755451151_cover.jpg/600x600bb.jpg',
  'sitissy': 'https://is1-ssl.mzstatic.com/image/thumb/AMCArtistImages122/v4/3a/8b/4e/3a8b4e8b-6793-b36f-be99-8b68b8b95ab7/713348ed-5c70-49e5-b2d4-0e8c31c049cc_file_cropped.png/600x600bb.jpg',
  'nigari': 'https://is1-ssl.mzstatic.com/image/thumb/Music71/v4/c6/04/0d/c6040d15-0af2-7e83-f7dd-90e52bf4901a/mc_battle_0913.jpg/600x600bb.jpg',
  'rekko': 'https://is1-ssl.mzstatic.com/image/thumb/Features112/v4/4a/89/74/4a8974b4-0730-6bf1-369d-07fbb259f923/mzl.bgvgchte.jpeg/600x600bb.jpg'
};

function download(name, url) {
  return new Promise((resolve) => {
    const ext = url.includes('.png') ? '.png' : '.jpg';
    const filePath = path.join(__dirname, 'public', 'artists', `${name}${ext}`);
    const file = fs.createWriteStream(filePath);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        https.get(res.headers.location, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res2) => {
          res2.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log(`Saved ${name}${ext} (${fs.statSync(filePath).size} bytes)`);
            resolve({ name, file: `${name}${ext}` });
          });
        });
      } else {
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`Saved ${name}${ext} (${fs.statSync(filePath).size} bytes)`);
          resolve({ name, file: `${name}${ext}` });
        });
      }
    }).on('error', (err) => {
      console.error(`Failed ${name}:`, err.message);
      resolve(null);
    });
  });
}

async function run() {
  const results = {};
  for (const [key, url] of Object.entries(artistMap)) {
    const res = await download(key, url);
    if (res) {
      results[key] = `/artists/${res.file}`;
    }
  }
  fs.writeFileSync('artist-manifest.json', JSON.stringify(results, null, 2));
  console.log('Manifest written successfully!');
}

run();

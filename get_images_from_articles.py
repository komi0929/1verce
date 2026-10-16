import urllib.request
import re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

urls = {
    'kaiyou_hs4': 'https://kai-you.net/article/15501',
    'gotit_art': 'https://kai-you.net/article/95864',
    'kbd_cocotame': 'https://cocotame.jp/series/artist/umedacypher02/'
}

for name, u in urls.items():
    try:
        req = urllib.request.Request(u, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            imgs = re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', html)
            filtered = [i for i in imgs if not any(x in i for x in ['logo', 'icon', 'banner', 'avatar', 'common'])]
            print(f"=== {name} ===")
            for f in filtered[:10]:
                print(f)
    except Exception as e:
        print(f"Error {name}: {e}")

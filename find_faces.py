import urllib.request
import re
import json

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

urls = [
    # GOLBY
    "https://mikiki.tokyo.jp/articles/-/8672",
    "https://diskunion.net/hiphop/ct/detail/1006856515",
    # KBD
    "https://cocotame.jp/series/artist/umedacypher02/",
    "https://kai-you.net/article/68832",
    # DK
    "https://big-up.style/artists/165935",
    # GOTIT
    "https://diskunion.net/hiphop/ct/detail/1006277189"
]

for u in urls:
    try:
        req = urllib.request.Request(u, headers=headers)
        with urllib.request.urlopen(req, timeout=8) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            imgs = re.findall(r'<meta[^>]+property=["\']og:image["\']\s+content=["\']([^"\']+)["\']', html)
            if not imgs:
                imgs = re.findall(r'<meta[^>]+content=["\']([^"\']+)["\']\s+property=["\']og:image["\']', html)
            print(u, "->", imgs)
    except Exception as e:
        print(u, "-> ERR:", e)

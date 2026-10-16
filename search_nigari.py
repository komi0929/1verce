import urllib.request
import re

urls = [
    'https://kai-you.net/article/9380',
    'https://kai-you.net/article/15501',
    'https://kai-you.net/article/43551'
]

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
for u in urls:
    req = urllib.request.Request(u, headers=headers)
    with urllib.request.urlopen(req) as resp:
        h = resp.read().decode('utf-8', errors='ignore')
        t = re.search(r'<title>([^<]+)</title>', h)
        og = re.search(r'property="og:image"\s+content="([^"]+)"', h)
        title = t.group(1)[:40] if t else 'none'
        img = og.group(1) if og else 'none'
        print(f"{title} | {img}")

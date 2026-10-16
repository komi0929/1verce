import urllib.request
import re
from PIL import Image
import io

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

# 1. Download GOLBY
try:
    url = "https://mikiki.ismcdn.jp/mwimgs/b/3/-/img_b34464c6b4026114eaa916f3544e272a60362.jpg"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as resp:
        im = Image.open(io.BytesIO(resp.read())).convert('RGB')
        w, h = im.size
        dim = min(w, h)
        left = (w - dim) // 2
        top = 0
        im.crop((left, top, left + dim, top + dim)).resize((500, 500), Image.Resampling.LANCZOS).save('public/artists/golby.jpg', 'JPEG', quality=92)
        print("GOLBY saved successfully!")
except Exception as e:
    print("GOLBY err:", e)

# 2. Download DK
try:
    url = "https://img.big-up.style/users/23/273723/artist/165935/default_f738d54369fa8ec120c39e260db3d820.jpg"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as resp:
        im = Image.open(io.BytesIO(resp.read())).convert('RGB')
        w, h = im.size
        dim = min(w, h)
        left = (w - dim) // 2
        top = 0
        im.crop((left, top, left + dim, top + dim)).resize((500, 500), Image.Resampling.LANCZOS).save('public/artists/dk.jpg', 'JPEG', quality=92)
        print("DK saved successfully!")
except Exception as e:
    print("DK err:", e)

# 3. Inspect Kai-You articles
for u in ['https://kai-you.net/article/68832', 'https://kai-you.net/article/95864']:
    try:
        req = urllib.request.Request(u, headers=headers)
        with urllib.request.urlopen(req) as resp:
            h = resp.read().decode('utf-8', errors='ignore')
            t = re.search(r'<title>([^<]+)</title>', h)
            og = re.search(r'property=["\']og:image["\']\s+content=["\']([^"\']+)["\']', h)
            title = t.group(1)[:50] if t else 'none'
            og_img = og.group(1) if og else 'none'
            print(u, "->", title, "->", og_img)
    except Exception as e:
        print(u, "-> ERR:", e)

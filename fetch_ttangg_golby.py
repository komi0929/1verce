import urllib.request
import re
from PIL import Image
import io
import os

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

# 1. T-TANGG official site
try:
    url = "https://www.tangg134.com/img/profile/profile02.webp"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as resp:
        im = Image.open(io.BytesIO(resp.read())).convert('RGB')
        # Center crop
        w, h = im.size
        dim = min(w, h)
        left = (w - dim) // 2
        top = (h - dim) // 4  # face is in upper part
        im.crop((left, top, left + dim, top + dim)).resize((500, 500), Image.Resampling.LANCZOS).save('public/artists/ttangg.jpg', 'JPEG', quality=92)
        print("T-TANGG saved successfully!")
except Exception as e:
    print("T-TANGG err:", e)

# 2. GOLBY from Mikiki article
try:
    url = "https://mikiki.tokyo.jp/articles/-/8672"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        m = re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', html)
        for img_url in m:
            if 'image' in img_url or '8672' in img_url or 'jpg' in img_url:
                if not img_url.startswith('http'):
                    img_url = 'https://mikiki.tokyo.jp' + img_url
                print("GOLBY candidate:", img_url)
                req2 = urllib.request.Request(img_url, headers=headers)
                with urllib.request.urlopen(req2, timeout=10) as resp2:
                    im = Image.open(io.BytesIO(resp2.read())).convert('RGB')
                    w, h = im.size
                    if w > 300 and h > 300:
                        dim = min(w, h)
                        left = (w - dim) // 2
                        top = 0
                        im.crop((left, top, left + dim, top + dim)).resize((500, 500), Image.Resampling.LANCZOS).save('public/artists/golby.jpg', 'JPEG', quality=92)
                        print("GOLBY saved successfully from Mikiki!")
                        break
except Exception as e:
    print("GOLBY err:", e)

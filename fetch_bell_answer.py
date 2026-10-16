import urllib.request
import re
from PIL import Image
import io

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

# 1. 言xTHEANSWER
try:
    url = "https://www.tunecore.co.jp/artists/iupekeanswer"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        og = re.search(r'property=["\']og:image["\']\s+content=["\']([^"\']+)["\']', html)
        if og:
            img_url = og.group(1).replace('&amp;', '&')
            r = urllib.request.Request(img_url, headers=headers)
            with urllib.request.urlopen(r) as ir:
                im = Image.open(io.BytesIO(ir.read())).convert('RGB')
                w, h = im.size
                dim = min(w, h)
                crop = im.crop(((w - dim)//2, 0, (w - dim)//2 + dim, dim)).resize((500, 500), Image.Resampling.LANCZOS)
                crop.save('public/artists/answer.jpg', 'JPEG', quality=92)
                print("Saved answer.jpg successfully!", w, h)
except Exception as e:
    print("Answer err:", e)

# 2. ベル
try:
    url = "https://kai-you.net/article/78726"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        og = re.search(r'property=["\']og:image["\']\s+content=["\']([^"\']+)["\']', html)
        if og:
            img_url = og.group(1)
            r = urllib.request.Request(img_url, headers=headers)
            with urllib.request.urlopen(r) as ir:
                im = Image.open(io.BytesIO(ir.read())).convert('RGB')
                w, h = im.size
                dim = min(w, h)
                crop = im.crop(((w - dim)//2, 0, (w - dim)//2 + dim, dim)).resize((500, 500), Image.Resampling.LANCZOS)
                crop.save('public/artists/belle.jpg', 'JPEG', quality=92)
                print("Saved belle.jpg successfully!", w, h)
except Exception as e:
    print("Belle err:", e)

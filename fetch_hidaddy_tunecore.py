import urllib.request
import re
from PIL import Image
import io

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

url = 'https://music.apple.com/jp/artist/hidaddy/287413695'
try:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        og = re.search(r'property=["\']og:image["\']\s+content=["\']([^"\']+)["\']', html)
        print("Apple Music HIDADDY og:", og.group(1) if og else 'none')
        if og:
            r = urllib.request.Request(og.group(1), headers=headers)
            with urllib.request.urlopen(r, timeout=10) as ir:
                im = Image.open(io.BytesIO(ir.read())).convert('RGB')
                w, h = im.size
                dim = min(w, h)
                crop = im.crop(((w - dim)//2, 0, (w - dim)//2 + dim, dim)).resize((500, 500), Image.Resampling.LANCZOS)
                crop.save('public/artists/hidaddy.jpg', 'JPEG', quality=92)
                print("Saved HIDADDY from Apple Music!", w, h)
except Exception as e:
    print("Err:", e)

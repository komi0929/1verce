import urllib.request
import re
from PIL import Image
import io

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

url = 'https://kai-you.net/article/5047'
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as resp:
    html = resp.read().decode('utf-8', errors='ignore')
    imgs = re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', html)
    for i in imgs:
        if 'kai-you' in i and 'images' in i:
            print("Article image:", i)
            # download and check size
            try:
                r = urllib.request.Request(i, headers=headers)
                with urllib.request.urlopen(r) as ir:
                    im = Image.open(io.BytesIO(ir.read())).convert('RGB')
                    w, h = im.size
                    if w > 300 and h > 300:
                        dim = min(w, h)
                        crop = im.crop(((w - dim)//2, 0, (w - dim)//2 + dim, dim)).resize((500, 500), Image.Resampling.LANCZOS)
                        crop.save('hidaddy_cand.jpg')
                        print("Saved candidate:", i, f"{w}x{h}")
                        break
            except Exception as e:
                print("err", e)

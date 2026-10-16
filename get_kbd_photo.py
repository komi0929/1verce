import urllib.request
import re
from PIL import Image
import io

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

url = 'https://cocotame.jp/content/014299/'
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as resp:
    html = resp.read().decode('utf-8', errors='ignore')
    # Find all images or gallery images
    imgs = re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', html)
    anchors = re.findall(r'<a[^>]+href=["\']([^"\']+\.(?:jpg|png|webp))["\']', html)
    all_imgs = list(set(imgs + anchors))
    for i in all_imgs:
        if 'wp-content/uploads' in i:
            print("Found image:", i)
            # check if kbd or download and inspect
            try:
                r = urllib.request.Request(i, headers=headers)
                with urllib.request.urlopen(r) as ir:
                    im = Image.open(io.BytesIO(ir.read())).convert('RGB')
                    w, h = im.size
                    if w > 400 and h > 400:
                        print("Candidate:", i, f"{w}x{h}")
            except Exception as e:
                pass

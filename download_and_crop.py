import json
import urllib.request
from PIL import Image
import os
import io

with open('extracted_og_images.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

out_dir = os.path.join('public', 'artists')
os.makedirs(out_dir, exist_ok=True)

filename_map = {
    'lbrl': 'lbrl.jpg',
    'pirahu': 'pirahu.jpg',
    'ryuki': 'ryuki.jpg',
    'ttangg': 'ttangg.jpg',
    'rude_a': 'rude_a.jpg',
    'gotit': 'gotit.jpg',
    'lick_g': 'lick_g.jpg',
    'koperu': 'koperu.jpg',
    'ghope': 'ghope.jpg',
    'golby': 'golby.jpg',
    'kbd': 'kbd.jpg',
    'hidaddy': 'hidaddy.jpg',
    'kenthe390': 'kenthe390.jpg',
    'bes': 'bes.jpg',
    'rykey': 'rykey.jpg',
    'ozworld': 'ozworld.jpg',
    'leon_f': 'leon_f.jpg',
    'kashiwa': 'kashiwa.jpg',
    'silent_kj': 'silent_kj.jpg',
    'mysterio': 'mysterio.jpg',
    'jumbo_m': 'jumbo_m.jpg',
    'power_wave': 'power_wave.jpg',
    'ray': 'ray.jpg',
    'zeebra': 'zeebra.jpg',
    'yellow_bucks': 'yellow_bucks.jpg',
    'dahi': 'dahi.jpg'
}

for code, info in data.items():
    if not info or not info.get('og_image'):
        print(f"Skipping {code} (no info)")
        continue
    img_url = info['og_image'].replace('&amp;', '&')
    fname = filename_map.get(code)
    if not fname:
        continue
    dest_path = os.path.join(out_dir, fname)
    try:
        req = urllib.request.Request(img_url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            img_bytes = resp.read()
        im = Image.open(io.BytesIO(img_bytes)).convert('RGB')
        w, h = im.size
        # Crop square from center or top-center (faces are usually top-center or center)
        dim = min(w, h)
        if w > h:
            # landscape, center crop horizontally
            left = (w - dim) // 2
            top = 0
            right = left + dim
            bottom = dim
        else:
            # portrait or square, crop top
            left = 0
            top = 0
            right = dim
            bottom = dim
        cropped = im.crop((left, top, right, bottom)).resize((500, 500), Image.Resampling.LANCZOS)
        cropped.save(dest_path, 'JPEG', quality=92)
        print(f"Saved {fname} ({w}x{h} -> 500x500)")
    except Exception as e:
        print(f"Error {code}: {e}")

print("Batch download complete!")

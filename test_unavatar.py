import urllib.request
from PIL import Image
import io

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

test_targets = {
    'golby': 'https://unavatar.io/twitter/golby_trinity',
    'kbd': 'https://unavatar.io/twitter/kbd1008',
}

for name, u in test_targets.items():
    try:
        req = urllib.request.Request(u, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = resp.read()
            im = Image.open(io.BytesIO(data)).convert('RGB')
            w, h = im.size
            print(f"{name}: success {w}x{h}")
            im.resize((500, 500), Image.Resampling.LANCZOS).save(f"public/artists/{name}.jpg", "JPEG", quality=92)
    except Exception as e:
        print(f"{name}: error {e}")

import urllib.request
from PIL import Image
import io

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

try:
    u = "https://unavatar.io/twitter/PartyChinPosse"
    req = urllib.request.Request(u, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as resp:
        im = Image.open(io.BytesIO(resp.read())).convert('RGB')
        im.resize((500, 500), Image.Resampling.LANCZOS).save('public/artists/gotit.jpg', 'JPEG', quality=92)
        print("GOTIT saved successfully!")
except Exception as e:
    print("GOTIT err:", e)

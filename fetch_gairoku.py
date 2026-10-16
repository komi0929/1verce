import urllib.request
import urllib.parse
import re
from PIL import Image
import io

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

q = urllib.parse.quote("街録ch HIDADDY")
url = f"https://www.youtube.com/results?search_query={q}"
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as resp:
    html = resp.read().decode('utf-8', errors='ignore')
    vids = re.findall(r'/watch\?v=([a-zA-Z0-9_-]{11})', html)
    print("Found vids:", vids[:5])
    if vids:
        vid = vids[0]
        thumb_url = f"https://i.ytimg.com/vi/{vid}/maxresdefault.jpg"
        print("Fetching thumb:", thumb_url)
        r = urllib.request.Request(thumb_url, headers=headers)
        try:
            with urllib.request.urlopen(r) as tr:
                im = Image.open(io.BytesIO(tr.read())).convert('RGB')
        except:
            thumb_url = f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg"
            r = urllib.request.Request(thumb_url, headers=headers)
            with urllib.request.urlopen(r) as tr:
                im = Image.open(io.BytesIO(tr.read())).convert('RGB')
        im.save('gairoku_hidaddy.jpg')
        print("Saved gairoku_hidaddy.jpg!")

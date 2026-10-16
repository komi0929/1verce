import urllib.request
import re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

url = 'https://jp-hphp.com/kok-vs-shin-adrenaline2-hidaddy-vs-ryoff-karma/'
try:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=8) as resp:
        h = resp.read().decode('utf-8', errors='ignore')
        og = re.search(r'property=["\']og:image["\']\s+content=["\']([^"\']+)["\']', h)
        print("og:", og.group(1) if og else 'none')
        vids = re.findall(r'vi/([a-zA-Z0-9_-]+)/', h)
        print("vids:", list(set(vids)))
except Exception as e:
    print("err:", e)

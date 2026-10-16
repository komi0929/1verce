import urllib.request
import urllib.parse
import re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

q = urllib.parse.quote("DK 高校生RAP選手権 大阪ラップヘラクレス")
url = f"https://search.yahoo.co.jp/image/search?p={q}"
req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        # find image links
        imgs = re.findall(r'https?://[^"\']+\.(?:jpg|jpeg|png)', html)
        filtered = [i for i in imgs if not any(x in i for x in ['yahoo', 'yimg', 'icon', 'logo', 'button'])]
        print("DK Yahoo Images:", filtered[:10])
except Exception as e:
    print("Err:", e)

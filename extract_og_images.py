import urllib.request
import re
import json

with open('artist_links.json', 'r', encoding='utf-8') as f:
    links_data = json.load(f)

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

og_images = {}

for code, urls in links_data.items():
    found = False
    for u in urls:
        if 'privacy' in u or 'terms' in u or 'lycorp' in u:
            continue
        try:
            req = urllib.request.Request(u, headers=headers)
            with urllib.request.urlopen(req, timeout=8) as resp:
                html = resp.read().decode('utf-8', errors='ignore')
                m = re.search(r'property=["\']og:image["\']\s+content=["\']([^"\']+)["\']', html)
                if not m:
                    m = re.search(r'content=["\']([^"\']+)["\']\s+property=["\']og:image["\']', html)
                if m:
                    og_url = m.group(1)
                    # Exclude generic default og images
                    if 'default' not in og_url and 'logo' not in og_url and 'apple-music' not in og_url and 'tunecore' not in og_url:
                        og_images[code] = {'page': u, 'og_image': og_url}
                        found = True
                        break
                    elif 'tunecore-japan' in og_url or 'mzstatic' in og_url:
                        og_images[code] = {'page': u, 'og_image': og_url}
                        found = True
                        break
        except Exception as e:
            continue
    if not found:
        og_images[code] = None

with open('extracted_og_images.json', 'w', encoding='utf-8') as f:
    json.dump(og_images, f, ensure_ascii=False, indent=2)

print("Done! Extracted images:", sum(1 for v in og_images.values() if v is not None))

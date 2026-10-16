import urllib.request
import urllib.parse
import json
import re

targets = [
    ("lbrl", "L.B.R.L ラッパー"),
    ("pirahu", "ピラフ星人 ラッパー"),
    ("ryuki", "龍鬼 ラッパー"),
    ("ttangg", "T-TANGG ラッパー"),
    ("rude_a", "Rude-α ラッパー"),
    ("gotit", "GOTIT ラッパー"),
    ("dk", "DK ラッパー 高校生ラップ選手権"),
    ("lick_g", "Lick-G ラッパー"),
    ("koperu", "KOPERU ラッパー"),
    ("ghope", "G-HOPE ラッパー"),
    ("golby", "GOLBY ラッパー"),
    ("kbd", "KBD 梅田サイファー"),
    ("hidaddy", "HIDADDY 韻踏合組合"),
    ("kenthe390", "KEN THE 390 ラッパー"),
    ("bes", "BES SWANKY SWIPE ラッパー"),
    ("rykey", "RYKEYDADDYDIRTY ラッパー"),
    ("ozworld", "OZworld ラッパー"),
    ("leon_f", "Leon Fanourakis ラッパー"),
    ("kashiwa", "かしわ ラッパー 高校生ラップ選手権"),
    ("silent_kj", "SILENT KILLA JOINT ラッパー"),
    ("mysterio", "ミステリオ ラッパー"),
    ("jumbo_m", "JUMBO MAATCH"),
    ("power_wave", "POWER WAVE レゲエ"),
    ("ray", "RAY レゲエ"),
    ("zeebra", "Zeebra ラッパー"),
    ("yellow_bucks", "¥ellow Bucks ラッパー"),
    ("dahi", "だーひー ラッパー")
]

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

def search_yahoo(q):
    url = f"https://search.yahoo.co.jp/search?p={urllib.parse.quote(q)}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            links = re.findall(r'<a\s+href="(https://[^"]+)"', html)
            filtered = [l for l in links if 'yahoo' not in l and 'search' not in l]
            return filtered
    except Exception as e:
        return []

results = {}
for code, q in targets:
    tc_links = search_yahoo(f"{q} site:tunecore.co.jp/artists OR site:natalie.mu/music/artist OR site:music.apple.com/jp/artist")
    print(code, tc_links[:3])
    results[code] = tc_links[:3]

with open('artist_links.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print("Saved artist_links.json successfully!")

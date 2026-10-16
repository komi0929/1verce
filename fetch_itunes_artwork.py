import urllib.request
import urllib.parse
import json

artists = [
    ("Red Eye", "Red Eye"),
    ("L.B.R.L", "L.B.R.L"),
    ("ピラフ星人", "ピラフ星人"),
    ("龍鬼", "龍鬼"),
    ("T-TANGG", "T-TANGG"),
    ("Rude-α", "Rude-α"),
    ("GOTIT", "GOTIT"),
    ("DK", "DK"),
    ("Lick-G", "Lick-G"),
    ("KOPERU", "KOPERU"),
    ("G-HOPE", "G-HOPE"),
    ("GOLBY", "GOLBY"),
    ("KBD", "KBD"),
    ("HIDADDY", "HIDADDY"),
    ("KEN THE 390", "KEN THE 390"),
    ("BES", "BES"),
    ("RYKEY", "RYKEYDADDYDIRTY"),
    ("OZworld", "OZworld"),
    ("Leon Fanourakis", "Leon Fanourakis"),
    ("かしわ", "かしわ"),
    ("SILENT KILLA JOINT", "SILENT KILLA JOINT"),
    ("ミステリオ", "ミステリオ"),
    ("JUMBO MAATCH", "JUMBO MAATCH"),
    ("POWER WAVE", "POWER WAVE"),
    ("RAY", "RAY"),
    ("Zeebra", "Zeebra"),
    ("¥ellow Bucks", "¥ellow Bucks"),
    ("だーひー", "だーひー")
]

for code, q in artists:
    url = f"https://itunes.apple.com/search?term={urllib.parse.quote(q)}&country=jp&entity=album&limit=3"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            results = data.get('results', [])
            if results:
                art = results[0].get('artworkUrl100', '').replace('100x100bb', '600x600bb')
                artistName = results[0].get('artistName', '')
                collection = results[0].get('collectionName', '')
                print(f"{code} -> [{artistName}] {collection}: {art}")
            else:
                print(f"{code} -> NOT FOUND")
    except Exception as e:
        print(f"{code} -> ERR {e}")

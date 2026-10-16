import json
import re

with open('src/data/initialData.ts', encoding='utf-8') as f:
    text = f.read()

m = re.search(r'export const MC_PROFILES: MCProfile\[\] = (\[.*?\]);', text, re.DOTALL)
profiles = json.loads(m.group(1))

for p in profiles:
    if any(k in p['name'] for k in ['ニガリ', 'ベル', 'ANSWER', 'GADORO', 'TK']):
        print("Found profile:", p['name'], p['avatarUrl'])

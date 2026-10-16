import re
from collections import Counter
import json

with open('src/data/initialData.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Extract MC_PROFILES
mc_profiles_match = re.search(r'export const MC_PROFILES: MCProfile\[\] = \[(.*?)\];', text, re.DOTALL)
profiles = {}
if mc_profiles_match:
    for m in re.finditer(r'"name":\s*"([^"]+)"[^}]*?"avatarUrl":\s*"([^"]+)"', mc_profiles_match.group(1)):
        profiles[m.group(1)] = m.group(2)

# Extract Battles
battles = re.findall(r'"mcA":\s*"([^"]+)",\s*"mcB":\s*"([^"]+)"', text)
counts = Counter()
for a, b in battles:
    counts[a] += 1
    counts[b] += 1

output_data = {
    "total_mcs": len(counts),
    "total_registered_profiles": len(profiles),
    "mcs": []
}

for mc, c in sorted(counts.items(), key=lambda x: (x[1], x[0])):
    output_data["mcs"].append({
        "name": mc,
        "count": c,
        "has_avatar": mc in profiles,
        "avatarUrl": profiles.get(mc, None)
    })

with open('audit_result.json', 'w', encoding='utf-8') as f:
    json.dump(output_data, f, ensure_ascii=False, indent=2)

print("Saved audit_result.json successfully!")

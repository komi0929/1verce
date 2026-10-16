import json
import re
import os

with open('src/data/initialData.ts', encoding='utf-8') as f:
    text = f.read()

m_profiles = re.search(r'export const MC_PROFILES: MCProfile\[\] = (\[.*?\]);', text, re.DOTALL)
profiles = json.loads(m_profiles.group(1))

m_battles = re.search(r'export const INITIAL_BATTLES: Battle\[\] = (\[.*\]);', text, re.DOTALL)
battles = json.loads(m_battles.group(1))

print(f"Total MC_PROFILES: {len(profiles)}")
print(f"Total INITIAL_BATTLES: {len(battles)}")

# Check missing images
missing_avatars = []
for p in profiles:
    url = p.get('avatarUrl')
    if not url:
        missing_avatars.append((p['name'], 'No avatarUrl'))
        continue
    # remove leading /
    local_path = os.path.join('public', url.lstrip('/'))
    if not os.path.exists(local_path):
        missing_avatars.append((p['name'], local_path))

print(f"Profiles with missing avatar file: {len(missing_avatars)}")
for name, path in missing_avatars:
    print(f"  Missing: {name} -> {path}")

# Check battle counts per profile
name_counts = {}
for b in battles:
    a = b['mcA']
    b_name = b['mcB']
    name_counts[a] = name_counts.get(a, 0) + 1
    name_counts[b_name] = name_counts.get(b_name, 0) + 1

under5_profiles = []
for p in profiles:
    # check if in battles
    c = name_counts.get(p['name'], 0)
    if c < 5:
        under5_profiles.append((p['name'], c))

print(f"Profiles with < 5 battles in INITIAL_BATTLES: {len(under5_profiles)}")
for name, c in under5_profiles:
    print(f"  Under 5: {name} -> {c} battles")

if not missing_avatars and not under5_profiles:
    print("\n>>> ALL CHECKS PASSED PERFECTLY! 100% OF MC_PROFILES HAVE VALID AVATARS AND >= 5 BATTLES! <<<")

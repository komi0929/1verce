import json

with open('audit_result.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

with open('under5_analysis.txt', 'w', encoding='utf-8') as out:
    out.write(f"Total MCs in database: {d['total_mcs']}\n")
    out.write(f"Total Registered MC_PROFILES: {d['total_registered_profiles']}\n")
    under5 = [m for m in d['mcs'] if m['count'] < 5]
    out.write(f"Under 5 battles count: {len(under5)}\n\n")
    for m in under5:
        out.write(f"{m['name']}: {m['count']} battles, in_profiles={m['has_avatar']}\n")

print("Wrote under5_analysis.txt")

import json
import re

# Read initialData.ts
with open('src/data/initialData.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. New MC Profiles to add
new_profiles = [
    {
        "name": "L.B.R.L",
        "enName": "L.B.R.L",
        "avatarUrl": "/artists/lbrl.jpg",
        "repYoutubeId": "e7X4l8Fc2Bs",
        "focalPosition": "50% 30%",
        "styleTag": "MELODIC / NEW WAVE"
    },
    {
        "name": "ピラフ星人",
        "enName": "PILAF ALIEN",
        "avatarUrl": "/artists/pirahu.jpg",
        "repYoutubeId": "e7X4l8Fc2Bs",
        "focalPosition": "50% 25%",
        "styleTag": "ALIEN / COMEDY FLOW"
    },
    {
        "name": "龍鬼",
        "enName": "RYUKI",
        "avatarUrl": "/artists/ryuki.jpg",
        "repYoutubeId": "e7X4l8Fc2Bs",
        "focalPosition": "50% 25%",
        "styleTag": "HOKKAIDO / NEW WAVE"
    },
    {
        "name": "T-TANGG",
        "enName": "T-TANGG",
        "avatarUrl": "/artists/ttangg.jpg",
        "repYoutubeId": "e7X4l8Fc2Bs",
        "focalPosition": "50% 30%",
        "styleTag": "SHONAN / KOK CHAMP"
    },
    {
        "name": "Rude-α",
        "enName": "RUDE-A",
        "avatarUrl": "/artists/rude_a.jpg",
        "repYoutubeId": "e7X4l8Fc2Bs",
        "focalPosition": "50% 30%",
        "styleTag": "OKINAWA / MELODIC & SOUL"
    },
    {
        "name": "GOTIT",
        "enName": "GOTIT",
        "avatarUrl": "/artists/gotit.jpg",
        "repYoutubeId": "e7X4l8Fc2Bs",
        "focalPosition": "50% 30%",
        "styleTag": "IBARAKI / BOOMBAP"
    },
    {
        "name": "DK",
        "enName": "DK",
        "avatarUrl": "/artists/dk.jpg",
        "repYoutubeId": "e7X4l8Fc2Bs",
        "focalPosition": "50% 30%",
        "styleTag": "OSAKA / POWER RHYME"
    },
    {
        "name": "Lick-G",
        "enName": "LICK-G",
        "avatarUrl": "/artists/lick_g.jpg",
        "repYoutubeId": "e7X4l8Fc2Bs",
        "focalPosition": "50% 30%",
        "styleTag": "BILINGUAL / FAST FLOW"
    },
    {
        "name": "KOPERU",
        "enName": "KOPERU",
        "avatarUrl": "/artists/koperu.jpg",
        "repYoutubeId": "e7X4l8Fc2Bs",
        "focalPosition": "50% 30%",
        "styleTag": "UMEDA CYPHER / FLOW"
    },
    {
        "name": "G-HOPE",
        "enName": "G-HOPE",
        "avatarUrl": "/artists/ghope.jpg",
        "repYoutubeId": "e7X4l8Fc2Bs",
        "focalPosition": "50% 30%",
        "styleTag": "NAGANO / HARD PUNCHLINE"
    },
    {
        "name": "GOLBY",
        "enName": "GOLBY",
        "avatarUrl": "/artists/golby.jpg",
        "repYoutubeId": "e7X4l8Fc2Bs",
        "focalPosition": "50% 30%",
        "styleTag": "TOKYO / HARD RHYME"
    },
    {
        "name": "KBD",
        "enName": "KBD",
        "avatarUrl": "/artists/kbd.jpg",
        "repYoutubeId": "e7X4l8Fc2Bs",
        "focalPosition": "50% 30%",
        "styleTag": "UMEDA CYPHER / HEAVYWEIGHT"
    },
    {
        "name": "HIDADDY",
        "enName": "HIDADDY",
        "avatarUrl": "/artists/hidaddy.jpg",
        "repYoutubeId": "e7X4l8Fc2Bs",
        "focalPosition": "50% 30%",
        "styleTag": "IFK / FREESTYLE LEGEND"
    },
    {
        "name": "KEN THE 390",
        "enName": "KEN THE 390",
        "avatarUrl": "/artists/kenthe390.jpg",
        "repYoutubeId": "e7X4l8Fc2Bs",
        "focalPosition": "50% 30%",
        "styleTag": "TOKYO / POP & FLOW"
    },
    {
        "name": "BES",
        "enName": "BES",
        "avatarUrl": "/artists/bes.jpg",
        "repYoutubeId": "e7X4l8Fc2Bs",
        "focalPosition": "50% 30%",
        "styleTag": "SWANKY SWIPE / LEGEND FLOW"
    },
    {
        "name": "RYKEY",
        "enName": "RYKEY DADDY DIRTY",
        "avatarUrl": "/artists/rykey.jpg",
        "repYoutubeId": "e7X4l8Fc2Bs",
        "focalPosition": "50% 30%",
        "styleTag": "REAL HIPHOP / SOUL"
    },
    {
        "name": "OZworld",
        "enName": "OZWORLD",
        "avatarUrl": "/artists/ozworld.jpg",
        "repYoutubeId": "e7X4l8Fc2Bs",
        "focalPosition": "50% 30%",
        "styleTag": "OKINAWA / ALIEN FLOW"
    },
    {
        "name": "LEON a.k.a 獅子",
        "enName": "OZWORLD",
        "avatarUrl": "/artists/ozworld.jpg",
        "repYoutubeId": "e7X4l8Fc2Bs",
        "focalPosition": "50% 30%",
        "styleTag": "OKINAWA / ALIEN FLOW"
    },
    {
        "name": "Leon Fanourakis",
        "enName": "LEON FANOURAKIS",
        "avatarUrl": "/artists/leon_f.jpg",
        "repYoutubeId": "e7X4l8Fc2Bs",
        "focalPosition": "50% 30%",
        "styleTag": "1% / TRAP PIONEER"
    },
    {
        "name": "かしわ",
        "enName": "KASHIWA",
        "avatarUrl": "/artists/kashiwa.jpg",
        "repYoutubeId": "e7X4l8Fc2Bs",
        "focalPosition": "50% 30%",
        "styleTag": "KANSAI / MELODY & HUMOR"
    },
    {
        "name": "SILENT KILLA JOINT",
        "enName": "SILENT KILLA JOINT",
        "avatarUrl": "/artists/silent_kj.jpg",
        "repYoutubeId": "e7X4l8Fc2Bs",
        "focalPosition": "50% 30%",
        "styleTag": "KOBE / JAZZY BOOMBAP"
    },
    {
        "name": "ミステリオ",
        "enName": "MYSTERIO",
        "avatarUrl": "/artists/mysterio.jpg",
        "repYoutubeId": "e7X4l8Fc2Bs",
        "focalPosition": "50% 30%",
        "styleTag": "OSAKA / COMEDY & DIS"
    },
    {
        "name": "JUMBO MAATCH",
        "enName": "JUMBO MAATCH",
        "avatarUrl": "/artists/jumbo_m.jpg",
        "repYoutubeId": "e7X4l8Fc2Bs",
        "focalPosition": "50% 30%",
        "styleTag": "MIGHTY JAM ROCK / REGGAE"
    },
    {
        "name": "POWER WAVE",
        "enName": "POWER WAVE",
        "avatarUrl": "/artists/power_wave.jpg",
        "repYoutubeId": "e7X4l8Fc2Bs",
        "focalPosition": "50% 30%",
        "styleTag": "KANSAI / DANCEHALL DEEJAY"
    },
    {
        "name": "RAY",
        "enName": "RAY",
        "avatarUrl": "/artists/ray.jpg",
        "repYoutubeId": "e7X4l8Fc2Bs",
        "focalPosition": "50% 30%",
        "styleTag": "KANSAI / SINGING DEEJAY"
    },
    {
        "name": "Zeebra",
        "enName": "ZEEBRA",
        "avatarUrl": "/artists/zeebra.jpg",
        "repYoutubeId": "e7X4l8Fc2Bs",
        "focalPosition": "50% 30%",
        "styleTag": "KING GIDDRA / GRANDFATHER"
    },
    {
        "name": "¥ellow Bucks",
        "enName": "YELLOW BUCKS",
        "avatarUrl": "/artists/yellow_bucks.jpg",
        "repYoutubeId": "e7X4l8Fc2Bs",
        "focalPosition": "50% 30%",
        "styleTag": "TOKAI / THE RAPSTAR"
    },
    {
        "name": "だーひー",
        "enName": "DAHI",
        "avatarUrl": "/artists/dahi.jpg",
        "repYoutubeId": "e7X4l8Fc2Bs",
        "focalPosition": "50% 30%",
        "styleTag": "MIYAZAKI / PUNCHLINE"
    }
]

# Check existing MC_PROFILES
profiles_match = re.search(r'export const MC_PROFILES: MCProfile\[\] = (\[.*?\]);', content, re.DOTALL)
existing_profiles = json.loads(profiles_match.group(1))
existing_names = {p['name'].lower() for p in existing_profiles}

for np in new_profiles:
    if np['name'].lower() not in existing_names:
        existing_profiles.append(np)
        existing_names.add(np['name'].lower())
    else:
        for ep in existing_profiles:
            if ep['name'].lower() == np['name'].lower():
                ep['avatarUrl'] = np['avatarUrl']
                ep['styleTag'] = np['styleTag']

# 2. Add New Battles with strict tournament tag
battles_match = re.search(r'export const INITIAL_BATTLES: Battle\[\] = (\[.*\]);', content, re.DOTALL)
existing_battles = json.loads(battles_match.group(1))

# Helper to normalize tournament to valid type
def to_valid_tournament(raw: str):
    if "高校生RAP" in raw:
        return "高校生RAP選手権"
    if "戦極" in raw:
        return "戦極"
    if "凱旋" in raw:
        return "凱旋"
    if "UMB" in raw:
        return "UMB"
    if "KOK" in raw:
        return "KOK"
    if "ADRENALINE" in raw:
        return "ADRENALINE"
    if "FSL" in raw:
        return "FSL"
    return "戦極"

# Fix any previous battles with invalid tournament tags
for b in existing_battles:
    b['tournament'] = to_valid_tournament(b['tournament'])

print("Cleaned up existing tournaments.")

profiles_json = json.dumps(existing_profiles, ensure_ascii=False, indent=2)
battles_json = json.dumps(existing_battles, ensure_ascii=False, indent=2)

content = re.sub(r'export const MC_PROFILES: MCProfile\[\] = \[.*?\];', f'export const MC_PROFILES: MCProfile[] = {profiles_json};', content, flags=re.DOTALL)
content = re.sub(r'export const INITIAL_BATTLES: Battle\[\] = \[.*\];', f'export const INITIAL_BATTLES: Battle[] = {battles_json};', content, flags=re.DOTALL)

with open('src/data/initialData.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Saved cleanly to src/data/initialData.ts!")

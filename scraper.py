import requests
import json
import time
import sys

LEADERBOARD_DATA = """
tob3000, juwk, triforce3250, Amateseru, TKC, FantaTanked, 2DollarGargoyle, 
Runnerguy2489, Eggmeister, hayafo, neefe, Bonooru, Timato, MutantAura, 
jenslang, Link11, MooseOoT, Challensois_, AverageGreg, the__consultant, 
Jake Wright, PhoenixFeather, Adam, P.Titou, Chris7, LiterallyLake, 
realtimeattack64, sva, tsundererar, ArthurOudini, CoffeePot, DiamondFlash27, 
PaintSkate8, Grego, MikeKatz45, blinkzy, Darker, dotzo, xwillmarktheplace, 
Nalle, Lulz, scaramanga, skepticole, Reaper, WickedGligar, magnumpi47, 
Gombill, Woli, makko, goodgortho, Zell, ArmorySons, JEANBERNARDGAMING, 
Cloudike, adef, Xanra, Fenyan, Numberplay, Cma, Cabbage72, PsyMarth, 
QuickKiran, Hapenfors, Worn_Mittens, Valientlink, Kurt, Ilher, Apasher, 
gsk8, k4erup, JFM2796, Sloth, MatttInTheHat, LadyLambdadeltasDandruff, 
SariasObject, Fleush, prettybigjoe, Myelin, Davpat, TomPouce, shirosoluna, 
Tashman91, VidyaJames, Matz, plasma-parse, Countdown, Midboss, Bou_Frost, 
Yanis, Photon, noface099, Sonfloro, Condor, Zeru, moosecrap, benstephens56, 
ZAR, HonkyMcButterball, Caidren, keys336, gc1, brocolli4, shaggy, cynsitive, 
West0pher, mathias8750, taaboo, Skyreon, LexWatercolor, Niamek, tsuyoi, 
Kayro64, Rjminotaur, gamestabled, Zer0SG_1, Cisco64, Slask, Rubixmagic, 
peatsheep, Nonsensebread, Ohrange, ZachLink99, Maddie, Alaris, mkbgnr, 
Nkitten, Luisito, linky628, swagieswamp, Fadoxthon, MikeKanis, Sorokya, 
monochromii, katienoelle, Sestral, Zombie_God, ZeFloppies, soda, Speedbayer_, 
Spitle, thags15, purple tissue box, Kayla, haktical, ClydePowers, nozzly, 
PancakeTurtle, Aksannyi, The corpser, ChefBear, Crafth, khuno, Figure8, 
Glasfolie, Cobeck, Juchemao17, TheCowness, kouyou, Luichito, Savestate, 
gc_one, khufufoofoo, Tempest, eltiokamina, Amber24, Zemoo, NicV, 
jasoncario131, GreenBomber, SantasLittleNibbler, colin, Lil_KyleYT, 
LunaticJ, dot, iOliver, Willow The Whimsical
"""

TARGET_USERS = [name.strip() for name in LEADERBOARD_DATA.split(',') if name.strip()]

HEADERS = {
    'User-Agent': 'OoT-Bingo-Stats-Tracker/1.0 (Contact: triforce3250)'
}

def get_user_id_map():
    print("Mapping users via OoT Category...")
    url = "https://racetime.gg/oot/leaderboards/data"
    id_map = {}
    try:
        res = requests.get(url, headers=HEADERS)
        data = res.json()
        for board in data.get('leaderboards', []):
            if board.get('goal') == 'Bingo':
                for entry in board.get('rankings', []):
                    user = entry.get('user', {})
                    name = user.get('name', '').lower()
                    user_id = user.get('id') 
                    if name and user_id:
                        id_map[name] = user_id
                break
        print(f"  > Mapped {len(id_map)} players.")
        return id_map
    except Exception as e:
        print(f" ! Mapping Error: {e}")
        return {}

def fetch_bingo_data(username, user_id):
    print(f"\nProcessing: {username}")
    bingo_races = []
    page = 1
    # 50 pages * 20 races = 1000 limit
    MAX_PAGES = 50 
    
    while page <= MAX_PAGES:
        url = f"https://racetime.gg/user/{user_id}/races/data?page={page}"
        try:
            res = requests.get(url, headers=HEADERS)
            if res.status_code != 200: break
            data = res.json()
            races = data.get('races', [])
            if not races: break
            
            for i, race in enumerate(races):
                # Update progress bar per race for better visibility
                sys.stdout.write(f"\r    Page {page}/50 | Race {i+1}/20")
                sys.stdout.flush()

                # Filtering checks
                info = race.get('info', '') or ''
                is_valid = (
                    race.get('category', {}).get('slug') == 'oot' and
                    race.get('recorded', False) and
                    race.get('goal', {}).get('name', '').lower() == 'bingo' and
                    'ootbingo.github.io/bingo/bingo.html' in info and
                    'mode=normal' in info
                )

                if is_valid:
                    # Deep dive for finish time
                    detail_res = requests.get(f"https://racetime.gg{race['data_url']}", headers=HEADERS)
                    if detail_res.status_code == 200:
                        details = detail_res.json()
                        entrant = next((e for e in details.get('entrants', []) 
                                      if e.get('user', {}).get('id') == user_id), None)
                        if entrant and entrant.get('finish_time'):
                            race['user_finish_time'] = entrant['finish_time']
                            race['full_race_url'] = f"https://racetime.gg{race.get('url')}"
                            bingo_races.append(race)
                    time.sleep(0.1) # Small delay to avoid hammering

            if page >= data.get('num_pages', 1): break
            page += 1
        except Exception as e:
            print(f"\nError fetching {username}: {e}")
            break
            
    print(f"\n    Finished. Total Bingos found: {len(bingo_races)}")
    return bingo_races

# --- Main Execution ---
id_map = get_user_id_map()
data_store = {}

for name in TARGET_USERS:
    lower_name = name.lower()
    user_id = id_map.get(lower_name)
    
    if user_id:
        history = fetch_bingo_data(name, user_id)
        if history:
            data_store[lower_name] = {
                "username": name,
                "races": history,
                "last_updated": time.strftime("%Y-%m-%d %H:%M:%S")
            }
        time.sleep(2)

with open('data.json', 'w') as f:
    json.dump(data_store, f, indent=4)

print(f"\nSuccess! Saved {len(data_store)} users to data.json")
import requests
import json
import time

USERNAMES = [
    "tob3000", "triforce3250", "2DollarGargoyle"
]

# This tells Racetime.gg who is calling their API
HEADERS = {
    'User-Agent': 'OoT-Bingo-Stats-Bot/1.0 (Contact: triforce3250)'
}

def fetch_bingo_data(username, user_url):
    print(f"Fetching Bingo history for {username}...")
    bingo_races = []
    page = 1
    total_pages = 1
    
    while page <= total_pages:
        # Use the ID-based URL we found in the mapping
        url = f"https://racetime.gg{user_url}/races/data?category=oot&page={page}"
        res = requests.get(url, headers=HEADERS)
        if res.status_code != 200: break
        
        data = res.json()
        for race in data.get('races', []):
            goal = race['goal']['name'].lower()
            if race['status'] == 'finished' and 'bingo' in goal:
                bingo_races.append(race)
        
        total_pages = data.get('num_pages', 1)
        print(f"  - Page {page}/{total_pages} (Bingo: {len(bingo_races)})")
        page += 1
        time.sleep(1.5) # Anti-ban delay
        
    return bingo_races

# --- Main Execution ---
id_map = get_user_id_map()
data_store = {}

for name in TARGET_USERS:
    lower_name = name.lower()
    if lower_name in id_map:
        history = fetch_bingo_data(name, id_map[lower_name])
        if history:
            data_store[lower_name] = {"username": name, "races": history}
    else:
        print(f" ! Could not find ID for {name} on the leaderboard. Skipping.")
    time.sleep(3)

with open('data.json', 'w') as f:
    json.dump(data_store, f)
print(f"Done! Saved {len(data_store)} users.")
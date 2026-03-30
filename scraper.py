import requests
import json
import time

TARGET_USERS = [
    "tob3000", "triforce3250", "2DollarGargoyle"
]

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
    print(f"Fetching history for {username}...")
    bingo_races = []
    page = 1
    
    # Scanning first 10 pages of history
    while page <= 10: 
        url = f"https://racetime.gg/user/{user_id}/races/data?page={page}"
        try:
            res = requests.get(url, headers=HEADERS)
            if res.status_code != 200: break
            
            data = res.json()
            races = data.get('races', [])
            if not races: break
            
            for race in races:
                category = race.get('category', {}).get('slug', '').lower()
                goal = race.get('goal', {}).get('name', '').lower()
                info = race.get('info', '') or '' # Get the info link

                # STRICT FILTER: 
                # 1. Must be OoT
                # 2. Must be Finished
                # 3. Must have "Bingo" in the goal
                # 4. Must link to the official ootbingo generator
                if (category == 'oot' and 
                    race['status']['value'] == 'finished' and 
                    'bingo' in goal and 
                    'ootbingo.github.io/bingo' in info):
                    # Deep Dive: Fetch the race-specific data for the finish time
                    # We use the 'data_url' found in the race object (e.g. /oot/race-name/data)
                    race_detail_url = f"https://racetime.gg{race.get('data_url')}"
                    detail_res = requests.get(race_detail_url, headers=HEADERS)
                    
                    if detail_res.status_code == 200:
                        details = detail_res.json()
                        # Find our specific user in the entrants list
                        entrant = next((e for e in details.get('entrants', []) 
                                      if e.get('user', {}).get('id') == user_id), None)
                        
                        if entrant and entrant.get('finish_time'):
                            # Attach the time directly to the race object
                            race['user_finish_time'] = entrant['finish_time']
                            bingo_races.append(race)
                            time.sleep(0.5) # Be kind to individual race endpoints

            print(f"    - Page {page}: Found {len(bingo_races)} Bingos total")
            if page >= data.get('num_pages', 1): break
            page += 1
            time.sleep(1.0)
        except Exception as e:
            print(f"    ! Error: {e}")
            break
            
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
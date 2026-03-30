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
    """Correctly parses the nested Racetime.gg leaderboard JSON."""
    print("Mapping users via OoT Category...")
    url = "https://racetime.gg/oot/leaderboards/data"
    id_map = {}
    
    try:
        res = requests.get(url, headers=HEADERS)
        if res.status_code != 200: return {}
        
        data = res.json()
        # Navigate: data['leaderboards'] -> find the one where goal == 'Bingo'
        all_boards = data.get('leaderboards', [])
        
        for board in all_boards:
            # We specifically want the Bingo rankings
            if board.get('goal') == 'Bingo':
                rankings = board.get('rankings', [])
                for entry in rankings:
                    user = entry.get('user', {})
                    name = user.get('name', '').lower()
                    url_path = user.get('url')
                    if name and url_path:
                        id_map[name] = url_path
                break # We found Bingo, no need to check other goals
                
        print(f"  > Successfully mapped {len(id_map)} players from Bingo leaderboard.")
        return id_map
    except Exception as e:
        print(f" ! Error mapping IDs: {e}")
        return {}

def fetch_bingo_data(username, user_id_url):
    print(f"Fetching Bingo history for {username}...")
    bingo_races = []
    page = 1
    total_pages = 1
    
    while page <= total_pages:
        # Construct the data URL: /user/ID/name/races/data
        url = f"https://racetime.gg{user_id_url}/races/data?category=oot&page={page}"
        
        try:
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
            time.sleep(1.2) 
        except:
            break
            
    return bingo_races

# --- Main Execution ---
id_map = get_user_id_map()
data_store = {}

for name in TARGET_USERS:
    lower_name = name.lower()
    user_path = id_map.get(lower_name)
    
    # Plan A: Use the ID from the leaderboard
    if user_path:
        history = fetch_bingo_data(name, user_path)
    # Plan B: Direct access if they weren't on the Bingo-specific board
    else:
        print(f" ! {name} not found in Bingo rankings. Trying direct URL...")
        history = fetch_bingo_data(name, f"/user/{name}")

    if history:
        data_store[lower_name] = {
            "username": name, 
            "races": history,
            "last_updated": time.strftime("%Y-%m-%d %H:%M:%S")
        }
    time.sleep(2)

with open('data.json', 'w') as f:
    json.dump(data_store, f, indent=4)

print(f"\nDone! Saved {len(data_store)} users to data.json")
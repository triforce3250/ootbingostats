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
                    # We store the unique ID string specifically
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
    print(f"Fetching Bingo history for {username} (ID: {user_id})...")
    bingo_races = []
    page = 1
    
    # We'll try at least 3 pages or until we hit the end
    while page <= 10: 
        # Using the direct API endpoint for race data by ID
        url = f"https://racetime.gg/api/users/{user_id}/races/data?category=oot&page={page}"
        try:
            res = requests.get(url, headers=HEADERS)
            if res.status_code != 200:
                print(f"    ! Page {page} failed (Status {res.status_code})")
                break
            
            data = res.json()
            races = data.get('races', [])
            if not races:
                break
            
            for race in races:
                goal = race['goal']['name'].lower()
                if race['status'] == 'finished' and 'bingo' in goal:
                    bingo_races.append(race)
            
            print(f"    - Page {page}: Found {len(races)} races, {len(bingo_races)} were Bingo.")
            
            if page >= data.get('num_pages', 1):
                break
            
            page += 1
            time.sleep(1.5)
        except Exception as e:
            print(f"    ! Error: {e}")
            break
            
    return bingo_races

# --- Main ---
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
    else:
        print(f" ! {name} not found in ID map.")
    
    time.sleep(2)

with open('data.json', 'w') as f:
    json.dump(data_store, f, indent=4)

print(f"\nDone! Saved {len(data_store)} users.")
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
    """Fetches the OoT category members to map names to unique IDs."""
    print("Mapping users via OoT Category...")
    # This endpoint provides the list of all active OoT players and their IDs
    url = "https://racetime.gg/oot/leaderboards/data"
    try:
        res = requests.get(url, headers=HEADERS)
        if res.status_code != 200: 
            print(f" ! Leaderboard fetch failed: {res.status_code}")
            return {}
        data = res.json()
        
        # We map the display name (lowercase) to the internal ID URL
        # The 'user' object contains the 'url' which looks like '/user/Aa5veo.../name'
        return {player['user']['name'].lower(): player['user']['url'] 
                for player in data.get('leaderboard', [])}
    except Exception as e:
        print(f" ! Error mapping IDs: {e}")
        return {}

def fetch_bingo_data(username, user_id_url):
    print(f"Fetching Bingo history for {username}...")
    bingo_races = []
    page = 1
    total_pages = 1
    
    while page <= total_pages:
        # CORRECTED URL: We use the ID-based URL provided by the leaderboard
        # Structure: https://racetime.gg/user/Aa5veo.../name/races/data
        url = f"https://racetime.gg{user_id_url}/races/data?category=oot&page={page}"
        
        try:
            res = requests.get(url, headers=HEADERS)
            if res.status_code != 200:
                print(f"  ! Error on page {page}: {res.status_code}")
                break
            
            data = res.json()
            for race in data.get('races', []):
                goal = race['goal']['name'].lower()
                # Check status and goal name
                if race['status'] == 'finished' and 'bingo' in goal:
                    bingo_races.append(race)
            
            total_pages = data.get('num_pages', 1)
            print(f"  - Page {page}/{total_pages} (Found {len(bingo_races)} bingo races)")
            page += 1
            time.sleep(1.5) # Anti-ban delay
        except Exception as e:
            print(f"  ! Request error: {e}")
            break
        
    return bingo_races

# --- Main Execution ---
id_map = get_user_id_map()
data_store = {}

for name in TARGET_USERS:
    lower_name = name.lower()
    if lower_name in id_map:
        history = fetch_bingo_data(name, id_map[lower_name])
        if history:
            data_store[lower_name] = {
                "username": name, 
                "races": history,
                "last_updated": time.strftime("%Y-%m-%d %H:%M:%S")
            }
    else:
        print(f" ! Could not find ID for '{name}' on the leaderboard. Is the name spelled exactly right?")
    
    # 3 second gap between different users to stay safe
    time.sleep(3)

# Save the final database
with open('data.json', 'w') as f:
    json.dump(data_store, f, indent=4)

print(f"\nSuccess! Saved {len(data_store)} users to data.json")
import requests
import json
import time

USERNAMES = [
    "tob3000", "triforce3250", "2DollarGargoyle"
]

def fetch_bingo_data(username):
    print(f"Fetching Ocarina of Time Bingo data for {username}...")
    try:
        # 1. Find User ID
        search_res = requests.get(f"https://racetime.gg/api/users/search?term={username}").json()
        if not search_res['results']: return None
        
        user_info = search_res['results'][0]
        user_url = user_info['url']
        
        bingo_races = []
        page = 1
        total_pages = 1
        
        # 2. Fetch History (Filtering for OoT category)
        while page <= total_pages:
            # We explicitly ask for category 'oot'
            race_res = requests.get(f"https://racetime.gg{user_url}/races/data?category=oot&page={page}").json()
            
            for race in race_res.get('races', []):
                goal_name = race['goal']['name'].lower()
                # STRICT FILTER: Must be finished AND contain "bingo"
                if race['status'] == 'finished' and 'bingo' in goal_name:
                    bingo_races.append(race)
            
            total_pages = race_res.get('num_pages', 1)
            print(f"  - Page {page}/{total_pages} (Found {len(bingo_races)} bingo races so far)")
            page += 1
            time.sleep(0.3) # Respect the API
            
        return {"username": user_info['name'], "races": bingo_races}
    except Exception as e:
        print(f"Error fetching {username}: {e}")
        return None

data_store = {}
for user in USERNAMES:
    data = fetch_bingo_data(user)
    if data:
        data_store[user.lower()] = data

with open('data.json', 'w') as f:
    json.dump(data_store, f)

print("Scraping complete. data.json created with filtered OoT Bingo races.")
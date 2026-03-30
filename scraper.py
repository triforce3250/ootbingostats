import requests
import json
import time

USERNAMES = [
    "tob3000", "triforce3250", "2DollarGargoyle"
]

# This tells Racetime.gg who is calling their API
HEADERS = {
    'User-Agent': 'OoT-Bingo-Stats-Bot/1.0 (Contact: your-github-username)'
}

def fetch_bingo_data(username):
    print(f"Fetching data for {username}...")
    try:
        # Search for user
        search_res = requests.get(
            f"https://racetime.gg/api/users/search?term={username}", 
            headers=HEADERS
        )
        
        # Check if we got a real response
        if search_res.status_code != 200:
            print(f"  ! Server returned error {search_res.status_code}")
            return None
            
        search_data = search_res.json()
        if not search_data['results']: return None
        
        user_info = search_data['results'][0]
        user_url = user_info['url']
        
        bingo_races = []
        page = 1
        total_pages = 1
        
        while page <= total_pages:
            race_res = requests.get(
                f"https://racetime.gg{user_url}/races/data?category=oot&page={page}",
                headers=HEADERS
            ).json()
            
            for race in race_res.get('races', []):
                goal_name = race['goal']['name'].lower()
                if race['status'] == 'finished' and 'bingo' in goal_name:
                    bingo_races.append(race)
            
            total_pages = race_res.get('num_pages', 1)
            print(f"  - Page {page}/{total_pages} (Bingo count: {len(bingo_races)})")
            page += 1
            time.sleep(1.0) # Increased delay to avoid being blocked
            
        return {"username": user_info['name'], "races": bingo_races}
    except Exception as e:
        print(f"  ! Error fetching {username}: {e}")
        return None

data_store = {}
for user in USERNAMES:
    data = fetch_bingo_data(user)
    if data:
        data_store[user.lower()] = data
    time.sleep(2.0) # Gap between different users

with open('data.json', 'w') as f:
    json.dump(data_store, f)

print("Scraping complete.")
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

def fetch_bingo_data(username):
    print(f"Searching for {username}...")
    try:
        # 1. SEARCH: Get the User ID (The Aa5veo... part)
        # We use the 'term' parameter exactly as the site does
        search_url = f"https://racetime.gg/api/users/search?term={username}"
        search_res = requests.get(search_url, headers=HEADERS)
        
        if search_res.status_code != 200:
            print(f"  ! Search failed for {username} (Status: {search_res.status_code})")
            return None
            
        search_data = search_res.json()
        results = search_data.get('results', [])
        
        if not results:
            print(f"  ! No results found for {username}")
            return None

        # Find the best match (the first result)
        user_info = results[0]
        user_id_url = user_info['url'] # This will be /user/Aa5v.../username
        display_name = user_info['name']

        print(f"  > Found ID-URL: {user_id_url}")
        
        bingo_races = []
        page = 1
        total_pages = 1
        
        # 2. DATA FETCH: Use the specific ID-URL to get race history
        while page <= total_pages:
            data_url = f"https://racetime.gg{user_id_url}/races/data?category=oot&page={page}"
            data_res = requests.get(data_url, headers=HEADERS)
            
            if data_res.status_code != 200:
                print(f"  ! Data fetch failed on page {page}")
                break
                
            data = data_res.json()
            
            for race in data.get('races', []):
                goal_name = race['goal']['name'].lower()
                if race['status'] == 'finished' and 'bingo' in goal_name:
                    bingo_races.append(race)
            
            total_pages = data.get('num_pages', 1)
            print(f"  - Page {page}/{total_pages} (Bingo count: {len(bingo_races)})")
            
            page += 1
            time.sleep(1.2) # Gentle delay
            
        return {"username": display_name, "races": bingo_races}

    except Exception as e:
        print(f"  ! Error processing {username}: {e}")
        return None

# Main execution loop
data_store = {}
for user in USERNAMES:
    result = fetch_bingo_data(user)
    if result and result['races']:
        data_store[user.lower()] = result
    time.sleep(2.5) # Gap between users to prevent rate-limiting

with open('data.json', 'w') as f:
    json.dump(data_store, f)

print(f"Scraping complete. Database updated with {len(data_store)} users.")
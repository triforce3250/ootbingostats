import requests
import json
import time

USERNAMES = [
    "tob3000", "triforce3250", "2DollarGargoyle"
]

def fetch_user_data(username):
    print(f"Fetching data for {username}...")
    try:
        # 1. Search for user to get URL/ID
        search_url = f"https://racetime.gg/api/users/search?term={username}"
        res = requests.get(search_url).json()
        if not res['results']: 
            print(f"User {username} not found.")
            return None
        
        # We find the exact match (or first result)
        user_info = res['results'][0]
        user_url = user_info['url']
        user_display_name = user_info['name']
        
        all_races = []
        page = 1
        total_pages = 1
        
        # 2. Loop through pages (fetching all history)
        while page <= total_pages:
            print(f"  - Page {page}...")
            race_url = f"https://racetime.gg{user_url}/races/data?category=oot&page={page}"
            race_res = requests.get(race_url).json()
            
            if 'races' in race_res:
                all_races.extend(race_res['races'])
            
            total_pages = race_res.get('num_pages', 1)
            page += 1
            time.sleep(0.5) # Prevent hitting Racetime.gg rate limits
            
        return {"username": user_display_name, "races": all_races}
    except Exception as e:
        print(f"Error fetching {username}: {e}")
        return None

# Execution
data_store = {}
for user in USERNAMES:
    data = fetch_user_data(user)
    if data:
        # Store using lowercase key for easy lookups
        data_store[user.lower()] = data

# Save the final file
with open('data.json', 'w') as f:
    json.dump(data_store, f)
print("Finished! data.json has been updated.")
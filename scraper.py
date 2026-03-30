import requests
import json
import os

# Usernames to track
USERNAMES = ["tob3000", "triforce3250", "2DollarGargoyle"]

def fetch_user_data(username):
    print(f"Fetching data for {username}...")
    # 1. Get User ID
    search_url = f"https://racetime.gg/api/users/search?term={username}"
    res = requests.get(search_url).json()
    if not res['results']: return None
    
    user_url = res['results'][0]['url']
    all_races = []
    page = 1
    total_pages = 1
    
    # 2. Loop through all pages
    while page <= total_pages:
        race_url = f"https://racetime.gg{user_url}/races/data?category=oot&page={page}"
        race_res = requests.get(race_url).json()
        all_races.extend(race_res['races'])
        total_pages = race_res['num_pages']
        page += 1
        
    return {"username": username, "races": all_races}

# Main execution
data_store = {}
for user in USERNAMES:
    data = fetch_user_data(user)
    if data:
        data_store[user.lower()] = data

# Save to a file that the website can read
with open('data.json', 'w') as f:
    json.dump(data_store, f)
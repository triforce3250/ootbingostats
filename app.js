let bingoChartInstance = null;

document.getElementById('searchBtn').addEventListener('click', () => {
    const username = document.getElementById('usernameInput').value.trim();
    if (username) {
        fetchStats(username);
    }
});

async function fetchStats(username) {
    const statusDiv = document.getElementById('statusMessage');
    const proxy = "https://corsproxy.io/?"; // The middleman to bypass CORS
    
    statusDiv.textContent = 'Searching for user...';
    statusDiv.style.color = '#333';

    // Reset chart if it exists to prepare for new data
    if (bingoChartInstance) {
        bingoChartInstance.destroy();
    }

    try {
        // 1. Get User ID from Racetime.gg via Proxy
        const searchUrl = encodeURIComponent(`https://racetime.gg/api/users/search?term=${username}`);
        const searchRes = await fetch(`${proxy}${searchUrl}`);
        const searchData = await searchRes.json();

        if (!searchData.results || searchData.results.length === 0) {
            statusDiv.textContent = 'User not found on Racetime.gg.';
            statusDiv.style.color = '#e74c3c';
            return;
        }

        const userUrl = searchData.results[0].url; 
        const actualName = searchData.results[0].name;
        
        // 2. Pagination Variables
        let page = 1;
        let totalPages = 1; 
        let allRaces = [];

        // Loop until all pages are fetched
        while (page <= totalPages) {
            statusDiv.textContent = `Fetching history... Page ${page} of ${totalPages > 1 ? totalPages : '?'}`;
            
            const raceUrl = encodeURIComponent(`https://racetime.gg${userUrl}/races/data?category=oot&page=${page}`);
            const racesRes = await fetch(`${proxy}${raceUrl}`);
            const racesData = await racesRes.json();
            
            if (racesData.races && racesData.races.length > 0) {
                allRaces = allRaces.concat(racesData.races);
            }
            
            // Update the total page count from the API response
            totalPages = racesData.num_pages || 1;
            page++;
            
            // Small delay to prevent rate-limiting
            await new Promise(resolve => setTimeout(resolve, 200)); 
        }

        statusDiv.textContent = 'Processing Bingo data...';

        // 3. Filter for Bingo goals and format for Chart.js
        const bingoData = [];
        
        allRaces.forEach(race => {
            const goalName = race.goal.name.toLowerCase();
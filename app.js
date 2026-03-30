let bingoChartInstance = null;

document.getElementById('searchBtn').addEventListener('click', () => {
    const username = document.getElementById('usernameInput').value.trim();
    if (username) {
        fetchStats(username);
    }
});

async function fetchStats(username) {
    const statusDiv = document.getElementById('statusMessage');
    // Using AllOrigins - a much more stable proxy for GitHub Pages
    const proxy = "https://api.allorigins.win/get?url=";
    
    statusDiv.textContent = 'Searching for user...';
    statusDiv.style.color = '#333';

    if (bingoChartInstance) { bingoChartInstance.destroy(); }

    try {
        // 1. Get User ID
        const searchUrl = `https://racetime.gg/api/users/search?term=${username}&cb=${Date.now()}`;
        const searchRes = await fetch(`${proxy}${encodeURIComponent(searchUrl)}`);
        
        if (!searchRes.ok) throw new Error("Proxy connection failed.");
        
        const searchDataWrapper = await searchRes.json();
        const searchData = JSON.parse(searchDataWrapper.contents);

        if (!searchData.results || searchData.results.length === 0) {
            statusDiv.textContent = 'User not found.';
            return;
        }

        const userUrl = searchData.results[0].url; 
        const actualName = searchData.results[0].name;
        
        let page = 1;
        let totalPages = 1; 
        let allRaces = [];

        while (page <= totalPages) {
            statusDiv.textContent = `Fetching history... Page ${page} of ${totalPages > 1 ? totalPages : '?'}`;
            
            const raceUrl = `https://racetime.gg${userUrl}/races/data?category=oot&page=${page}&cb=${Date.now()}`;
            const racesRes = await fetch(`${proxy}${encodeURIComponent(raceUrl)}`);
            const racesDataWrapper = await racesRes.json();
            const racesData = JSON.parse(racesDataWrapper.contents);
            
            if (racesData.races) {
                allRaces = allRaces.concat(racesData.races);
            }
            
            totalPages = racesData.num_pages || 1;
            page++;
            await new Promise(resolve => setTimeout(resolve, 350)); 
        }

        statusDiv.textContent = 'Processing Bingo data...';
        processAndRender(allRaces, userUrl, actualName);

    } catch (error) {
        console.error("Full Error:", error);
        statusDiv.textContent = 'Error: ' + error.message;
        statusDiv.style.color = '#e74c3c';
    }
}

function processAndRender(allRaces, userUrl, actualName) {
    const bingoData = [];
    const userId = userUrl.split('/').pop(); // Extract "ID" from "/user/ID"

    allRaces.forEach(race => {
        const goalName = race.goal.name.toLowerCase();
        if (race.status === 'finished' && goalName.includes('bingo')) {
            // Match the entrant by checking if their URL contains the user ID
            const entrant = race.entrants.find(e => e.user.url.includes(userId));
            
            if (entrant && entrant.finish_time) {
                bingoData.push({
                    x: new Date(race.ended_at),
                    y: parseISO8601Duration(entrant.finish_time),
                    goal: race.goal.name 
                });
            }
        }
    });

    if (bingoData.length === 0) {
        document.getElementById('statusMessage').textContent = `No Bingo races found for ${actualName}.`;
        return;
    }

    bingoData.sort((a, b) => a.x - b.x);
    document.getElementById('statusMessage').textContent = `Plotted ${bingoData.length} Bingo races!`;
    renderChart(bingoData, actualName);
}

function parseISO8601Duration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?/);
    if (!match) return 0;
    return ((parseFloat(match[1]) || 0) * 3600) + ((parseFloat(match[2]) || 0) * 60) + (parseFloat(match[3]) || 0);
}

function formatSecondsToHHMMSS(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${hours > 0 ? hours + ':' : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function renderChart(data, username) {
    const ctx = document.getElementById('bingoChart').getContext('2d');
    bingoChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: `${username}'s Bingo Times`,
                data: data,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                pointRadius: 3,
                fill: false,
                tension: 0.1 
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { type: 'time', time: { unit: 'month' } },
                y: {
                    ticks: { callback: (val) => formatSecondsToHHMMSS(val) }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (ctx) => `Time: ${formatSecondsToHHMMSS(ctx.raw.y)} [${ctx.raw.goal}]`
                    }
                }
            }
        }
    });
}
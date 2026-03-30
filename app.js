let bingoChartInstance = null;

document.getElementById('searchBtn').addEventListener('click', () => {
    const username = document.getElementById('usernameInput').value.trim();
    if (username) fetchStats(username);
});

async function fetchStats(username) {
    const statusDiv = document.getElementById('statusMessage');
    // Using corsproxy.io directly as a prefix - very fast and stable
    const proxy = "https://corsproxy.io/?";
    
    statusDiv.innerHTML = 'Searching for user...';
    statusDiv.style.color = '#333';

    if (bingoChartInstance) bingoChartInstance.destroy();

    try {
        // 1. Get User Data
        const searchUrl = `https://racetime.gg/api/users/search?term=${username}`;
        const searchRes = await fetch(proxy + encodeURIComponent(searchUrl));
        
        if (!searchRes.ok) throw new Error("Could not connect to Racetime.gg via proxy.");
        const searchData = await searchRes.json();

        if (!searchData.results || searchData.results.length === 0) {
            statusDiv.textContent = 'User not found.';
            return;
        }

        const userUrl = searchData.results[0].url; 
        const actualName = searchData.results[0].name;
        const userId = userUrl.split('/').pop();
        
        let page = 1, totalPages = 1, allRaces = [];

        while (page <= totalPages) {
            statusDiv.textContent = `Fetching Page ${page}...`;
            const raceUrl = `https://racetime.gg${userUrl}/races/data?category=oot&page=${page}`;
            const racesRes = await fetch(proxy + encodeURIComponent(raceUrl));
            const racesData = await racesRes.json();
            
            if (racesData.races) allRaces = allRaces.concat(racesData.races);
            totalPages = racesData.num_pages || 1;
            page++;
            if (page <= totalPages) await new Promise(r => setTimeout(r, 200)); 
        }

        // 2. Process Data
        const bingoData = [];
        allRaces.forEach(race => {
            const goal = race.goal.name.toLowerCase();
            if (race.status === 'finished' && goal.includes('bingo')) {
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
            statusDiv.textContent = `No Bingo races found for ${actualName}.`;
            return;
        }

        // 3. Calculate Stats for the Dashboard
        bingoData.sort((a, b) => a.x - b.x);
        const times = bingoData.map(d => d.y);
        const pb = Math.min(...times);
        const avg = times.reduce((a, b) => a + b, 0) / times.length;

        statusDiv.innerHTML = `
            <div style="font-size: 1.2rem; margin-bottom: 10px;"><strong>${actualName}</strong></div>
            <span style="color: #27ae60">PB: ${formatSecondsToHHMMSS(pb)}</span> | 
            <span style="color: #3498db">Average: ${formatSecondsToHHMMSS(avg)}</span> | 
            <span>Races: ${bingoData.length}</span>
        `;

        renderChart(bingoData, actualName);
        document.getElementById('downloadBtn').style.display = 'inline-block';

    } catch (error) {
        console.error(error);
        statusDiv.textContent = "Error: Proxy is busy. Try again in 5 seconds.";
        statusDiv.style.color = '#e74c3c';
    }
}

// Helpers
function parseISO8601Duration(d) {
    const m = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?/);
    return ((parseFloat(m[1])||0)*3600)+((parseFloat(m[2])||0)*60)+(parseFloat(m[3])||0);
}

function formatSecondsToHHMMSS(s) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function renderChart(data, name) {
    const ctx = document.getElementById('bingoChart').getContext('2d');
    bingoChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: `Bingo Times`,
                data: data,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { type: 'time', time: { unit: 'month' } },
                y: { ticks: { callback: v => formatSecondsToHHMMSS(v) } }
            },
            plugins: {
                tooltip: {
                    callbacks: { label: c => `Time: ${formatSecondsToHHMMSS(c.raw.y)} (${c.raw.goal})` }
                }
            }
        }
    });
}
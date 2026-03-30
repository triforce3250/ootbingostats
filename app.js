let bingoChartInstance = null;

document.getElementById('searchBtn').addEventListener('click', () => {
    const username = document.getElementById('usernameInput').value.trim();
    if (username) fetchStats(username);
});

// Helper to try multiple proxies if one fails
async function fetchWithRetry(targetUrl) {
    const proxies = [
        "https://corsproxy.io/?",
        "https://api.allorigins.win/get?url=",
        "https://proxy.cors.sh/" // Backup 2
    ];

    for (let proxy of proxies) {
        try {
            const finalUrl = proxy.includes('allorigins') 
                ? `${proxy}${encodeURIComponent(targetUrl)}` 
                : `${proxy}${encodeURIComponent(targetUrl)}`;
            
            const response = await fetch(finalUrl);
            if (!response.ok) continue; // Try next proxy if this one 404s/500s

            if (proxy.includes('allorigins')) {
                const data = await response.json();
                return JSON.parse(data.contents);
            } else {
                return await response.json();
            }
        } catch (err) {
            console.warn(`Proxy ${proxy} failed, trying next...`);
        }
    }
    throw new Error("All proxies are currently busy. Please wait 10 seconds and try again.");
}

async function fetchStats(username) {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.innerHTML = 'Searching for user...';
    statusDiv.style.color = '#333';

    try {
        // 1. Get User ID
        const userData = await fetchWithRetry(`https://racetime.gg/api/users/search?term=${username}`);

        if (!userData.results || userData.results.length === 0) {
            statusDiv.textContent = 'User not found.';
            return;
        }

        const userUrl = userData.results[0].url; 
        const actualName = userData.results[0].name;
        const userId = userUrl.split('/').pop();
        
        let page = 1, totalPages = 1, allRaces = [];

        while (page <= totalPages) {
            statusDiv.textContent = `Fetching Page ${page}...`;
            const racesData = await fetchWithRetry(`https://racetime.gg${userUrl}/races/data?category=oot&page=${page}`);
            
            if (racesData.races) allRaces = allRaces.concat(racesData.races);
            totalPages = racesData.num_pages || 1;
            page++;
            if (page <= totalPages) await new Promise(r => setTimeout(r, 400)); // Be gentle
        }

        // 2. Process Data
        const bingoData = allRaces
            .filter(r => r.status === 'finished' && r.goal.name.toLowerCase().includes('bingo'))
            .map(r => {
                const entrant = r.entrants.find(e => e.user.url.includes(userId));
                return entrant ? { x: new Date(r.ended_at), y: parseISO8601Duration(entrant.finish_time), goal: r.goal.name } : null;
            })
            .filter(d => d !== null)
            .sort((a, b) => a.x - b.x);

        if (bingoData.length === 0) {
            statusDiv.textContent = `No Bingo races found for ${actualName}.`;
            return;
        }

        // 3. Update UI
        const times = bingoData.map(d => d.y);
        statusDiv.innerHTML = `
            <strong>${actualName}</strong> | 
            <span style="color: #27ae60">PB: ${formatSecondsToHHMMSS(Math.min(...times))}</span> | 
            <span>Races: ${bingoData.length}</span>
        `;

        renderChart(bingoData, actualName);

    } catch (error) {
        statusDiv.textContent = error.message;
        statusDiv.style.color = '#e74c3c';
    }
}

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
    if (bingoChartInstance) bingoChartInstance.destroy();
    bingoChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: `Bingo Times`,
                data: data,
                borderColor: '#3498db',
                tension: 0.2,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { type: 'time' },
                y: { ticks: { callback: v => formatSecondsToHHMMSS(v) } }
            }
        }
    });
}
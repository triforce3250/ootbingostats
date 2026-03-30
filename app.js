let bingoChartInstance = null;

// Listen for the search button click
document.getElementById('searchBtn').addEventListener('click', () => {
    const username = document.getElementById('usernameInput').value.trim();
    if (username) {
        fetchStats(username);
    }
});

async function fetchStats(username) {
    const statusDiv = document.getElementById('statusMessage');
    const downloadBtn = document.getElementById('downloadBtn');
    
    // The Proxy Prefix
    const proxy = "https://corsproxy.io/?";
    
    statusDiv.innerHTML = 'Searching for user...';
    statusDiv.style.color = '#333';
    if (downloadBtn) downloadBtn.style.display = 'none';

    // Clear previous chart if it exists
    if (bingoChartInstance) {
        bingoChartInstance.destroy();
    }

    try {
        // 1. Get User ID from Racetime.gg
        const searchUrl = encodeURIComponent(`https://racetime.gg/api/users/search?term=${username}`);
        const searchRes = await fetch(proxy + searchUrl);
        
        if (!searchRes.ok) throw new Error("Proxy error: Racetime.gg is unreachable.");
        
        const searchData = await searchRes.json();

        if (!searchData.results || searchData.results.length === 0) {
            statusDiv.textContent = 'User not found on Racetime.gg.';
            statusDiv.style.color = '#e74c3c';
            return;
        }

        const userUrl = searchData.results[0].url; 
        const actualName = searchData.results[0].name;
        const userId = userUrl.split('/').pop();
        
        // 2. Fetch User's OoT Races with Pagination
        let page = 1;
        let totalPages = 1; 
        let allRaces = [];

        while (page <= totalPages) {
            statusDiv.textContent = `Fetching Page ${page} of ${totalPages > 1 ? totalPages : '?'}`;
            
            const raceUrl = encodeURIComponent(`https://racetime.gg${userUrl}/races/data?category=oot&page=${page}`);
            const racesRes = await fetch(proxy + raceUrl);
            const racesData = await racesRes.json();
            
            if (racesData.races) {
                allRaces = allRaces.concat(racesData.races);
            }
            
            totalPages = racesData.num_pages || 1;
            page++;
            
            // Short delay to avoid rate-limiting
            if (page <= totalPages) await new Promise(r => setTimeout(r, 250)); 
        }

        // 3. Filter for Bingo goals and format Data
        const bingoData = [];
        
        allRaces.forEach(race => {
            const goalName = race.goal.name.toLowerCase();
            // Filter: Finished races with "bingo" in the goal name
            if (race.status === 'finished' && goalName.includes('bingo')) {
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
            statusDiv.textContent = `No completed Bingo races found for ${actualName}.`;
            statusDiv.style.color = '#e74c3c';
            return;
        }

        // Sort by date
        bingoData.sort((a, b) => a.x - b.x);

        // 4. Calculate Stats (PB and Average)
        const times = bingoData.map(d => d.y);
        const pbSeconds = Math.min(...times);
        const avgSeconds = times.reduce((a, b) => a + b, 0) / times.length;

        statusDiv.innerHTML = `
            <div style="margin-bottom: 10px; font-size: 1.1em;"><strong>${actualName}</strong></div>
            <div style="display: flex; gap: 15px; justify-content: center; font-size: 0.9em;">
                <span style="color: #27ae60;"><strong>PB:</strong> ${formatSecondsToHHMMSS(pbSeconds)}</span>
                <span style="color: #3498db;"><strong>Avg:</strong> ${formatSecondsToHHMMSS(avgSeconds)}</span>
                <span><strong>Races:</strong> ${bingoData.length}</span>
            </div>
        `;

        // 5. Render Chart
        renderChart(bingoData, actualName);
        if (downloadBtn) downloadBtn.style.display = 'inline-block';

    } catch (error) {
        console.error(error);
        statusDiv.textContent = 'Connection Error. The proxy might be down. Please try again.';
        statusDiv.style.color = '#e74c3c';
    }
}

/** * HELPER FUNCTIONS
 */

function parseISO8601Duration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?/);
    if (!match) return 0;
    const h = (parseFloat(match[1]) || 0) * 3600;
    const m = (parseFloat(match[2]) || 0) * 60;
    const s = (parseFloat(match[3]) || 0);
    return h + m + s;
}

function formatSecondsToHHMMSS(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const hStr = hours > 0 ? `${hours}:` : '';
    const mStr = minutes.toString().padStart(2, '0');
    const sStr = seconds.toString().padStart(2, '0');
    return `${hStr}${mStr}:${sStr}`;
}

function renderChart(data, username) {
    const ctx = document.getElementById('bingoChart').getContext('2d');
    bingoChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: `Bingo Completion Time`,
                data: data,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.2 
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: { unit: 'month' },
                    title: { display: true, text: 'Date' }
                },
                y: {
                    title: { display: true, text: 'Time (hh:mm:ss)' },
                    ticks: {
                        callback: (value) => formatSecondsToHHMMSS(value)
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const time = formatSecondsToHHMMSS(context.raw.y);
                            return `Time: ${time} (${context.raw.goal})`;
                        }
                    }
                }
            }
        }
    });
}

// Logic for the Download Button (if you have it in index.html)
const downloadBtn = document.getElementById('downloadBtn');
if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
        const canvas = document.getElementById('bingoChart');
        const link = document.createElement('a');
        link.download = `bingo-stats-${Date.now()}.png`;
        
        // Ensure white background for the PNG
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.fillStyle = "#ffffff";
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(canvas, 0, 0);
        
        link.href = tempCanvas.toDataURL("image/png");
        link.click();
    });
}
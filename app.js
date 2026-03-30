let bingoChartInstance = null;

document.getElementById('searchBtn').addEventListener('click', () => {
    const username = document.getElementById('usernameInput').value.trim();
    if (username) {
        fetchStats(username);
    }
});

async function fetchStats(username) {
    const statusDiv = document.getElementById('statusMessage');
    // Switching to AllOrigins proxy - it's more reliable for this specific API
    const proxy = "https://api.allorigins.win/get?url=";
    
    statusDiv.textContent = 'Searching for user...';
    statusDiv.style.color = '#333';

    if (bingoChartInstance) { bingoChartInstance.destroy(); }

    try {
        // 1. Get User ID
        const searchUrl = `https://racetime.gg/api/users/search?term=${username}`;
        const searchRes = await fetch(`${proxy}${encodeURIComponent(searchUrl)}`);
        const searchDataWrapper = await searchRes.json();
        
        // AllOrigins wraps the result in a "contents" string, so we parse it again
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
            
            const raceUrl = `https://racetime.gg${userUrl}/races/data?category=oot&page=${page}`;
            const racesRes = await fetch(`${proxy}${encodeURIComponent(raceUrl)}`);
            const racesDataWrapper = await racesRes.json();
            const racesData = JSON.parse(racesDataWrapper.contents);
            
            if (racesData.races) {
                allRaces = allRaces.concat(racesData.races);
            }
            
            totalPages = racesData.num_pages || 1;
            page++;
            await new Promise(resolve => setTimeout(resolve, 300)); // Slightly longer delay for safety
        }

        statusDiv.textContent = 'Processing Bingo data...';

        // 3. Filter for Bingo goals and format for Chart.js
        const bingoData = [];
        
        allRaces.forEach(race => {
            const goalName = race.goal.name.toLowerCase();
            
            // Filter: Must be 'finished' and name must contain 'bingo'
            if (race.status === 'finished' && goalName.includes('bingo')) {
                const entrant = race.entrants.find(e => e.user.url === userUrl);
                
                if (entrant && entrant.finish_time) {
                    const seconds = parseISO8601Duration(entrant.finish_time);
                    bingoData.push({
                        x: new Date(race.ended_at),
                        y: seconds,
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

        // Sort data by date (oldest first)
        bingoData.sort((a, b) => a.x - b.x);

        statusDiv.textContent = `Success! Plotted ${bingoData.length} Bingo races for ${actualName}.`;
        statusDiv.style.color = '#27ae60';

        // 4. Render the final chart
        renderChart(bingoData, actualName);

    } catch (error) {
        console.error("Error details:", error);
        statusDiv.textContent = 'Failed to fetch data. The CORS proxy might be down or the username is invalid.';
        statusDiv.style.color = '#e74c3c';
    }
}

/** * HELPER FUNCTIONS
 */

// Converts ISO 8601 duration (PT1H20M30S) to total seconds
function parseISO8601Duration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?/);
    if (!match) return 0;
    const hours = (parseFloat(match[1]) || 0);
    const minutes = (parseFloat(match[2]) || 0);
    const seconds = (parseFloat(match[3]) || 0);
    return (hours * 3600) + (minutes * 60) + seconds;
}

// Converts total seconds to hh:mm:ss string
function formatSecondsToHHMMSS(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const h = hours > 0 ? `${hours}:` : '';
    const m = minutes.toString().padStart(2, '0');
    const s = seconds.toString().padStart(2, '0');
    return `${h}${m}:${s}`;
}

function renderChart(data, username) {
    const ctx = document.getElementById('bingoChart').getContext('2d');

    bingoChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: `${username}'s OoT Bingo Times`,
                data: data,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                pointRadius: 3,
                pointHoverRadius: 6,
                fill: false,
                tension: 0.1 
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'month',
                        tooltipFormat: 'PP' // Localized date format (e.g., Mar 29, 2026)
                    },
                    title: { display: true, text: 'Race Date' }
                },
                y: {
                    title: { display: true, text: 'Time (hh:mm:ss)' },
                    ticks: {
                        callback: function(value) {
                            return formatSecondsToHHMMSS(value);
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const timeStr = formatSecondsToHHMMSS(context.raw.y);
                            return `Time: ${timeStr} [${context.raw.goal}]`;
                        }
                    }
                }
            }
        }
    });
}
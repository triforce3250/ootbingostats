let bingoChartInstance = null;

document.getElementById('searchBtn').addEventListener('click', () => {
    const username = document.getElementById('usernameInput').value.trim();
    if (username) {
        fetchStats(username);
    }
});

async function fetchStats(username) {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.textContent = 'Searching for user...';
    statusDiv.style.color = '#333';

    try {
        // 1. Get User ID from Racetime.gg
        const searchRes = await fetch(`https://racetime.gg/api/users/search?term=${username}`);
        const searchData = await searchRes.json();

        if (!searchData.results || searchData.results.length === 0) {
            statusDiv.textContent = 'User not found.';
            statusDiv.style.color = '#e74c3c';
            return;
        }

        const userUrl = searchData.results[0].url; 
        const actualName = searchData.results[0].name; // Grab their properly capitalized name
        
        // 2. Fetch User's OoT Races with Pagination
        let page = 1;
        let totalPages = 1; 
        let allRaces = [];

        // Loop until we've fetched every page
        while (page <= totalPages) {
            statusDiv.textContent = `Fetching race history... (Page ${page} of ${totalPages > 1 ? totalPages : '?'})`;
            
            const racesRes = await fetch(`https://racetime.gg${userUrl}/races/data?category=oot&page=${page}`);
            const racesData = await racesRes.json();
            
            // Add the races from this page to our master list
            if (racesData.races && racesData.races.length > 0) {
                allRaces = allRaces.concat(racesData.races);
            }
            
            // Update the total pages based on the API's response
            if (racesData.num_pages) {
                totalPages = racesData.num_pages;
            }
            
            page++;
            
            // A tiny 200ms delay to be polite to the Racetime.gg servers and avoid rate-limits
            await new Promise(resolve => setTimeout(resolve, 200)); 
        }

        statusDiv.textContent = 'Processing data...';

        // 3. Filter and Format Data
        const bingoData = [];
        
        allRaces.forEach(race => {
            const goalName = race.goal.name.toLowerCase();
            
            // Only plot finished races that are a Bingo variant
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
            statusDiv.textContent = 'No completed Bingo races found for this user.';
            statusDiv.style.color = '#e74c3c';
            return;
        }

        // Sort chronologically (oldest to newest)
        bingoData.sort((a, b) => a.x - b.x);

        statusDiv.textContent = `Success! Plotted ${bingoData.length} completed Bingo races for ${actualName}.`;
        statusDiv.style.color = '#27ae60';

        // 4. Draw the Chart
        renderChart(bingoData, actualName);

    } catch (error) {
        console.error(error);
        statusDiv.textContent = 'An error occurred while fetching data. Check the console.';
        statusDiv.style.color = '#e74c3c';
    }
}

// Helper: Convert Racetime's duration format (e.g., PT1H23M45.123S) to total seconds
function parseISO8601Duration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?/);
    if (!match) return 0;
    
    const hours = (parseFloat(match[1]) || 0);
    const minutes = (parseFloat(match[2]) || 0);
    const seconds = (parseFloat(match[3]) || 0);
    
    return (hours * 3600) + (minutes * 60) + seconds;
}

// Helper: Convert total seconds to hh:mm:ss for the chart axes and tooltips
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

    // Destroy old chart if searching a new user
    if (bingoChartInstance) {
        bingoChartInstance.destroy();
    }

    bingoChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: `${username}'s Bingo Times`,
                data: data,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                pointRadius: 3,        // Slightly smaller points since there is more data
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
                        tooltipFormat: 'MMM d, yyyy' // Makes the hover date look nice
                    },
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Time (hh:mm:ss)'
                    },
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
                            const goalStr = context.raw.goal;
                            return `Time: ${timeStr} (${goalStr})`;
                        }
                    }
                }
            }
        }
    });
}
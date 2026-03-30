let fullData = {};

// 1. Load the data
fetch('data.json')
    .then(res => res.json())
    .then(data => {
        fullData = data;
        console.log("Database loaded:", Object.keys(data).length, "users found.");
    });

// 2. Duration Parser
function parseDuration(duration) {
    if (!duration) return 0;

    // Regex to capture Days, Hours, Minutes, and Seconds
    // Example: P0DT01H13M20.845454S
    const regex = /P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)(?:\.\d+)?)?S/;
    const matches = duration.match(regex);
    
    if (!matches) return 0;

    const days = parseInt(matches[1] || 0);
    const hours = parseInt(matches[2] || 0);
    const minutes = parseInt(matches[3] || 0);
    const seconds = parseInt(matches[4] || 0);

    // Convert everything to total minutes for the Y-axis
    // We include seconds as a fraction (e.g., 30s = 0.5min) for accuracy
    return (days * 1440) + (hours * 60) + minutes + (seconds / 60);
}

// 3. Search Function
function searchUser() {
    const input = document.getElementById('userSearch').value.toLowerCase();
    const userData = fullData[input];

    if (!userData) {
        alert("User not found in database. Check spelling!");
        return;
    }

    renderChart(userData);
}

// 4. Chart Rendering (Chart.js)
let myChart;
function renderChart(userData) {
    const ctx = document.getElementById('statsChart').getContext('2d');
    
    // Process races: x is Date, y is Total Minutes
    const points = userData.races.map(race => ({
        x: new Date(race.ended_at),
        y: parseDuration(race.user_finish_time),
        goal: race.goal.name
    })).sort((a, b) => a.x - b.x);

    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: `${userData.username} - Bingo History`,
                data: points,
                borderColor: '#00ccff',
                backgroundColor: 'rgba(0, 204, 255, 0.1)',
                tension: 0.3,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: { unit: 'month' },
                    grid: { color: '#333' }
                },
                y: {
                    title: { display: true, text: 'Finish Time', color: '#888' },
                    grid: { color: '#333' },
                    ticks: {
                        // FORMATTER: Converts minutes back to "1h 15m" for the axis
                        callback: function(value) {
                            const h = Math.floor(value / 60);
                            const m = Math.round(value % 60);
                            return h > 0 ? `${h}h ${m}m` : `${m}m`;
                        },
                        color: '#aaa'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        // Format the tooltip time as well
                        label: function(context) {
                            const val = context.raw.y;
                            const h = Math.floor(val / 60);
                            const m = Math.floor(val % 60);
                            const s = Math.round((val % 1) * 60);
                            const timeStr = h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
                            return ` Time: ${timeStr}`;
                        },
                        footer: (items) => `Goal: ${items[0].raw.goal}`
                    }
                }
            }
        }
    });
}

function quickSearch(name) {
    document.getElementById('userSearch').value = name;
    searchUser();
}

function searchUser() {
    const input = document.getElementById('userSearch').value.toLowerCase().trim();
    const userData = fullData[input];

    if (!userData) {
        alert("User not found in current database.");
        return;
    }

    document.getElementById('loadingMessage').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    
    // Set the update timestamp from the data
    if(userData.last_updated) {
        document.getElementById('updateTimestamp').innerText = `Last Scraped: ${userData.last_updated}`;
    }

    renderChart(userData);
}
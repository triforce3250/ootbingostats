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
    
    // 1. Raw Data Points
    const rawPoints = userData.races.map(race => ({
        x: new Date(race.ended_at),
        y: parseDuration(race.user_finish_time),
        goal: race.goal.name
    })).filter(p => p.y > 0).sort((a, b) => a.x - b.x);

    // 2. Calculate Trend Line (10-race Moving Average)
    const trendPoints = rawPoints.map((point, index, array) => {
        const start = Math.max(0, index - 9);
        const subset = array.slice(start, index + 1);
        const average = subset.reduce((sum, p) => sum + p.y, 0) / subset.length;
        return { x: point.x, y: average };
    });

    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Individual Races',
                    data: rawPoints,
                    borderColor: 'rgba(0, 204, 255, 0.3)', // Fainter color for dots
                    pointBackgroundColor: '#00ccff',
                    showLine: false, // Scatter style
                    pointRadius: 3
                },
                {
                    label: 'Skill Trend (10-race Avg)',
                    data: trendPoints,
                    borderColor: '#ffcc00', // Gold trend line
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    pointRadius: 0, // Smooth line without dots
                    tension: 0.4
                }
            ]
        },
        options: {
            // ... (keep the same scales and tooltips from before) ...
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
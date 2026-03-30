let fullData = {};

// 1. Load the data
fetch('data.json')
    .then(res => res.json())
    .then(data => {
        fullData = data;
        console.log("Database loaded:", Object.keys(data).length, "users found.");
    });

// 2. Duration Parser (ISO8601 like "P0DT01H20M05S" to total minutes)
function parseDuration(duration) {
    if (!duration) return 0;
    const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const matches = duration.match(regex);
    if (!matches) return 0;
    const hours = parseInt(matches[1] || 0);
    const minutes = parseInt(matches[2] || 0);
    return (hours * 60) + minutes;
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
    
    // Process races for the chart
    const points = userData.races.map(race => ({
        x: new Date(race.ended_at),
        y: parseDuration(race.user_finish_time),
        goal: race.goal.name
    })).sort((a, b) => a.x - b.x); // Keep chronologically sorted

    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: `${userData.username} - Bingo Times (Minutes)`,
                data: points,
                borderColor: '#00ccff',
                backgroundColor: 'rgba(0, 204, 255, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            scales: {
                x: { type: 'time', time: { unit: 'month' }, title: { display: true, text: 'Date' } },
                y: { title: { display: true, text: 'Time (Minutes)' }, beginAtZero: false }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        footer: (items) => `Goal: ${items[0].raw.goal}`
                    }
                }
            }
        }
    });
}

// Add this at the bottom of your app.js
function quickSearch(name) {
    document.getElementById('userSearch').value = name;
    searchUser();
}

// And update your searchUser function to show the dashboard
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
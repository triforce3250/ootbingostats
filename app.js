let bingoData = {};

// 1. Load the data
fetch('data.json')
    .then(response => response.json())
    .then(data => {
        bingoData = data; // Save to global variable
        
        populateSearchList(bingoData);
        
        // Optional: Load a default user (like tob3000) on start
        if (bingoData['tob3000']) {
            renderChart(bingoData['tob3000']);
        }
    })
    .catch(error => console.error('Error loading bingo data:', error));

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
    const userData = bingoData[input];

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
    
    // 1. Raw Data Points (Individual Races)
    const rawPoints = userData.races.map(race => ({
        x: new Date(race.ended_at),
        y: parseDuration(race.user_finish_time),
        goal: race.goal.name,
        url: race.full_race_url // This was added by the updated scraper
    })).filter(p => p.y > 0).sort((a, b) => a.x - b.x);

    // 2. Trend Line Calculation
    const trendPoints = rawPoints.map((point, index, array) => {
        const start = Math.max(0, index - 9);
        const subset = array.slice(start, index + 1);
        const average = subset.reduce((sum, p) => sum + p.y, 0) / subset.length;
        return { x: point.x, y: average };
    });

    if (window.myChart) window.myChart.destroy();

    window.myChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Individual Races',
                    data: rawPoints,
                    borderColor: 'rgba(0, 204, 255, 0.3)',
                    pointBackgroundColor: '#00ccff',
                    showLine: false,
                    pointRadius: 5,
                    pointHoverRadius: 8
                },
                {
                    label: 'Skill Trend (10-race Avg)',
                    data: trendPoints,
                    borderColor: '#ffcc00',
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    pointRadius: 0,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            // --- CLICK TO OPEN RACETIME ---
            onClick: (e, elements) => {
                if (elements.length > 0) {
                    const i = elements[0].index;
                    const datasetIndex = elements[0].datasetIndex;
                    // Only open URL if clicking a blue dot (dataset 0)
                    if (datasetIndex === 0) {
                        const url = rawPoints[i].url;
                        if (url) window.open(url, '_blank');
                    }
                }
            },
            // --- CHANGE CURSOR ON HOVER ---
            onHover: (event, chartElement) => {
                event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
            },
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
                        label: function(context) {
                            const val = context.raw.y;
                            const h = Math.floor(val / 60);
                            const m = Math.floor(val % 60);
                            const s = Math.round((val % 1) * 60);
                            return ` Time: ${h}h ${m}m ${s}s`;
                        },
                        footer: (items) => {
                            if (items[0].datasetIndex === 0) {
                                const date = items[0].raw.x.toLocaleDateString();
                                return `Date: ${date}\n(Click to view race)`;
                            }
                            return "";
                        }
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
    const userData = bingoData[input];

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

function populateSearchList(allData) {
    const list = document.getElementById('playerList');
    // Clear existing options to prevent duplicates if called multiple times
    list.innerHTML = ''; 

    // Get all usernames from the JSON keys
    const usernames = Object.keys(allData);

    usernames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        list.appendChild(option);
    });
    
    console.log(`Search list populated with ${usernames.length} players.`);
}

function handleSearch() {
    const input = document.getElementById('userSearch');
    const name = input.value;
    
    if (bingoData[name]) {
        loadUser(name);
        // Blur the input so the keyboard/dropdown closes on mobile
        input.blur(); 
    }
}
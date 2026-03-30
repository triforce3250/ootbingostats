let bingoData = {};
let primaryUser = null;
let compareUser = null;

// 1. Load the data
fetch('data.json')
    .then(res => res.json())
    .then(data => {
        bingoData = data;
        populateSearchList(data);
        
        // Use the actual key from your data to avoid "undefined"
        const defaultPlayer = 'tob3000';
        if (bingoData[defaultPlayer]) {
            loadUser(defaultPlayer);
        }
    })
    .catch(err => console.error("Could not load data.json", err));

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
function loadUser(username) {
    if (!bingoData[username]) return;

    // Set the primary state
    primaryUser = { 
        name: username, 
        races: bingoData[username].races 
    };
    
    // Update UI elements
    document.getElementById('userSearch').value = username;
    document.getElementById('display-name').innerText = username;
    
    // Refresh the version list for THIS specific player
    updateVersionDropdown(primaryUser.races);
    
    // Trigger the render
    applyFilters();
}

function handleCompare() {
    const val = document.getElementById('compareSearch').value.trim();
    
    if (val === "") {
        compareUser = null; // Reset the state
        applyFilters();     // Re-render immediately without the rival
    } else if (bingoData[val]) {
        compareUser = { name: val, races: bingoData[val].races };
        applyFilters();
        document.activeElement.blur();
    }
}

function updateVersionDropdown(races) {
    const select = document.getElementById('versionFilter');
    // Map versions, default to "Unknown" if the field doesn't exist yet
    const versions = [...new Set(races.map(r => r.bingo_version || "Unknown"))]
        .filter(v => v !== "Unknown")
        .sort((a, b) => b.localeCompare(a, undefined, {numeric: true}));
    
    select.innerHTML = '<option value="all">All Versions</option>';
    
    versions.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.innerText = `v${v}`;
        select.appendChild(opt);
    });
}

function applyFilters() {
    if (!primaryUser) return;
    
    const version = document.getElementById('versionFilter').value;
    const filterFn = (r) => version === 'all' || r.bingo_version === version;
    
    // Primary Data
    const pData = {
        name: primaryUser.name,
        races: primaryUser.races.filter(filterFn)
    };
    
    // Rival Data - Only if compareUser exists and has a name
    let cData = null;
    const rivalInput = document.getElementById('compareSearch').value.trim();

    if (rivalInput && compareUser) {
        cData = {
            name: compareUser.name,
            races: compareUser.races.filter(filterFn)
        };
        document.getElementById('display-name').innerText = `${pData.name} vs ${cData.name}`;
    } else {
        document.getElementById('display-name').innerText = pData.name;
    }
    
    // Update count text
    document.getElementById('race-count').innerText = cData 
        ? `Comparing ${pData.races.length} vs ${cData.races.length} races`
        : `Showing ${pData.races.length} total races`;

    renderChart(pData, cData);
}

function resetChartZoom() {
    if (window.myChart) {
        window.myChart.resetZoom();
        document.getElementById('resetZoomBtn').style.display = 'none';
    }
}

function renderChart(pUser, cUser) {
    const ctx = document.getElementById('statsChart').getContext('2d');
    
    const getPoints = (races) => races.map(r => ({
        x: new Date(r.ended_at),
        y: parseDuration(r.user_finish_time),
        url: r.full_race_url,
        v: r.bingo_version
    })).filter(p => p.y > 0).sort((a, b) => a.x - b.x);

    const pPoints = getPoints(pUser.races);
    const pTrend = pPoints.map((p, i, a) => ({ x: p.x, y: a.slice(Math.max(0, i - 9), i + 1).reduce((s, x) => s + x.y, 0) / Math.min(i + 1, 10) }));

    const datasets = [
        { 
            label: `${pUser.name} (Individual Races)`,
            data: pPoints,
            showLine: false,
            borderColor: '#00ccff',
            pointRadius: 4,
            borderWidth: 3,
            pointHoverRadius: 6,
            order: 1 // Drawn on very top
        },
        {
            label: `${pUser.name} (Trend)`,
            data: pTrend,
            borderColor: '#ffcc00',
            pointRadius: 0,
            borderWidth: 3,
            tension: 0.4,
            order: 2 // Drawn below dots
        }
    ];

    // Only add the rival if cUser (cData) is not null
    if (cUser) {
        const cPoints = getPoints(cUser.races);
        const cTrend = cPoints.map((p, i, a) => ({
            x: p.x,
            y: a.slice(Math.max(0, i - 9), i + 1).reduce((s, x) => s + x.y, 0) / Math.min(i + 1, 10)
        }));

        datasets.push({
            label: `${cUser.name} (Trend)`,
            data: cTrend,
            borderColor: '#ff4444',
            borderDash: [5, 5],
            pointRadius: 0,
            borderWidth: 2,
            tension: 0.4,
            order: 3 // Drawn at the bottom-most layer
        });
    }

    if (window.myChart) window.myChart.destroy();
    window.myChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            onClick: (e, el) => { if (el.length > 0 && el[0].datasetIndex === 0) window.open(pPoints[el[0].index].url, '_blank'); },
            onHover: (e, el) => { e.native.target.style.cursor = (el[0] && el[0].datasetIndex === 0) ? 'pointer' : 'default'; },
            scales: {
                x: {
                    type: 'time',
                    time: { unit: 'month' },
                    bounds: 'data', // This forces the chart to end exactly at the last race
                    grid: { color: '#333' },
                    ticks: { color: '#888' }
                },
                y: { ticks: { callback: v => Math.floor(v / 60) + 'h ' + Math.round(v % 60) + 'm' }, grid: { color: '#333' } }
            },
            plugins: {
                zoom: {
                    zoom: {
                        drag: {
                            enabled: true,
                            backgroundColor: 'rgba(0, 204, 255, 0.2)',
                            borderColor: 'rgba(0, 204, 255, 0.5)',
                            borderWidth: 1
                        },
                        mode: 'x',
                        onZoomComplete: function () {
                            // Show the reset button once a zoom happens
                            document.getElementById('resetZoomBtn').style.display = 'inline-block';
                        }
                    },
                    limits: {
                        x: { min: 'original', max: 'original' }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: c => ` Time: ${Math.floor(c.raw.y / 60)}h ${Math.floor(c.raw.y % 60)}m ${Math.round((c.raw.y % 1) * 60)}s`,
                        footer: i => i[0].datasetIndex === 0 ? `v${i[0].raw.v}\nClick to view` : ""
                    }
                },
                legend: {
                    display: true,
                    labels: { color: '#aaa' } // Matches your dark theme
                },
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
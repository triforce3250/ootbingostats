document.getElementById('searchBtn').addEventListener('click', () => {
    const inputName = document.getElementById('usernameInput').value.toLowerCase().trim();
    loadDashboard(inputName);
});

async function loadDashboard(username) {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.textContent = "Loading...";

    try {
        // Fetch the pre-scraped data from your repo
        const response = await fetch('data.json');
        const allData = await response.json();

        if (!allData[username]) {
            statusDiv.textContent = "User not tracked. Please check back after the nightly update!";
            return;
        }

        const user = allData[username];
        const userId = user.races[0].entrants.find(e => e.user.name.toLowerCase() === username).user.url.split('/').pop();

        // Filter and process the Bingo data
        const bingoData = user.races
            .filter(r => r.status === 'finished' && r.goal.name.toLowerCase().includes('bingo'))
            .map(r => {
                const entrant = r.entrants.find(e => e.user.url.includes(userId));
                return {
                    x: new Date(r.ended_at),
                    y: parseISO8601Duration(entrant.finish_time),
                    goal: r.goal.name
                };
            })
            .sort((a, b) => a.x - b.x);

        // UI update and Chart rendering...
        statusDiv.innerHTML = `<strong>${user.username}</strong> | Total Bingo Races: ${bingoData.length}`;
        renderChart(bingoData, user.username);
        
    } catch (err) {
        statusDiv.textContent = "Data file missing. Please run the GitHub Action first.";
    }
}
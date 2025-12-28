// ===================================================================
// MAIN SCRIPT - INDEX & GAMES PAGES
// ===================================================================

// Get stored games from localStorage
function getStoredGames() {
    const stored = localStorage.getItem('zlg_studio_games');
    return stored ? JSON.parse(stored) : [];
}

// Format numbers
function formatNumber(num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// Create game card HTML
function createGameCard(gameInfo) {
    const { game, gameData, iconUrl } = gameInfo;
    const card = document.createElement('div');
    card.className = 'game-card';
    card.onclick = () => window.open(`https://www.roblox.com/games/${game.placeId}`, '_blank');
    
    card.innerHTML = `
        <img src="${iconUrl}" alt="${gameData.name}" class="game-card-image" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%23ddd%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%22 y=%2250%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2214%22%3ENo Image%3C/text%3E%3C/svg%3E'">
        <div class="game-card-content">
            <h3 class="game-card-title">${gameData.name}</h3>
            <p class="game-card-description">${game.description || gameData.description || 'No description available'}</p>
            <div class="game-card-stats">
                <div class="game-card-stat">Visits: ${formatNumber(gameData.visits || 0)}</div>
                <div class="game-card-stat">Likes: ${formatNumber(gameData.upVotes || 0)}</div>
                <div class="game-card-stat">Favs: ${formatNumber(gameData.favoritedCount || 0)}</div>
            </div>
        </div>
        <div class="game-card-footer">
            <a href="https://www.roblox.com/games/${game.placeId}" target="_blank" class="game-card-link" onclick="event.stopPropagation()">
                Play Now →
            </a>
        </div>
    `;
    
    return card;
}

// Calculate total stats
function calculateTotalStats(gamesData) {
    return gamesData.reduce((totals, gameInfo) => {
        const { gameData } = gameInfo;
        return {
            totalGames: totals.totalGames + 1,
            totalVisits: totals.totalVisits + (gameData.visits || 0),
            totalLikes: totals.totalLikes + (gameData.upVotes || 0),
            totalFavorites: totals.totalFavorites + (gameData.favoritedCount || 0)
        };
    }, { totalGames: 0, totalVisits: 0, totalLikes: 0, totalFavorites: 0 });
}

// Update stats display
function updateStats(stats) {
    document.getElementById('totalGames').textContent = stats.totalGames;
    document.getElementById('totalVisits').textContent = formatNumber(stats.totalVisits);
    document.getElementById('totalLikes').textContent = formatNumber(stats.totalLikes);
    document.getElementById('totalFavorites').textContent = formatNumber(stats.totalFavorites);
}

// Get top 3 games by visits
function getTop3Games(gamesData) {
    return [...gamesData]
        .sort((a, b) => (b.gameData.visits || 0) - (a.gameData.visits || 0))
        .slice(0, 3);
}

// Initialize index page
async function initIndexPage() {
    const storedGames = getStoredGames();
    
    if (storedGames.length === 0) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('content').style.display = 'block';
        document.getElementById('totalGames').textContent = '0';
        document.getElementById('totalVisits').textContent = '0';
        document.getElementById('totalLikes').textContent = '0';
        document.getElementById('totalFavorites').textContent = '0';
        document.getElementById('topGames').innerHTML = '<p style="text-align:center; color:#888; padding:2rem;">No games added yet. Go to Admin panel to add games.</p>';
        return;
    }
    
    try {
        // Load all games data
        const gamesData = await loadGamesSequentially(storedGames, (current, total, results) => {
            // Update loading text
            const loadingDiv = document.getElementById('loading');
            if (loadingDiv) {
                loadingDiv.querySelector('p').textContent = `Loading studio data... (${current}/${total})`;
            }
        });
        
        if (gamesData.length === 0) {
            throw new Error('No games loaded successfully');
        }
        
        // Calculate and update stats
        const stats = calculateTotalStats(gamesData);
        updateStats(stats);
        
        // Display top 3 games
        const top3 = getTop3Games(gamesData);
        const topGamesContainer = document.getElementById('topGames');
        topGamesContainer.innerHTML = '';
        
        top3.forEach(gameInfo => {
            topGamesContainer.appendChild(createGameCard(gameInfo));
        });
        
        // Show content
        document.getElementById('loading').style.display = 'none';
        document.getElementById('content').style.display = 'block';
        
    } catch (error) {
        console.error('Failed to load index page:', error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
    }
}

// Initialize games page
async function initGamesPage() {
    const storedGames = getStoredGames();
    
    if (storedGames.length === 0) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('content').style.display = 'block';
        document.getElementById('allGames').innerHTML = '<p style="text-align:center; color:#888; padding:2rem;">No games added yet. Go to Admin panel to add games.</p>';
        return;
    }
    
    try {
        // Load all games data
        const gamesData = await loadGamesSequentially(storedGames, (current, total, results) => {
            // Update loading text
            const loadingDiv = document.getElementById('loading');
            if (loadingDiv) {
                loadingDiv.querySelector('p').textContent = `Loading games... (${current}/${total})`;
            }
        });
        
        if (gamesData.length === 0) {
            throw new Error('No games loaded successfully');
        }
        
        // Display all games
        const allGamesContainer = document.getElementById('allGames');
        allGamesContainer.innerHTML = '';
        
        gamesData.forEach(gameInfo => {
            allGamesContainer.appendChild(createGameCard(gameInfo));
        });
        
        // Show content
        document.getElementById('loading').style.display = 'none';
        document.getElementById('content').style.display = 'block';
        
    } catch (error) {
        console.error('Failed to load games page:', error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
    }
}

// Auto-initialize based on current page
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    
    if (path.endsWith('index.html') || path.endsWith('/') || path === '') {
        initIndexPage();
    } else if (path.endsWith('games.html')) {
        initGamesPage();
    }
});

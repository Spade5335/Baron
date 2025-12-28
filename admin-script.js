// ===================================================================
// ADMIN SCRIPT - ADMIN PANEL
// ===================================================================

// Get stored games
function getStoredGames() {
    const stored = localStorage.getItem('zlg_studio_games');
    return stored ? JSON.parse(stored) : [];
}

// Save games to localStorage
function saveGames(games) {
    localStorage.setItem('zlg_studio_games', JSON.stringify(games));
}

// Parse Roblox URL to extract IDs
function parseRobloxUrl(url) {
    try {
        // Remove whitespace
        url = url.trim();
        
        // Pattern 1: https://www.roblox.com/games/PLACE_ID/Game-Name
        const pattern1 = /roblox\.com\/games\/(\d+)/;
        const match1 = url.match(pattern1);
        if (match1) {
            return {
                placeId: match1[1],
                success: true
            };
        }
        
        // Pattern 2: Just a number (assume it's placeId)
        if (/^\d+$/.test(url)) {
            return {
                placeId: url,
                success: true
            };
        }
        
        return { success: false, error: 'Could not extract Place ID from URL' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Convert Place ID to Universe ID using Roblox API
async function getUniverseIdFromPlaceId(placeId) {
    try {
        const url = `https://apis.roblox.com/universes/v1/places/${placeId}/universe`;
        const data = await fetchWithRetry(() => fetchWithProxyFallback(url));
        
        if (data && data.universeId) {
            return data.universeId.toString();
        }
        
        throw new Error('No universe ID in response');
    } catch (error) {
        console.error('Failed to get universe ID:', error);
        throw new Error('Failed to get game info from Roblox. Make sure the game ID is correct.');
    }
}

// Show status message
function showStatus(message, isError = false) {
    const statusDiv = document.getElementById('addGameStatus');
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${isError ? 'error' : 'success'}`;
    statusDiv.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 5000);
}

// Add game handler
document.getElementById('addGameForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const gameUrl = document.getElementById('gameUrl').value.trim();
    const description = document.getElementById('gameDescription').value.trim();
    
    if (!gameUrl) {
        showStatus('Please enter a game URL', true);
        return;
    }
    
    // Show loading
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Adding Game...';
    submitBtn.disabled = true;
    
    try {
        // Parse URL to get Place ID
        const parseResult = parseRobloxUrl(gameUrl);
        if (!parseResult.success) {
            throw new Error(parseResult.error);
        }
        
        const placeId = parseResult.placeId;
        
        // Get Universe ID from Place ID
        showStatus('Fetching game info from Roblox...', false);
        const universeId = await getUniverseIdFromPlaceId(placeId);
        
        // Check if game already exists
        const storedGames = getStoredGames();
        const exists = storedGames.find(g => g.universeId === universeId || g.placeId === placeId);
        if (exists) {
            throw new Error('This game is already added');
        }
        
        // Verify game exists by fetching its data
        showStatus('Verifying game data...', false);
        const gameData = await fetchGameData(universeId);
        if (!gameData) {
            throw new Error('Could not fetch game data. The game may not exist or be private.');
        }
        
        // Add game to storage
        const newGame = {
            universeId: universeId,
            placeId: placeId,
            description: description
        };
        
        storedGames.push(newGame);
        saveGames(storedGames);
        
        // Success
        showStatus(`Successfully added: ${gameData.name}`, false);
        
        // Reset form
        document.getElementById('addGameForm').reset();
        
        // Refresh games list
        loadGamesList();
        
    } catch (error) {
        console.error('Error adding game:', error);
        showStatus(error.message, true);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

// Delete game
function deleteGame(universeId) {
    if (!confirm('Are you sure you want to delete this game?')) {
        return;
    }
    
    const storedGames = getStoredGames();
    const filtered = storedGames.filter(g => g.universeId !== universeId);
    saveGames(filtered);
    
    // Clear cache for this game
    cache.remove(`game_${universeId}`);
    cache.remove(`icon_${universeId}`);
    
    loadGamesList();
    showStatus('Game deleted successfully', false);
}

// Load and display games list
async function loadGamesList() {
    const gamesListDiv = document.getElementById('gamesList');
    const storedGames = getStoredGames();
    
    if (storedGames.length === 0) {
        gamesListDiv.innerHTML = '<p style="text-align:center; color:#888; padding:2rem;">No games added yet.</p>';
        return;
    }
    
    gamesListDiv.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading games...</p></div>';
    
    try {
        // Load games data
        const gamesData = await loadGamesSequentially(storedGames);
        
        gamesListDiv.innerHTML = '';
        
        gamesData.forEach(({ game, gameData }) => {
            const gameItem = document.createElement('div');
            gameItem.className = 'game-item';
            
            gameItem.innerHTML = `
                <div class="game-item-info">
                    <div class="game-item-name">${gameData.name}</div>
                    <div class="game-item-id">Universe ID: ${game.universeId} | Place ID: ${game.placeId}</div>
                </div>
                <div class="game-item-actions">
                    <button class="btn-danger" onclick="deleteGame('${game.universeId}')">Delete</button>
                </div>
            `;
            
            gamesListDiv.appendChild(gameItem);
        });
        
    } catch (error) {
        console.error('Error loading games list:', error);
        gamesListDiv.innerHTML = '<p style="text-align:center; color:#c33; padding:2rem;">Failed to load games list.</p>';
    }
}

// Clear cache function
function clearAllCache() {
    if (!confirm('Are you sure you want to clear all cached data?')) {
        return;
    }
    
    cache.clear();
    document.getElementById('cacheStatus').innerHTML = '<p style="margin-top:1rem; color:#27ae60;">Cache cleared successfully!</p>';
    
    setTimeout(() => {
        document.getElementById('cacheStatus').innerHTML = '';
    }, 3000);
}

// Make deleteGame available globally
window.deleteGame = deleteGame;
window.clearAllCache = clearAllCache;

// Initialize admin page
document.addEventListener('DOMContentLoaded', () => {
    loadGamesList();
});

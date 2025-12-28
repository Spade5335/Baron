// ===================================================================
// ZERO LAG GAMES - GAME CONFIGURATION (ULTRA RELIABLE VERSION)
// ===================================================================

const games = [
    { // Yeet Troll Tower
        universeId: '8712947205',
        placeId: '131613915463964',
        description: ''
    },
    { // Dont wake the 67 up
        universeId: '8934653557',
        placeId: '74805461262368',
        description: ''
    },
    { // Dont wake the K-Pop demon up
        universeId: '8548339583',
        placeId: '134319041221248',
        description: ''
    },
    { // Dont wake the zoo
        universeId: '8762440226',
        placeId: '103474254498352',
        description: ''
    },
    // Add more games below - just copy the format above
    // {
    //     universeId: 'YOUR_UNIVERSE_ID',
    //     placeId: 'YOUR_PLACE_ID',
    //     description: 'Your custom description here'
    // },
];

// ===================================================================
// CONFIGURATION
// ===================================================================

const CONFIG = {
    // Multiple CORS proxies with fallback (tries them in order)
    CORS_PROXIES: [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?',
        'https://api.codetabs.com/v1/proxy?quest='
    ],
    
    // Retry settings
    MAX_RETRIES: 3,
    RETRY_DELAY: 1500, // milliseconds between retries
    
    // Cache settings
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes in milliseconds
    ENABLE_CACHE: true,
    
    // Request settings
    REQUEST_TIMEOUT: 10000, // 10 seconds timeout
    SEQUENTIAL_DELAY: 300, // delay between sequential requests (ms)
};

// ===================================================================
// CACHE SYSTEM
// ===================================================================

class GameCache {
    constructor() {
        this.prefix = 'zlg_cache_';
    }

    set(key, data) {
        if (!CONFIG.ENABLE_CACHE) return;
        try {
            const cacheData = {
                data: data,
                timestamp: Date.now()
            };
            localStorage.setItem(this.prefix + key, JSON.stringify(cacheData));
        } catch (e) {
            console.warn('Cache set failed:', e);
        }
    }

    get(key) {
        if (!CONFIG.ENABLE_CACHE) return null;
        try {
            const cached = localStorage.getItem(this.prefix + key);
            if (!cached) return null;

            const cacheData = JSON.parse(cached);
            const age = Date.now() - cacheData.timestamp;

            // Return cached data if still fresh
            if (age < CONFIG.CACHE_DURATION) {
                console.log(`Cache hit for ${key} (age: ${Math.round(age/1000)}s)`);
                return cacheData.data;
            }

            // Remove stale cache
            this.remove(key);
            return null;
        } catch (e) {
            console.warn('Cache get failed:', e);
            return null;
        }
    }

    remove(key) {
        try {
            localStorage.removeItem(this.prefix + key);
        } catch (e) {
            console.warn('Cache remove failed:', e);
        }
    }

    clear() {
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
        } catch (e) {
            console.warn('Cache clear failed:', e);
        }
    }
}

const cache = new GameCache();

// ===================================================================
// ENHANCED FETCH FUNCTIONS
// ===================================================================

// Fetch with timeout
async function fetchWithTimeout(url, timeout = CONFIG.REQUEST_TIMEOUT) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// Try multiple CORS proxies until one works
async function fetchWithProxyFallback(url) {
    let lastError = null;

    for (let i = 0; i < CONFIG.CORS_PROXIES.length; i++) {
        const proxy = CONFIG.CORS_PROXIES[i];
        const proxiedUrl = proxy + encodeURIComponent(url);

        try {
            console.log(`Trying proxy ${i + 1}/${CONFIG.CORS_PROXIES.length}: ${proxy}`);
            const response = await fetchWithTimeout(proxiedUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log(`✓ Proxy ${i + 1} succeeded`);
            return data;
        } catch (error) {
            console.warn(`✗ Proxy ${i + 1} failed:`, error.message);
            lastError = error;
            
            // Small delay before trying next proxy
            if (i < CONFIG.CORS_PROXIES.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    }

    // All proxies failed
    throw new Error(`All proxies failed. Last error: ${lastError?.message}`);
}

// Retry logic with exponential backoff
async function fetchWithRetry(fetchFunction, maxRetries = CONFIG.MAX_RETRIES) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await fetchFunction();
            return result;
        } catch (error) {
            console.warn(`Attempt ${attempt}/${maxRetries} failed:`, error.message);
            
            if (attempt < maxRetries) {
                // Exponential backoff: 1.5s, 3s, 4.5s...
                const delay = CONFIG.RETRY_DELAY * attempt;
                console.log(`Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
}

// ===================================================================
// GAME DATA FUNCTIONS
// ===================================================================

// Fetch game data with cache and retry
async function fetchGameData(universeId) {
    const cacheKey = `game_${universeId}`;
    
    // Try cache first
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
        const url = `https://games.roblox.com/v1/games?universeIds=${universeId}`;
        const data = await fetchWithRetry(() => fetchWithProxyFallback(url));
        
        if (data && data.data && data.data[0]) {
            cache.set(cacheKey, data.data[0]);
            return data.data[0];
        }
        
        throw new Error('No game data in response');
    } catch (error) {
        console.error(`Failed to fetch game data for ${universeId}:`, error);
        return null;
    }
}

// Fetch game icon with cache and retry
async function fetchGameIcon(universeId) {
    const cacheKey = `icon_${universeId}`;
    
    // Try cache first
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
        const url = `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`;
        const data = await fetchWithRetry(() => fetchWithProxyFallback(url));
        
        if (data && data.data && data.data[0] && data.data[0].imageUrl) {
            const iconUrl = data.data[0].imageUrl;
            cache.set(cacheKey, iconUrl);
            return iconUrl;
        }
        
        throw new Error('No icon data in response');
    } catch (error) {
        console.error(`Failed to fetch icon for ${universeId}:`, error);
        return '';
    }
}

// Load games sequentially to avoid overwhelming proxies
async function loadGamesSequentially(gamesList, onProgress) {
    const results = [];
    
    for (let i = 0; i < gamesList.length; i++) {
        const game = gamesList[i];
        console.log(`Loading game ${i + 1}/${gamesList.length}: ${game.universeId}`);
        
        try {
            // Fetch data and icon in parallel for this game
            const [gameData, iconUrl] = await Promise.all([
                fetchGameData(game.universeId),
                fetchGameIcon(game.universeId)
            ]);
            
            if (gameData) {
                results.push({
                    game,
                    gameData,
                    iconUrl: iconUrl || 'favicon.png'
                });
                
                // Call progress callback
                if (onProgress) {
                    onProgress(i + 1, gamesList.length, results);
                }
            }
        } catch (error) {
            console.error(`Failed to load game ${game.universeId}:`, error);
        }
        
        // Delay before next game (except for last one)
        if (i < gamesList.length - 1) {
            await new Promise(resolve => setTimeout(resolve, CONFIG.SEQUENTIAL_DELAY));
        }
    }
    
    return results;
}

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

// Format numbers (e.g., 1000 -> 1K, 1000000 -> 1M)
function formatNumber(num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// Clear all cached game data (useful for testing)
function clearGameCache() {
    cache.clear();
    console.log('Game cache cleared');
}

// Debug function to check cache status
function getCacheStatus() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('zlg_cache_'));
    console.log(`Cache contains ${keys.length} items:`);
    keys.forEach(key => {
        const data = JSON.parse(localStorage.getItem(key));
        const age = Math.round((Date.now() - data.timestamp) / 1000);
        console.log(`- ${key.replace('zlg_cache_', '')}: ${age}s old`);
    });
}

// ===================================================================
// EXPOSE FUNCTIONS
// ===================================================================

// Make debug functions available in console
window.clearGameCache = clearGameCache;
window.getCacheStatus = getCacheStatus;
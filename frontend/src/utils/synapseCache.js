/**
 * Synapse Neural Cache System (Instagram Strategy)
 * Handles persistent storage with instant loading and background refresh
 */

const CACHE_PREFIX = 'synapse_neural_cache_';
const CACHE_VERSION = '2.0'; // Increment to invalidate old caches

// Cache expiry times (Instagram strategy)
const CACHE_TTL = {
    FEED: 5 * 60 * 1000,          // 5 minutes
    STORIES: 60 * 1000,            // 1 minute
    USER_PROFILE: 10 * 60 * 1000,  // 10 minutes
    SUGGESTED: 30 * 60 * 1000      // 30 minutes
};

/**
 * Saves data to cache with timestamp and version
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time to live in milliseconds (optional)
 */
export const saveToCache = (key, data, ttl = CACHE_TTL.FEED) => {
    try {
        if (!data) return;

        const cachePacket = {
            data: data,
            timestamp: Date.now(),
            ttl: ttl,
            version: CACHE_VERSION
        };
        localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cachePacket));
    } catch (error) {
        console.warn("Neural Cache Write Failure:", error);
    }
};

/**
 * Loads data from cache (Instagram strategy: return stale data, check age separately)
 * @param {string} key - Cache key
 * @returns {any|null} - Cached data or null
 */
export const loadFromCache = (key) => {
    try {
        const rawPacket = localStorage.getItem(`${CACHE_PREFIX}${key}`);
        if (!rawPacket) return null;

        const packet = JSON.parse(rawPacket);

        // Version check - invalidate old cache format
        if (!packet || packet.version !== CACHE_VERSION) {
            clearCache(key);
            return null;
        }

        if (!packet.data) return null;

        // Instagram strategy: Return data even if stale (instant feel)
        // Caller should check isCacheStale() and refresh in background
        return packet.data;
    } catch (error) {
        console.warn("Neural Cache Read Failure:", error);
        return null;
    }
};

/**
 * Check if cache is stale (Instagram strategy for background refresh)
 * @param {string} key - Cache key
 * @returns {boolean} - True if cache is stale or missing
 */
export const isCacheStale = (key) => {
    try {
        const rawPacket = localStorage.getItem(`${CACHE_PREFIX}${key}`);
        if (!rawPacket) return true;

        const packet = JSON.parse(rawPacket);
        if (!packet || packet.version !== CACHE_VERSION) return true;

        const age = Date.now() - packet.timestamp;
        return age > (packet.ttl || CACHE_TTL.FEED);
    } catch (error) {
        return true;
    }
};

/**
 * Clears specific cache entry
 * @param {string} key 
 */
export const clearCache = (key) => {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
};

/**
 * Clears all Synapse cache entries
 */
export const clearAllNeuralCache = () => {
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
            localStorage.removeItem(key);
        }
    });
};


/**
 * Prefetch data in background (Instagram strategy)
 * @param {string} url - API endpoint
 * @param {string} cacheKey - Cache key to store result
 * @param {number} ttl - Cache TTL
 */
export const prefetchData = async (url, cacheKey, ttl = CACHE_TTL.FEED) => {
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${document.cookie.split('synapse_token=')[1]?.split(';')[0]}`
            }
        });
        const data = await response.json();
        saveToCache(cacheKey, Array.isArray(data) ? data : data.data, ttl);
        console.log(`[PREFETCH] Cached: ${cacheKey}`);
    } catch (error) {
        console.warn(`[PREFETCH] Failed: ${cacheKey}`, error.message);
    }
};

/**
 * Optimistic update helper (Instagram strategy for instant UI)
 * @param {string} cacheKey - Cache key to update
 * @param {Function} updateFn - Function to transform cached data
 */
export const optimisticUpdate = (cacheKey, updateFn) => {
    try {
        const cached = loadFromCache(cacheKey);
        if (!cached) return;
        
        const updated = updateFn(cached);
        saveToCache(cacheKey, updated);
    } catch (error) {
        console.warn(`[OPTIMISTIC] Update failed: ${cacheKey}`, error.message);
    }
};

export { CACHE_TTL };

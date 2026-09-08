/**
 * Synapse Neural Cache System
 * Handles persistent storage of social feed data to enable instant-loading experiences.
 */

const CACHE_PREFIX = 'synapse_neural_cache_';

/**
 * Saves data to local storage with a timestamp
 * @param {string} key - Unique identifier for the data
 * @param {any} data - The data to store
 */
export const saveToCache = (key, data) => {
    try {
        // If data is empty or invalid, don't overwrite valid cache with garbage
        if (!data) return;

        const cachePacket = {
            data: data,
            timestamp: Date.now(),
            version: '1.0'
        };
        localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cachePacket));
    } catch (error) {
        console.warn("Neural Cache Write Failure:", error);
    }
};

/**
 * loads data from local storage
 * @param {string} key - Unique identifier for the data
 * @returns {any|null} - The cached data or null if not found
 */
export const loadFromCache = (key) => {
    try {
        const rawPacket = localStorage.getItem(`${CACHE_PREFIX}${key}`);
        if (!rawPacket) return null;

        const packet = JSON.parse(rawPacket);

        // Check for basic data integrity
        if (!packet || !packet.data) return null;

        // We return data regardless of age to ensure "instant" feel.
        // The app is expected to re-fetch in background (stale-while-revalidate).
        return packet.data;
    } catch (error) {
        console.warn("Neural Cache Read Failure:", error);
        return null;
    }
};

/**
 * Clears specific cache entry
 * @param {string} key 
 */
export const clearCacheKey = (key) => {
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

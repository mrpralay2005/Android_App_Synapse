/**
 * Cloudflare KV Cache Utility
 * Instagram-style caching for ultra-fast responses
 * FREE: 100k reads/day, 1k writes/day
 */

const CACHE_TTL = {
    FEED: 300,          // 5 minutes - feeds change frequently
    STORIES: 60,        // 1 minute - stories are time-sensitive  
    USER_PROFILE: 600,  // 10 minutes - profiles change less often
    SUGGESTED: 1800,    // 30 minutes - suggestions don't change much
    POSTS: 300          // 5 minutes
};

/**
 * Get from cache with automatic JSON parsing
 * @param {KVNamespace} cache - Cloudflare KV binding
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} Cached data or null
 */
export async function getCache(cache, key) {
    if (!cache) return null;
    
    try {
        const cached = await cache.get(key);
        if (!cached) return null;
        
        return JSON.parse(cached);
    } catch (error) {
        console.warn(`[CACHE] Read error for key "${key}":`, error.message);
        return null;
    }
}

/**
 * Set cache with automatic JSON stringify
 * @param {KVNamespace} cache - Cloudflare KV binding
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds
 */
export async function setCache(cache, key, value, ttl = 300) {
    if (!cache) return;
    
    try {
        await cache.put(key, JSON.stringify(value), {
            expirationTtl: ttl
        });
    } catch (error) {
        console.warn(`[CACHE] Write error for key "${key}":`, error.message);
    }
}

/**
 * Invalidate specific cache key
 * @param {KVNamespace} cache - Cloudflare KV binding
 * @param {string} key - Cache key to delete
 */
export async function invalidateCache(cache, key) {
    if (!cache) return;
    
    try {
        await cache.delete(key);
    } catch (error) {
        console.warn(`[CACHE] Delete error for key "${key}":`, error.message);
    }
}

/**
 * Invalidate multiple cache keys (for user actions like posting)
 * @param {KVNamespace} cache - Cloudflare KV binding
 * @param {string[]} keys - Array of cache keys to delete
 */
export async function invalidateMultiple(cache, keys) {
    if (!cache || !keys || keys.length === 0) return;
    
    try {
        await Promise.all(keys.map(key => cache.delete(key)));
    } catch (error) {
        console.warn(`[CACHE] Multiple delete error:`, error.message);
    }
}

/**
 * Generate cache key for feed
 * @param {number|null} userId - User ID (null for public feed)
 * @param {string} sort - Sort type ('popular' or 'latest')
 * @returns {string} Cache key
 */
export function feedCacheKey(userId, sort = 'popular') {
    return userId ? `feed:user:${userId}:${sort}` : `feed:public:${sort}`;
}

/**
 * Generate cache key for user profile
 * @param {string} username - Username
 * @returns {string} Cache key
 */
export function profileCacheKey(username) {
    return `profile:${username}`;
}

/**
 * Generate cache key for stories
 * @param {number|null} userId - User ID (null for all stories)
 * @returns {string} Cache key
 */
export function storiesCacheKey(userId) {
    return userId ? `stories:user:${userId}` : `stories:all`;
}

/**
 * Generate cache key for suggested users
 * @param {number|null} userId - User ID
 * @returns {string} Cache key
 */
export function suggestedCacheKey(userId) {
    return userId ? `suggested:user:${userId}` : `suggested:public`;
}

export { CACHE_TTL };

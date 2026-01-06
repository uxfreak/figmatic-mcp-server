/**
 * Layer 0 Caching Utilities
 *
 * Caches design system data (variables, styles, effects)
 * TTL: 15 minutes (design system rarely changes)
 */

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes in milliseconds

let designSystemCache = {
  data: null,
  timestamp: 0
};

/**
 * Get cached design system if still valid
 * @returns {Object|null} Cached data or null if expired/empty
 */
function getCachedDesignSystem() {
  const now = Date.now();
  if (designSystemCache.data && (now - designSystemCache.timestamp) < CACHE_TTL) {
    return designSystemCache.data;
  }
  return null;
}

/**
 * Set design system cache
 * @param {Object} data - Design system data to cache
 */
function setCachedDesignSystem(data) {
  designSystemCache.data = data;
  designSystemCache.timestamp = Date.now();
}

/**
 * Clear the cache manually
 */
function clearCache() {
  designSystemCache = { data: null, timestamp: 0 };
}

/**
 * Get cache stats
 * @returns {Object} Cache statistics
 */
function getCacheStats() {
  const now = Date.now();
  const age = designSystemCache.timestamp ? now - designSystemCache.timestamp : 0;
  const remaining = designSystemCache.timestamp ? Math.max(0, CACHE_TTL - age) : 0;

  return {
    cached: designSystemCache.data !== null,
    age: Math.floor(age / 1000), // seconds
    remaining: Math.floor(remaining / 1000), // seconds
    ttl: CACHE_TTL / 1000 // seconds
  };
}

module.exports = {
  getCachedDesignSystem,
  setCachedDesignSystem,
  clearCache,
  getCacheStats,
  CACHE_TTL
};

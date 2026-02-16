/**
 * Profile caching layer to reduce database queries
 * Implements in-memory + localStorage caching with TTL
 */

const CACHE_KEY = 'otters_profile_cache'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

class ProfileCache {
  constructor() {
    this.memoryCache = null
    this.pendingRequest = null // For request deduplication
  }

  /**
   * Get cached profile if valid
   */
  get(userId) {
    // Check memory cache first (fastest)
    if (this.memoryCache?.userId === userId && this.isValid(this.memoryCache)) {
      return this.memoryCache.data
    }

    // Check localStorage (slower but persists across page loads)
    try {
      const stored = localStorage.getItem(`${CACHE_KEY}_${userId}`)
      if (stored) {
        const cached = JSON.parse(stored)
        if (this.isValid(cached)) {
          this.memoryCache = cached
          return cached.data
        } else {
          // Expired - clean up
          localStorage.removeItem(`${CACHE_KEY}_${userId}`)
        }
      }
    } catch (err) {
      console.warn('Profile cache read error:', err)
    }

    return null
  }

  /**
   * Set profile in cache
   */
  set(userId, profile) {
    if (!profile) return

    const cached = {
      userId,
      data: profile,
      timestamp: Date.now(),
    }

    // Store in memory
    this.memoryCache = cached

    // Store in localStorage
    try {
      localStorage.setItem(`${CACHE_KEY}_${userId}`, JSON.stringify(cached))
    } catch (err) {
      console.warn('Profile cache write error:', err)
    }
  }

  /**
   * Invalidate cache for user
   */
  invalidate(userId) {
    if (this.memoryCache?.userId === userId) {
      this.memoryCache = null
    }
    try {
      localStorage.removeItem(`${CACHE_KEY}_${userId}`)
    } catch (err) {
      console.warn('Profile cache invalidate error:', err)
    }
  }

  /**
   * Check if cached data is still valid
   */
  isValid(cached) {
    if (!cached?.timestamp) return false
    return Date.now() - cached.timestamp < CACHE_TTL
  }

  /**
   * Get or fetch profile with request deduplication
   * Prevents multiple simultaneous requests for the same profile
   */
  async getOrFetch(userId, fetchFn) {
    // Return cached if available
    const cached = this.get(userId)
    if (cached) {
      return cached
    }

    // If already fetching, wait for existing request
    if (this.pendingRequest?.userId === userId) {
      return this.pendingRequest.promise
    }

    // Create new fetch request
    const promise = fetchFn(userId).then(profile => {
      if (profile) {
        this.set(userId, profile)
      }
      this.pendingRequest = null
      return profile
    }).catch(err => {
      this.pendingRequest = null
      throw err
    })

    this.pendingRequest = { userId, promise }
    return promise
  }

  /**
   * Clear all caches
   */
  clearAll() {
    this.memoryCache = null
    this.pendingRequest = null
    try {
      // Clear all profile caches from localStorage
      Object.keys(localStorage)
        .filter(key => key.startsWith(CACHE_KEY))
        .forEach(key => localStorage.removeItem(key))
    } catch (err) {
      console.warn('Profile cache clear error:', err)
    }
  }
}

// Singleton instance
export const profileCache = new ProfileCache()

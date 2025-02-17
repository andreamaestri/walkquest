// Caching service for location data
import { openDB } from 'idb'

const DB_NAME = 'walkquest-location'
const DB_VERSION = 1

export class LocationCache {
  constructor() {
    this.db = null
    this.initDB()
  }

  async initDB() {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Store for search results
        db.createObjectStore('locations', { keyPath: 'id' })
        // Store for nearby walks
        db.createObjectStore('nearbyWalks', { keyPath: 'coordinates' })
        // Store for user's recent locations
        db.createObjectStore('recentLocations', { keyPath: 'timestamp' })
      }
    })
  }

  async cacheSearchResults(query, results) {
    await this.db.put('locations', {
      id: query,
      results,
      timestamp: Date.now()
    })
  }

  async getCachedSearchResults(query) {
    const cached = await this.db.get('locations', query)
    if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
      return cached.results
    }
    return null
  }

  async cacheNearbyWalks(coordinates, walks) {
    await this.db.put('nearbyWalks', {
      coordinates: `${coordinates.latitude},${coordinates.longitude}`,
      walks,
      timestamp: Date.now()
    })
  }

  async getCachedNearbyWalks(coordinates) {
    const key = `${coordinates.latitude},${coordinates.longitude}`
    const cached = await this.db.get('nearbyWalks', key)
    if (cached && Date.now() - cached.timestamp < 60 * 60 * 1000) { // 1 hour cache
      return cached.walks
    }
    return null
  }

  async addRecentLocation(location) {
    await this.db.put('recentLocations', {
      ...location,
      timestamp: Date.now()
    })
  }

  async getRecentLocations(limit = 5) {
    return this.db.getAllFromIndex('recentLocations', 'timestamp', {
      count: limit,
      direction: 'prev'
    })
  }

  async clearOldCache() {
    const DAY = 24 * 60 * 60 * 1000
    const now = Date.now()

    // Clear old search results
    const oldLocations = await this.db.getAllKeys('locations')
    for (const key of oldLocations) {
      const entry = await this.db.get('locations', key)
      if (now - entry.timestamp > DAY) {
        await this.db.delete('locations', key)
      }
    }

    // Clear old nearby walks
    const oldWalks = await this.db.getAllKeys('nearbyWalks')
    for (const key of oldWalks) {
      const entry = await this.db.get('nearbyWalks', key)
      if (now - entry.timestamp > DAY) {
        await this.db.delete('nearbyWalks', key)
      }
    }

    // Keep only last 10 recent locations
    const recentLocations = await this.getRecentLocations(10)
    const toDelete = recentLocations.slice(10)
    for (const location of toDelete) {
      await this.db.delete('recentLocations', location.timestamp)
    }
  }
}
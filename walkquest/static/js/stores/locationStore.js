import { defineStore } from 'pinia'
import { LocationCache } from '../services/LocationCache'

const locationCache = new LocationCache()

export const useLocationStore = defineStore('location', {
  state: () => ({
    userLocation: null,
    searchRadius: 10000, // 10km default
    nearbyWalks: [],
    isLoadingLocation: false,
    locationError: null,
    searchQuery: '',
    searchResults: [],
    recentLocations: []
  }),

  actions: {
    async getUserLocation() {
      this.isLoadingLocation = true
      this.locationError = null
      
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          })
        })
        
        this.userLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        }

        // Cache the location
        await locationCache.addRecentLocation(this.userLocation)
        
        await this.findNearbyWalks()
      } catch (error) {
        this.locationError = error.message
        console.error('Geolocation error:', error)
      } finally {
        this.isLoadingLocation = false
      }
    },

    async findNearbyWalks() {
      if (!this.userLocation) return
      
      try {
        // Check cache first
        const cachedWalks = await locationCache.getCachedNearbyWalks(this.userLocation)
        if (cachedWalks) {
          this.nearbyWalks = cachedWalks
          return
        }

        // TODO: Implement API call to backend
        // const response = await fetch(`/api/walks/nearby?lat=${this.userLocation.latitude}&lng=${this.userLocation.longitude}&radius=${this.searchRadius}`)
        // this.nearbyWalks = await response.json()
        
        // Cache the results
        await locationCache.cacheNearbyWalks(this.userLocation, this.nearbyWalks)
      } catch (error) {
        console.error('Error finding nearby walks:', error)
      }
    },

    async searchLocations(query) {
      this.searchQuery = query
      if (!query) {
        this.searchResults = []
        return
      }

      try {
        // Check cache first
        const cachedResults = await locationCache.getCachedSearchResults(query)
        if (cachedResults) {
          this.searchResults = cachedResults
          return
        }

        // TODO: Implement geocoding API call
        // const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
        // this.searchResults = await response.json()
        
        // Cache the results
        await locationCache.cacheSearchResults(query, this.searchResults)
      } catch (error) {
        console.error('Location search error:', error)
      }
    },

    async loadRecentLocations() {
      this.recentLocations = await locationCache.getRecentLocations()
    },

    setSearchRadius(radius) {
      this.searchRadius = radius
      if (this.userLocation) {
        this.findNearbyWalks()
      }
    },

    async clearLocationCache() {
      await locationCache.clearOldCache()
    }
  },

  getters: {
    hasLocation: (state) => !!state.userLocation,
    formattedSearchRadius: (state) => `${state.searchRadius / 1000}km`
  }
})
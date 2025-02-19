import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useUiStore } from './ui'
import { WalksAPI } from '../services/api'  // Updated import path
import { filterWalks } from '../services/api'

export const useWalksStore = defineStore('walks', {
  state: () => ({
    walks: [],
    selectedWalkId: null,
    pendingFavorites: new Set(),
    error: null,
    loading: false
  }),

  actions: {
    async loadWalks() {
      try {
        this.loading = true
        this.error = null
        console.log('Fetching walks...')
        const response = await filterWalks()
        
        console.log('API Response:', response)
        
        if (response && Array.isArray(response.walks)) {
          this.walks = response.walks.map(walk => ({
            ...walk,
            title: walk.title || walk.walk_name || 'Unnamed Walk',
            location: walk.location || 'Unknown Location'
          }))
          console.log('Walks loaded:', this.walks)
        } else {
          console.error('Invalid response format:', response)
          throw new Error('Invalid response format')
        }
      } catch (err) {
        console.error('Error loading walks:', err)
        this.error = err.message
        this.walks = []
      } finally {
        this.loading = false
      }
    },

    setSelectedWalk(walkId) {
      this.selectedWalkId = walkId
    },

    getWalkById(id) {
      return this.walks.find(walk => walk.id === id)
    },

    isPendingFavorite(walkId) {
      return this.pendingFavorites.has(walkId)
    },

    async toggleFavorite(walkId) {
      try {
        this.pendingFavorites.add(walkId)
        const walk = this.walks.find(w => w.id === walkId)
        if (!walk) return

        // Toggle the favorite status
        walk.is_favorite = !walk.is_favorite

        // Here you would typically make an API call to persist the change
        // await api.updateWalkFavorite(walkId, walk.is_favorite)

      } catch (error) {
        console.error('Failed to toggle favorite:', error)
        // Revert the change on error
        const walk = this.walks.find(w => w.id === walkId)
        if (walk) walk.is_favorite = !walk.is_favorite
      } finally {
        this.pendingFavorites.delete(walkId)
      }
    },

    async loadWalksInArea(bounds, options = {}) {
      const {
        limit = 50,
        offset = 0,
        forceRefresh = false
      } = options

      // Check cache first unless force refresh is requested
      if (!forceRefresh) {
        const cachedWalks = await locationCache.getCachedWalksInArea(bounds)
        if (cachedWalks) {
          // Merge with existing walks to avoid duplicates
          this.walks = [...new Map([...this.walks, ...cachedWalks].map(walk => [walk.id, walk])).values()]
          return cachedWalks
        }
      }

      try {
        // TODO: Implement API call
        // const response = await fetch(`/api/walks/in-area?` + new URLSearchParams({
        //   north: bounds.north,
        //   south: bounds.south,
        //   east: bounds.east,
        //   west: bounds.west,
        //   limit,
        //   offset
        // }))
        // const newWalks = await response.json()
        
        // For now, simulate pagination of existing walks
        const newWalks = this.walks.slice(offset, offset + limit)
        
        // Cache the results
        await locationCache.cacheWalksInArea(bounds, newWalks)
        
        // Merge with existing walks
        this.walks = [...new Map([...this.walks, ...newWalks].map(walk => [walk.id, walk])).values()]
        
        return newWalks
      } catch (error) {
        console.error('Error loading walks in area:', error)
        throw error
      }
    }
  }
})
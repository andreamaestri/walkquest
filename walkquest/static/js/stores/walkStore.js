import { defineStore } from 'pinia'

export const useWalkStore = defineStore('walk', {
  state: () => ({
    walks: [],
    isLoading: false,
    error: null,
    isEmpty: false,
    searchRadius: 5000 // Default 5km radius
  }),

  getters: {
    hasWalks: (state) => state.walks.length > 0,
    getWalkById: (state) => (id) => state.walks.find(walk => walk.id === id),
    hasError: (state) => !!state.error,
    isEmptyState: (state) => !state.isLoading && state.walks.length === 0,
    walksCount: (state) => state.walks.length,
    walksCountText: (state) => {
      if (state.isLoading) return 'Searching...'
      if (!state.walks.length) return 'No walks found nearby'
      return `${state.walks.length} ${state.walks.length === 1 ? 'walk' : 'walks'} found nearby`
    }
  },

  actions: {
    setWalks(walks) {
      if (!Array.isArray(walks)) {
        console.error('Invalid walks data:', walks)
        this.walks = []
        this.isEmpty = true
        return
      }
      // Ensure walks have distance property when in nearby mode
      this.walks = walks.map(walk => ({
        ...walk,
        distance: walk.distance || null
      }))
      this.isEmpty = walks.length === 0
      this.error = null
    },

    clearWalks() {
      this.walks = []
      this.error = null
      this.isEmpty = true
      this.isLoading = false
    },

    setLoading(status) {
      this.isLoading = status
      if (status) {
        this.error = null
      }
    },

    setError(error) {
      this.error = error
      if (error) {
        this.isLoading = false
      }
    },

    setSearchRadius(radius) {
      this.searchRadius = radius
    }
  }
})
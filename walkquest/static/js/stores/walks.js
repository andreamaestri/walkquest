import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import ApiService from '../services/api'
import { useUiStore } from './ui'

export const useWalksStore = defineStore('walks', {
  state: () => ({
    walks: [],
    selectedWalk: null,
    loading: false,
    pendingFavorites: new Set(),
    error: null
  }),

  actions: {
    async setWalks(walks) {
      console.log('Setting walks:', walks?.length)
      
      try {
        // Process walks to ensure consistent structure
        const processedWalks = (Array.isArray(walks) ? walks : [])
          .filter(Boolean)
          .map(walk => ({
            ...walk,
            isExpanded: false,
            pubs_list: Array.isArray(walk.pubs_list) ? walk.pubs_list : [],
            loading: false
          }))

        // Set the walks
        this.walks = processedWalks

        // Restore expanded states
        const expandedWalkIds = JSON.parse(localStorage.getItem('expandedWalks') || '[]')
        this.walks.forEach(walk => {
          walk.isExpanded = expandedWalkIds.includes(walk.id)
        })

        console.log('Processed and set walks:', this.walks?.length)
        
        // Clear any previous errors
        this.error = null
      } catch (error) {
        console.error('Error processing walks:', error)
        this.error = error.message
        this.walks = [] // Ensure walks is an empty array on error
      }
    },

    async loadWalks() {
      const uiStore = useUiStore()
      if (this.loading) return

      this.loading = true
      uiStore.setLoadingState('walks', true)
      this.error = null

      try {
        const response = await ApiService.filterWalks({
          search: uiStore.searchQuery,
          include_transition: true,
          include_expanded: true
        })

        console.log('Raw API Response:', response)

        if (!response || !Array.isArray(response.walks)) {
          throw new Error('Invalid response format from API')
        }

        // Use setWalks to process and set the walks
        await this.setWalks(response.walks)

      } catch (error) {
        console.error('Failed to fetch walks:', error)
        this.error = error.message
        uiStore.setError(`Failed to load walks: ${error.message || 'Please try again.'}`)
        this.walks = [] // Ensure walks is an empty array on error
      } finally {
        this.loading = false
        uiStore.setLoadingState('walks', false)
      }
    },

    setSelectedWalk(walk) {
      console.log('Setting selected walk:', walk?.id)
      this.selectedWalk = walk
      if (walk) {
        // Dispatch custom event for compatibility with existing code
        window.dispatchEvent(new CustomEvent('walk:selected', { 
          detail: walk 
        }))
      }
    },

    expandWalk(id) {
      console.log('Expanding walk:', id)
      const walk = this.walks.find(w => w.id === id)
      if (walk) {
        walk.isExpanded = !walk.isExpanded

        // Save expanded states
        const expandedWalks = this.walks
          .filter(w => w.isExpanded)
          .map(w => w.id)
        localStorage.setItem('expandedWalks', JSON.stringify(expandedWalks))

        // Notify about expansion change
        window.dispatchEvent(new CustomEvent('walk:expansion-changed', {
          detail: { walkId: id }
        }))
      }
    },

    async toggleFavorite(walkId) {
      if (this.pendingFavorites.has(walkId)) return

      this.pendingFavorites.add(walkId)
      try {
        await ApiService.toggleFavorite(walkId)
        const walk = this.walks.find(w => w.id === walkId)
        if (walk) {
          walk.is_favorite = !walk.is_favorite
        }
      } catch (error) {
        console.error('Failed to toggle favorite:', error)
        const uiStore = useUiStore()
        uiStore.setError(`Failed to update favorite: ${error.message}`)
      } finally {
        this.pendingFavorites.delete(walkId)
      }
    },

    clearWalks() {
      this.walks = []
      this.selectedWalk = null
      this.error = null
    }
  },

  getters: {
    getWalkById: (state) => (id) => state.walks.find(w => w.id === id),
    isPendingFavorite: (state) => (walkId) => state.pendingFavorites.has(walkId),
    getSelectedWalkId: (state) => state.selectedWalk?.id,
    hasWalks: (state) => state.walks.length > 0,
    hasError: (state) => !!state.error,
    isLoading: (state) => state.loading
  }
})
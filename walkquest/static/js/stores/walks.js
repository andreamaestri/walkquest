import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import ApiService from '../services/api'
import { useUiStore } from './ui'

export const useWalksStore = defineStore('walks', {
  state: () => ({
    walks: [],
    selectedWalk: null
  }),
  actions: {
    async loadWalks() {
      const uiStore = useUiStore()
      if (this.loading) return

      this.loading = true
      uiStore.setLoadingState('walks', true)

      try {
        const response = await ApiService.filterWalks({
          search: uiStore.searchQuery,
          include_transition: true,
          include_expanded: true
        })

        console.log('Raw API Response:', response)

        // Ensure we have a walks array
        const walksList = response?.walks || []

        // Ensure walksList is an array
        const processedWalks = (Array.isArray(walksList) ? walksList : [walksList]).map(walk => ({
          ...walk,
          isExpanded: false,
          pubs_list: Array.isArray(walk.pubs_list) ? walk.pubs_list : [],
          loading: false
        }))

        console.log('Processed Walks:', processedWalks)

        // Directly mutate the walks ref
        this.walks = processedWalks

        console.log('Walks Store Walks:', this.walks)

        // Restore expanded states
        const expandedWalkIds = JSON.parse(localStorage.getItem('expandedWalks') || '[]')
        this.walks.forEach(walk => {
          walk.isExpanded = expandedWalkIds.includes(walk.id)
        })

      } catch (error) {
        console.error('Failed to fetch walks:', error)
        uiStore.setError(`Failed to load walks: ${error.message || 'Please try again.'}`)
        this.walks = [] // Ensure walks is an empty array on error
      } finally {
        this.loading = false
        uiStore.setLoadingState('walks', false)
      }
    },
    setSelectedWalk(walk) {
      this.selectedWalk = walk
      if (walk) {
        // Dispatch custom event for compatibility with existing code
        window.dispatchEvent(new CustomEvent('walk:selected', { 
          detail: walk 
        }))
      }
    },
    expandWalk(id) {
      const walk = this.walks.find(w => w.id === id)
      if (walk) {
        walk.isExpanded = !walk.isExpanded
      }
      window.dispatchEvent(new CustomEvent('walk:expansion-changed', {
        detail: { walkId: this.expandedWalkId }
      }))

      // Save expanded states
      const expandedWalks = this.walks
        .filter(w => w.isExpanded)
        .map(w => w.id)
      localStorage.setItem('expandedWalks', JSON.stringify(expandedWalks))
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
        uiStore.setError(`Failed to update favorite: ${error.message}`)
      } finally {
        this.pendingFavorites.delete(walkId)
      }
    }
  },
  getters: {
    getWalkById: (state) => (id) => state.walks.find(w => w.id === id),
    isPendingFavorite: (state) => (walkId) => state.pendingFavorites.has(walkId),
    getSelectedWalkId: (state) => state.selectedWalk?.id
  }
})
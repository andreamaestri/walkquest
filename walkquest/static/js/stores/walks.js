import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import ApiService from '../services/api'
import { useUiStore } from './ui'

export const useWalksStore = defineStore('walks', () => {
  // State
  const selectedWalk = ref(null)
  const walks = ref([])
  const pendingFavorites = ref(new Set())
  const expandedWalkId = ref(null)
  const loading = ref(false)

  // Actions
  const setSelectedWalk = (walk) => {
    selectedWalk.value = walk
    if (walk) {
      // Dispatch custom event for compatibility with existing code
      window.dispatchEvent(new CustomEvent('walk:selected', { 
        detail: walk 
      }))
    }
  }

  const expandWalk = (walkId) => {
    const walk = walks.value.find(w => w.id === walkId)
    if (walk) {
      walk.isExpanded = !walk.isExpanded
    }
    window.dispatchEvent(new CustomEvent('walk:expansion-changed', {
      detail: { walkId: expandedWalkId.value }
    }))

    // Save expanded states
    const expandedWalks = walks.value
      .filter(w => w.isExpanded)
      .map(w => w.id)
    localStorage.setItem('expandedWalks', JSON.stringify(expandedWalks))
  }

  const loadWalks = async () => {
    const uiStore = useUiStore()
    if (loading.value) return

    loading.value = true
    uiStore.setLoadingState('walks', true)

    try {
      const response = await ApiService.filterWalks({
        search: uiStore.searchQuery,
        include_transition: true,
        include_expanded: true
      })

      if (!response?.walks) {
        throw new Error('Invalid response format')
      }

      walks.value = response.walks.map(walk => ({
        ...walk,
        isExpanded: false,
        pubs_list: Array.isArray(walk.pubs_list) ? walk.pubs_list : [],
        loading: false
      }))

      // Restore expanded states
      const expandedWalkIds = JSON.parse(localStorage.getItem('expandedWalks') || '[]')
      walks.value.forEach(walk => {
        walk.isExpanded = expandedWalkIds.includes(walk.id)
      })

    } catch (error) {
      console.error('Failed to fetch walks:', error)
      uiStore.setError(`Failed to load walks: ${error.message || 'Please try again.'}`)
    } finally {
      loading.value = false
      uiStore.setLoadingState('walks', false)
    }
  }

  const toggleFavorite = async (walkId) => {
    if (pendingFavorites.value.has(walkId)) return

    pendingFavorites.value.add(walkId)
    try {
      await ApiService.toggleFavorite(walkId)
      const walk = walks.value.find(w => w.id === walkId)
      if (walk) {
        walk.is_favorite = !walk.is_favorite
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
      uiStore.setError(`Failed to update favorite: ${error.message}`)
    } finally {
      pendingFavorites.value.delete(walkId)
    }
  }

  // Getters
  const getWalkById = (id) => walks.value.find(w => w.id === id)
  const isPendingFavorite = (walkId) => pendingFavorites.value.has(walkId)
  const getSelectedWalkId = () => selectedWalk.value?.id

  return {
    // State
    selectedWalk,
    walks,
    pendingFavorites,
    expandedWalkId,
    loading,

    // Actions
    setSelectedWalk,
    expandWalk,
    loadWalks,
    toggleFavorite,

    // Getters
    getWalkById,
    isPendingFavorite,
    getSelectedWalkId
  }
})
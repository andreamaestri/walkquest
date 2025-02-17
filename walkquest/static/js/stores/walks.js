import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useUiStore } from './ui'
import { WalksAPI } from '../services/api'

export const useWalksStore = defineStore('walks', () => {
  const uiStore = useUiStore()
  
  // State
  const walks = ref([])
  const selectedWalk = ref(null)
  const loading = ref(false)
  const pendingFavorites = ref(new Set()) // Track pending favorite operations
  
  // Actions
  const loadWalks = async () => {
    if (loading.value) return walks.value
    
    try {
      loading.value = true
      uiStore.setLoadingState('walks', true)
      
      const { walks: loadedWalks } = await WalksAPI.filterWalks()
      // Ensure each walk has a stable ID for virtual scroll
      walks.value = loadedWalks?.map(walk => ({
        ...walk,
        id: walk.id.toString() // Ensure ID is a string for consistency
      })) || []
      
      return walks.value
    } catch (error) {
      console.error('Failed to load walks:', error)
      uiStore.setError('Failed to load walks. Please try again.')
      return []
    } finally {
      loading.value = false
      uiStore.setLoadingState('walks', false)
    }
  }
  
  const setWalks = (newWalks) => {
    walks.value = newWalks
  }
  
  const setSelectedWalk = (walk) => {
    selectedWalk.value = walk
  }
  
  const setLoading = (state) => {
    loading.value = state
    uiStore.setLoadingState('walks', state)
  }

  const isPendingFavorite = (walkId) => {
    return pendingFavorites.value.has(walkId)
  }

  const toggleFavorite = async (walkId) => {
    try {
      pendingFavorites.value.add(walkId)
      const walk = walks.value.find(w => w.id === walkId)
      if (!walk) return

      // Toggle the favorite status
      walk.is_favorite = !walk.is_favorite

      // Here you would typically make an API call to persist the change
      // await api.updateWalkFavorite(walkId, walk.is_favorite)

    } catch (error) {
      console.error('Failed to toggle favorite:', error)
      // Revert the change on error
      const walk = walks.value.find(w => w.id === walkId)
      if (walk) walk.is_favorite = !walk.is_favorite
    } finally {
      pendingFavorites.value.delete(walkId)
    }
  }

  const loadWalksInArea = async (bounds, options = {}) => {
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
        walks.value = [...new Map([...walks.value, ...cachedWalks].map(walk => [walk.id, walk])).values()]
        return cachedWalks
      }
    }

    try {
      loading.value = true
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
      const newWalks = walks.value.slice(offset, offset + limit)
      
      // Cache the results
      await locationCache.cacheWalksInArea(bounds, newWalks)
      
      // Merge with existing walks
      walks.value = [...new Map([...walks.value, ...newWalks].map(walk => [walk.id, walk])).values()]
      
      return newWalks
    } catch (error) {
      console.error('Error loading walks in area:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // Computed
  const getWalkById = computed(() => {
    return (id) => walks.value.find(w => w.id === id)
  })
  
  return {
    // State
    walks,
    selectedWalk,
    loading,
    pendingFavorites,
    
    // Actions
    loadWalks,
    setWalks,
    setSelectedWalk,
    setLoading,
    isPendingFavorite,
    toggleFavorite,
    loadWalksInArea,
    
    // Computed
    getWalkById
  }
})
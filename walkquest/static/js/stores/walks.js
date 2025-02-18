import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useUiStore } from './ui'
import { WalksAPI } from '../services/api'  // Updated import path
import { filterWalks } from '../services/api'

export const useWalksStore = defineStore('walks', () => {
  const uiStore = useUiStore()
  
  // State
  const walks = ref([])
  const selectedWalk = ref(null)
  const pendingFavorites = ref(new Set())
  const error = ref(null)
  const loading = ref(false)

  // Actions
  const loadWalks = async () => {
    try {
      loading.value = true
      error.value = null
      console.log('Fetching walks...')
      const response = await filterWalks()
      
      console.log('API Response:', response)
      
      if (response && Array.isArray(response.walks)) {
        walks.value = response.walks.map(walk => ({
          ...walk,
          title: walk.title || walk.walk_name || 'Unnamed Walk',
          location: walk.location || 'Unknown Location'
        }))
        console.log('Walks loaded:', walks.value)
      } else {
        console.error('Invalid response format:', response)
        throw new Error('Invalid response format')
      }
    } catch (err) {
      console.error('Error loading walks:', err)
      error.value = err.message
      walks.value = []
    } finally {
      loading.value = false
    }
  }

  function setSelectedWalk(walk) {
    selectedWalk.value = walk
  }

  const getWalkById = (id) => {
    return walks.value.find(walk => walk.id === id)
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
    }
  }

  return {
    // State
    walks,
    selectedWalk,
    pendingFavorites,
    error,
    loading,
    
    // Actions
    loadWalks,
    setSelectedWalk,
    getWalkById,
    isPendingFavorite,
    toggleFavorite,
    loadWalksInArea
  }
})
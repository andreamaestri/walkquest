import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useLocationStore } from './locationStore'
import { useWalksStore } from './walks'
import { useDebounceFn } from '@vueuse/core'

export const useSearchStore = defineStore('search', () => {
  const locationStore = useLocationStore()
  const walksStore = useWalksStore()

  // State
  const searchQuery = ref('')
  const searchMode = ref('walks') // 'walks' or 'locations'
  const error = ref(null)
  const isLoading = ref(false)
  const searchHistory = ref([])
  const MAX_HISTORY_ITEMS = 5

  // Computed
  const filteredWalks = computed(() => {
    const query = searchQuery.value?.trim().toLowerCase()
    const walks = searchMode.value === 'locations' 
      ? locationStore.nearbyWalks
      : walksStore.walks

    if (!query) return walks
    
    return walks.filter(walk => {
      const searchableFields = [
        walk.walk_name,
        walk.title,
        walk.location,
        walk.description,
        ...(walk.related_categories || []).map(cat => cat.name)
      ]
      
      const searchableText = searchableFields
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      
      return searchableText.includes(query)
    })
  })

  // Actions
  const debouncedSearch = useDebounceFn((query) => {
    setSearchQuery(query)
  }, 300)

  function setSearchMode(mode) {
    if (!['walks', 'locations'].includes(mode)) {
      console.error(`Invalid search mode: ${mode}`)
      return
    }
    
    if (mode !== searchMode.value) {
      searchMode.value = mode
      clearSearch() // Reset search when changing modes
    }
  }

  function setSearchQuery(query) {
    if (typeof query !== 'string') return
    
    searchQuery.value = query
    error.value = null
    
    // Add to search history if not empty and unique
    if (query.trim() && !searchHistory.value.includes(query)) {
      searchHistory.value.unshift(query)
      if (searchHistory.value.length > MAX_HISTORY_ITEMS) {
        searchHistory.value.pop()
      }
    }
  }

  function setError(errorMessage) {
    error.value = errorMessage
  }

  function clearSearch() {
    searchQuery.value = ''
    error.value = null
  }

  function clearLocationSuggestions() {
    // Clear any location-specific state
    error.value = null
    isLoading.value = false
  }

  function clearSearchHistory() {
    searchHistory.value = []
  }

  async function handleLocationSelected(location) {
    if (!location?.center) {
      setError('Invalid location data')
      return
    }

    try {
      isLoading.value = true
      const coords = {
        latitude: location.center[1],
        longitude: location.center[0]
      }
      await locationStore.setUserLocation(coords)
      await locationStore.findNearbyWalks(coords)
      
      // Add location to search history
      const locationName = location.place_name || `${location.center[1]}, ${location.center[0]}`
      if (!searchHistory.value.includes(locationName)) {
        searchHistory.value.unshift(locationName)
        if (searchHistory.value.length > MAX_HISTORY_ITEMS) {
          searchHistory.value.pop()
        }
      }

      // Switch to locations mode if not already in it
      if (searchMode.value !== 'locations') {
        setSearchMode('locations')
      }
    } catch (err) {
      setError('Failed to update location')
      console.error('Location selection error:', err)
    } finally {
      isLoading.value = false
    }
  }

  return {
    // State
    searchQuery,
    searchMode,
    error,
    isLoading,
    searchHistory,
    
    // Computed
    filteredWalks,
    
    // Actions
    setSearchMode,
    setSearchQuery,
    debouncedSearch,
    setError,
    clearSearch,
    clearLocationSuggestions,
    clearSearchHistory,
    handleLocationSelected
  }
})
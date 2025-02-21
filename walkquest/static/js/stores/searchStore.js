import { defineStore } from 'pinia'
import { ref, computed, shallowRef } from 'vue'
import { useWalksStore } from './walks'
import { useLocationStore } from './locationStore'
import { useUiStore } from './ui'

export const useSearchStore = defineStore('search', () => {
  const locationStore = useLocationStore()
  const walksStore = useWalksStore()
  const uiStore = useUiStore()

  // Use shallowRef for large lists
  const searchQuery = ref('')
  const searchMode = ref('walks')
  const error = ref(null)
  const isLoading = ref(false)
  const MAX_HISTORY_ITEMS = 5
  const searchHistory = ref([])
  const locationSuggestions = shallowRef([])
  const activeFilters = shallowRef(new Set())
  const filterValues = shallowRef({})

  // Cache for walk text content
  const walkTextCache = new Map()

  // Helper to get cached walk text
  function getWalkSearchText(walk) {
    if (!walk?.id) return ''
    
    if (walkTextCache.has(walk.id)) {
      return walkTextCache.get(walk.id)
    }
    
    const text = [
      walk.title,
      walk.location,
      walk.description
    ].filter(Boolean).join(' ').toLowerCase()
    
    walkTextCache.set(walk.id, text)
    return text
  }

  // Computed
  const filteredWalks = computed(() => {
    // Early return if no query and no filters
    if (!searchQuery.value && activeFilters.value.size === 0) {
      return []
    }

    // Handle location-based filtering
    if (searchMode.value === 'locations' && locationStore.userLocation) {
      return locationStore.nearbyWalks
    }

    const query = searchQuery.value.toLowerCase().trim()
    let results = walksStore.walks

    // Apply text search if query exists
    if (query) {
      const searchTerms = query.split(/\s+/)
      results = results.filter(walk => {
        const text = getWalkSearchText(walk)
        return searchTerms.every(term => text.includes(term))
      })
    }

    // Apply active filters
    if (activeFilters.value.size > 0) {
      results = results.filter(walk => {
        for (const filter of activeFilters.value) {
          switch (filter) {
            case 'difficulty': {
              if (!filterValues.value.difficulty) return true
              return walk.difficulty === filterValues.value.difficulty
            }
            case 'distance': {
              if (!filterValues.value.distance) return true
              const [min, max] = filterValues.value.distance
              return walk.distance >= min && walk.distance <= max
            }
            case 'duration': {
              if (!filterValues.value.duration) return true
              const [minHours, maxHours] = filterValues.value.duration
              return walk.duration >= minHours && walk.duration <= maxHours
            }
            case 'category': {
              if (!filterValues.value.category) return true
              return walk.categories.includes(filterValues.value.category)
            }
            case 'dogFriendly': {
              return walk.dogFriendly === true
            }
            default:
              return true
          }
        }
        return true
      })
    }

    return results
  })

  // Actions
  function setSearchQuery(query) {
    if (searchQuery.value === query) return
    searchQuery.value = query || ''
    // Add to search history if not empty and unique
    if (query?.trim() && !searchHistory.value.includes(query)) {
      searchHistory.value.unshift(query)
      // Keep only last 10 searches
      if (searchHistory.value.length > 10) {
        searchHistory.value.pop()
      }
    }
  }

  function setSearchMode(mode) {
    if (!['walks', 'locations'].includes(mode)) return
    if (searchMode.value === mode) return
    searchMode.value = mode
    clearSearch()
  }

  function setError(message) {
    error.value = message
  }

  function setIsLoading(loading) {
    isLoading.value = loading
  }

  async function handleLocationSelected(location) {
    if (!location?.center) return
    
    const [longitude, latitude] = location.center
    setSearchMode('locations')
    
    try {
      isLoading.value = true
      await locationStore.setUserLocation({
        latitude,
        longitude,
        place_name: location.place_name
      })
    } catch (error) {
      console.error('Error handling location:', error)
      setError('Unable to process location')
    } finally {
      isLoading.value = false
    }
  }

  function setLocationSuggestions(suggestions) {
    locationSuggestions.value = suggestions || []
  }

  function clearLocationSuggestions() {
    locationSuggestions.value = []
  }

  function toggleFilter(filter) {
    const filters = new Set(activeFilters.value)
    if (filters.has(filter)) {
      filters.delete(filter)
      delete filterValues.value[filter]
    } else {
      filters.add(filter)
    }
    activeFilters.value = filters
  }

  function setFilterValue(filter, value) {
    if (!activeFilters.value.has(filter)) return
    filterValues.value = { ...filterValues.value, [filter]: value }
  }

  function clearSearch() {
    searchQuery.value = ''
    error.value = null
    locationSuggestions.value = []
    activeFilters.value = new Set()
    filterValues.value = {}
    walkTextCache.clear()
  }

  return {
    // State
    searchQuery,
    searchMode,
    error,
    isLoading,
    searchHistory,
    locationSuggestions,
    activeFilters,
    filterValues,

    // Computed
    filteredWalks,

    // Actions
    setSearchQuery,
    setSearchMode,
    setError,
    setIsLoading,
    handleLocationSelected,
    setLocationSuggestions,
    clearLocationSuggestions,
    toggleFilter,
    setFilterValue,
    clearSearch
  }
})
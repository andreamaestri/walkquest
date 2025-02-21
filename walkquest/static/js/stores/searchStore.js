import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useWalksStore } from './walks'
import { useLocationStore } from './locationStore'
import { useUiStore } from './ui'

export const useSearchStore = defineStore('search', () => {
  const locationStore = useLocationStore()
  const walksStore = useWalksStore()
  const uiStore = useUiStore()

  // State
  const searchQuery = ref('')
  const searchMode = ref('walks')
  const error = ref(null)
  const isLoading = ref(false)
  const MAX_HISTORY_ITEMS = 5
  const searchHistory = ref([])
  const activeFilters = ref([])
  const locationSuggestions = ref([])
  const filterValues = ref({
    difficulty: [],
    distance: null,
    duration: null,
    category: [],
    'dog-friendly': false
  })

  // Computed
  const filteredWalks = computed(() => {
    let results = walksStore.walks

    // Apply text search
    if (searchQuery.value?.trim()) {
      const query = searchQuery.value.toLowerCase().trim()
      results = results.filter(walk => {
        const text = [
          walk.title,
          walk.location,
          walk.description
        ].filter(Boolean).join(' ').toLowerCase()
        return text.includes(query)
      })
    }

    // Apply filters
    if (activeFilters.value.length > 0) {
      results = results.filter(walk => {
        return activeFilters.value.every(filter => {
          switch (filter) {
            case 'difficulty':
              return filterValues.value.difficulty.length === 0 || 
                     filterValues.value.difficulty.includes(walk.difficulty?.toLowerCase())
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
            case 'category':
              return filterValues.value.category.length === 0 ||
                     walk.categories?.some(cat => filterValues.value.category.includes(cat))
            case 'dog-friendly':
              return !filterValues.value['dog-friendly'] || walk.dogFriendly
            default:
              return true
          }
        })
      })
    }

    // Apply location-based filtering if in location mode
    if (searchMode.value === 'locations' && locationStore.userLocation) {
      results = locationStore.nearbyWalks
    }

    return results
  })

  // Actions
  function setSearchQuery(query) {
    searchQuery.value = query
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
    searchMode.value = mode
    // Clear filters when switching modes
    if (mode === 'locations') {
      activeFilters.value = []
      filterValues.value = {
        difficulty: [],
        distance: null,
        duration: null,
        category: [],
        'dog-friendly': false
      }
    }
  }

  function setError(msg) {
    error.value = msg
  }

  function setActiveFilters(filters) {
    activeFilters.value = filters
  }

  function updateFilterValue(filter, value) {
    filterValues.value[filter] = value
  }

  function clearFilters() {
    activeFilters.value = []
    filterValues.value = {
      difficulty: [],
      distance: null,
      duration: null,
      category: [],
      'dog-friendly': false
    }
  }

  async function handleLocationSelected(location) {
    try {
      isLoading.value = true
      await locationStore.setUserLocation(location)
      error.value = null
    } catch (err) {
      error.value = 'Failed to process location'
      console.error('Location selection error:', err)
    } finally {
      isLoading.value = false
    }
  }

  function clearLocationSuggestions() {
    locationSuggestions.value = []
  }

  function setLocationSuggestions(suggestions) {
    locationSuggestions.value = suggestions
  }

  function clearSearch() {
    searchQuery.value = ''
    clearLocationSuggestions()
    error.value = null
  }

  return {
    // State
    searchQuery,
    searchMode,
    error,
    isLoading,
    searchHistory,
    activeFilters,
    filterValues,
    filteredWalks,
    locationSuggestions,

    // Actions
    setSearchQuery,
    setSearchMode,
    setError,
    setActiveFilters,
    updateFilterValue,
    clearFilters,
    handleLocationSelected,
    clearLocationSuggestions,
    setLocationSuggestions,
    clearSearch
  }
})
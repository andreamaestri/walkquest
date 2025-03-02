import { defineStore } from 'pinia'
import { ref, computed, shallowRef, watch } from 'vue'
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
  const locationSuggestions = shallowRef([])
  const activeFilters = shallowRef(new Set())
  const filterValues = shallowRef({})
  const selectedCategory = ref(null)
  const availableCategories = shallowRef([])

  // Pre-compute searchable walks (using only titles in lowercase)
  const searchableWalks = shallowRef([])

  function initializeSearchableWalks() {
    console.time('initializeSearchableWalks')
    searchableWalks.value = walksStore.walks.map(walk => ({
      id: walk.id,
      // Preprocess once: use title (or walk_name) in lowercase
      title: (walk.title || walk.walk_name || '').toLowerCase(),
      originalWalk: walk
    }))
    console.timeEnd('initializeSearchableWalks')
  }

  // Extract all unique categories from walks
  function extractCategories() {
    const categories = new Set()
    walksStore.walks.forEach(walk => {
      if (walk.related_categories && Array.isArray(walk.related_categories)) {
        walk.related_categories.forEach(category => {
          if (typeof category === 'string') {
            categories.add(category)
          } else if (category && typeof category === 'object' && category.name) {
            categories.add(category.name)
          }
        })
      } else if (walk.categories && Array.isArray(walk.categories)) {
        walk.categories.forEach(category => {
          if (typeof category === 'string') {
            categories.add(category)
          } else if (category && typeof category === 'object' && category.name) {
            categories.add(category.name)
          }
        })
      }
    })
    availableCategories.value = Array.from(categories).sort()
  }

  // Update searchableWalks when walksStore.walks changes
  watch(
    () => walksStore.walks,
    () => {
      initializeSearchableWalks()
      extractCategories()
    },
    { immediate: true }
  )

  // Optimized suggestions using only the preprocessed title
  const suggestions = computed(() => {
    const t0 = performance.now()
    const query = searchQuery.value.trim().toLowerCase()
    if (!query) return []
    
    const terms = query.split(/\s+/)
    const results = []
    
    // Simple scan over the cached searchableWalks
    for (const walk of searchableWalks.value) {
      let match = true
      for (const term of terms) {
        if (!walk.title.includes(term)) {
          match = false
          break
        }
      }
      if (match) {
        results.push(walk.originalWalk)
        if (results.length >= 5) break
      }
    }
    
    const t1 = performance.now()
    console.debug(`Suggestions computed in ${(t1 - t0).toFixed(2)}ms for query: "${query}"`)
    return results
  })

  // Cache for full text (for detailed filtering)
  const walkTextCache = new Map()

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

  // Detailed filtering including active filters
  const filteredWalks = computed(() => {
    // Early return if no query and no filters
    if (!searchQuery.value && activeFilters.value.size === 0) {
      return []
    }
    if (searchMode.value === 'locations' && locationStore.userLocation) {
      return locationStore.nearbyWalks
    }
    if (searchMode.value === 'categories' && selectedCategory.value) {
      return walksStore.walks.filter(walk => {
        const categories = walk.related_categories || walk.categories || []
        const selectedCat = typeof selectedCategory.value === 'string' ?
                             selectedCategory.value.toLowerCase() :
                             (selectedCategory.value.name ? selectedCategory.value.name.toLowerCase() : '')
                             
        return categories.some(cat => {
          const catName = typeof cat === 'string' ? cat.toLowerCase() :
                          (cat && cat.name ? cat.name.toLowerCase() : '')
          return catName.includes(selectedCat)
        })
      })
    }
    const query = searchQuery.value.toLowerCase().trim()
    let results = walksStore.walks
    if (query) {
      const searchTerms = query.split(/\s+/)
      results = results.filter(walk => {
        const text = getWalkSearchText(walk)
        return searchTerms.every(term => text.includes(term))
      })
    }
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
    if (query?.trim() && !searchHistory.value.includes(query)) {
      searchHistory.value.unshift(query)
      if (searchHistory.value.length > MAX_HISTORY_ITEMS) {
        searchHistory.value.pop()
      }
    }
  }

  function setSearchMode(mode) {
    if (!['walks', 'locations', 'categories'].includes(mode)) return
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

  function setSelectedCategory(category) {
    if (category && typeof category === 'object' && category.name) {
      selectedCategory.value = category.name
    } else {
      selectedCategory.value = category
    }
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
    selectedCategory,
    availableCategories,

    // Computed
    filteredWalks,
    suggestions,

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
    clearSearch,
    initializeSearchableWalks,
    setSelectedCategory
  }
})
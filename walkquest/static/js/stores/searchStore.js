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

  // Cache for filtered results to prevent recalculation
  const filteredCache = shallowRef({
    query: '',
    filters: new Set(),
    filterValues: {},
    selectedCategory: null,
    searchMode: '',
    results: []
  })
  
  // Helper to compare filter sets
  const areFiltersEqual = (a, b) => {
    if (a.size !== b.size) return false
    for (const item of a) {
      if (!b.has(item)) return false
    }
    return true
  }
  
  // Helper to compare filter values objects
  const areFilterValuesEqual = (a, b) => {
    const aKeys = Object.keys(a)
    const bKeys = Object.keys(b)
    if (aKeys.length !== bKeys.length) return false
    
    return aKeys.every(key => {
      if (Array.isArray(a[key]) && Array.isArray(b[key])) {
        return a[key].length === b[key].length && 
               a[key].every((val, idx) => val === b[key][idx])
      }
      return a[key] === b[key]
    })
  }
  
  // Helper to check if we can use the cache
  const canUseCache = () => {
    return filteredCache.value.query === searchQuery.value.toLowerCase().trim() &&
           areFiltersEqual(filteredCache.value.filters, activeFilters.value) &&
           areFilterValuesEqual(filteredCache.value.filterValues, filterValues.value) &&
           filteredCache.value.selectedCategory === selectedCategory.value &&
           filteredCache.value.searchMode === searchMode.value
  }
  
  // Optimized filtering with caching
  const filteredWalks = computed(() => {
    // Start timing for performance monitoring
    console.time('filteredWalks computation')
    
    // Early return if no query and no filters
    if (!searchQuery.value && activeFilters.value.size === 0) {
      console.timeEnd('filteredWalks computation')
      return []
    }
    
    // Use cache if inputs haven't changed
    if (canUseCache()) {
      console.log('Using cached filtered walks')
      console.timeEnd('filteredWalks computation')
      return filteredCache.value.results
    }
    
    // Handle location-based search
    if (searchMode.value === 'locations' && locationStore.userLocation) {
      // Update cache
      filteredCache.value = {
        query: searchQuery.value.toLowerCase().trim(),
        filters: new Set(activeFilters.value),
        filterValues: { ...filterValues.value },
        selectedCategory: selectedCategory.value,
        searchMode: searchMode.value,
        results: locationStore.nearbyWalks
      }
      console.timeEnd('filteredWalks computation')
      return locationStore.nearbyWalks
    }
    
    // Handle category-based search
    if (searchMode.value === 'categories' && selectedCategory.value) {
      const selectedCat = typeof selectedCategory.value === 'string' ?
                           selectedCategory.value.toLowerCase() :
                           (selectedCategory.value.name ? selectedCategory.value.name.toLowerCase() : '')
      
      // Avoid creating functions inside the filter
      const results = walksStore.walks.filter(walk => {
        const categories = walk.related_categories || walk.categories || []
        return categories.some(cat => {
          const catName = typeof cat === 'string' ? cat.toLowerCase() :
                          (cat && cat.name ? cat.name.toLowerCase() : '')
          return catName.includes(selectedCat)
        })
      })
      
      // Update cache
      filteredCache.value = {
        query: searchQuery.value.toLowerCase().trim(),
        filters: new Set(activeFilters.value),
        filterValues: { ...filterValues.value },
        selectedCategory: selectedCategory.value,
        searchMode: searchMode.value,
        results
      }
      console.timeEnd('filteredWalks computation')
      return results
    }
    
    // Handle text search and filters
    const query = searchQuery.value.toLowerCase().trim()
    let results = walksStore.walks
    
    // Apply text search filter first if present
    if (query) {
      const searchTerms = query.split(/\s+/)
      // Avoid recalculating search text for each walk in every filter pass
      const searchTextMap = new Map()
      
      results = results.filter(walk => {
        // Get or calculate search text
        let text
        if (searchTextMap.has(walk.id)) {
          text = searchTextMap.get(walk.id)
        } else {
          text = getWalkSearchText(walk)
          searchTextMap.set(walk.id, text)
        }
        
        // Check all terms
        return searchTerms.every(term => text.includes(term))
      })
    }
    
    // Apply property filters if present
    if (activeFilters.value.size > 0) {
      // Extract filter criteria once before the filter loop
      const difficultyValue = filterValues.value.difficulty
      const distanceValues = filterValues.value.distance
      const durationValues = filterValues.value.duration
      const categoryValue = filterValues.value.category
      
      // Create a filter function based on active filters
      results = results.filter(walk => {
        // Check all filters
        for (const filter of activeFilters.value) {
          switch (filter) {
            case 'difficulty':
              if (difficultyValue && walk.difficulty !== difficultyValue) return false
              break
              
            case 'distance':
              if (distanceValues) {
                const [min, max] = distanceValues
                if (walk.distance < min || walk.distance > max) return false
              }
              break
              
            case 'duration':
              if (durationValues) {
                const [minHours, maxHours] = durationValues
                if (walk.duration < minHours || walk.duration > maxHours) return false
              }
              break
              
            case 'category':
              if (categoryValue && !walk.categories?.includes(categoryValue)) return false
              break
              
            case 'dogFriendly':
              if (walk.dogFriendly !== true) return false
              break
          }
        }
        return true
      })
    }
    
    // Update cache with new results
    filteredCache.value = {
      query,
      filters: new Set(activeFilters.value),
      filterValues: { ...filterValues.value },
      selectedCategory: selectedCategory.value,
      searchMode: searchMode.value,
      results
    }
    
    console.timeEnd('filteredWalks computation')
    return results
  })

  // Add performSearch method
  async function performSearch(query) {
    if (!query?.trim()) {
      clearSearch()
      return []
    }

    try {
      setIsLoading(true)
      setSearchQuery(query)
      return filteredWalks.value
    } finally {
      setIsLoading(false)
    }
  }

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

  // Enhanced search mode setter with better error handling
  function setSearchMode(mode) {
    console.log('Setting search mode to:', mode);
    if (!['walks', 'locations', 'categories'].includes(mode)) {
      console.warn(`Invalid search mode: ${mode}`);
      return;
    }
    if (searchMode.value === mode) return;
    searchMode.value = mode;
    clearSearch();
    
    // Log available categories when switching to categories mode
    if (mode === 'categories') {
      console.log('Available categories for category mode:', availableCategories.value);
      if (!availableCategories.value.length) {
        console.warn('No categories available. Trying to extract again...');
        extractCategories();
      }
    }
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
    
    // Clear caches
    walkTextCache.clear()
    filteredCache.value = {
      query: '',
      filters: new Set(),
      filterValues: {},
      selectedCategory: null,
      searchMode: searchMode.value,
      results: []
    }
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
    searchResults: filteredWalks, // Expose filteredWalks as searchResults

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
    setSelectedCategory,
    performSearch
  }
})
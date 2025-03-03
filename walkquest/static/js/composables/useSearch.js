import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useSearchStore } from '../stores/searchStore'
import { useLocationStore } from '../stores/locationStore'
import { useUiStore } from '../stores/ui'
import { cancelRequest } from '../services/api'

/**
 * Composable for handling search functionality
 * Abstracts search state management and event handling
 */
export default function useSearch() {
  const searchStore = useSearchStore()
  const locationStore = useLocationStore()
  const uiStore = useUiStore()
  
  // Local state
  const searchQuery = ref('')
  const searchMode = ref('walks')
  const isSearchFocused = ref(false)
  const searchDebounceTimeout = ref(null)
  
  // Computed properties
  const hasSearchResults = computed(() => {
    return searchStore.filteredWalks.length > 0 || 
           searchStore.locationSuggestions.length > 0
  })
  
  const showLocationSuggestions = computed(() => {
    return searchMode.value === 'locations' && 
           searchStore.locationSuggestions.length > 0 && 
           isSearchFocused.value
  })
  
  const showSearchResults = computed(() => {
    return hasSearchResults.value && isSearchFocused.value
  })
  
  // Watch for changes to search query with debounce
  watch(searchQuery, (newQuery) => {
    // Clear previous timeout
    if (searchDebounceTimeout.value) {
      clearTimeout(searchDebounceTimeout.value)
    }
    
    // Cancel any in-flight search requests
    cancelRequest('walks/search')
    
    // Set a new timeout for debouncing
    searchDebounceTimeout.value = setTimeout(() => {
      if (newQuery.trim()) {
        searchStore.setSearchQuery(newQuery)
        
        // If in location mode, handle differently
        if (searchMode.value === 'locations') {
          // Call location search API
          fetchLocationSuggestions(newQuery)
        }
      } else {
        // Clear search if query is empty
        searchStore.clearSearch()
        searchStore.clearLocationSuggestions()
      }
    }, 300) // 300ms debounce
  })
  
  // When search mode changes, update local and store state
  watch(searchMode, (newMode) => {
    searchStore.setSearchMode(newMode)
    
    // Clear existing results when mode changes
    searchStore.clearLocationSuggestions()
    searchQuery.value = ''
  })
  
  /**
   * Handle focus on search input
   */
  function handleSearchFocus() {
    isSearchFocused.value = true
    uiStore.setSearchOpen(true)
  }
  
  /**
   * Handle blur on search input
   */
  function handleSearchBlur() {
    // Use timeout to allow click events on results to fire first
    setTimeout(() => {
      isSearchFocused.value = false
    }, 200)
  }
  
  /**
   * Clear search and reset state
   */
  function clearSearch() {
    searchQuery.value = ''
    searchStore.clearSearch()
    searchStore.clearLocationSuggestions()
    isSearchFocused.value = false
  }
  
  /**
   * Fetch location suggestions from the API
   */
  async function fetchLocationSuggestions(query) {
    if (!query.trim()) {
      searchStore.clearLocationSuggestions()
      return
    }
    
    try {
      searchStore.setIsLoading(true)
      
      // Here you would call your location API
      // For now, we'll use placeholder logic
      const suggestions = [
        // Example suggestions
        { place_name: `${query} Park`, center: [0, 0] },
        { place_name: `${query} Street`, center: [0, 0] }
      ]
      
      searchStore.setLocationSuggestions(suggestions)
    } catch (error) {
      console.error('Error fetching location suggestions:', error)
      searchStore.setError('Unable to fetch location suggestions')
    } finally {
      searchStore.setIsLoading(false)
    }
  }
  
  /**
   * Handle location selection from suggestions
   */
  async function handleLocationSelected(location) {
    if (!location) return
    
    searchStore.handleLocationSelected(location)
    searchQuery.value = location.place_name
    isSearchFocused.value = false
  }
  
  /**
   * Handle search mode change
   */
  function setSearchMode(mode) {
    if (searchMode.value === mode) return
    searchMode.value = mode
    searchStore.setSearchMode(mode)
  }
  
  // Clean up on component unmount
  onBeforeUnmount(() => {
    if (searchDebounceTimeout.value) {
      clearTimeout(searchDebounceTimeout.value)
    }
    
    // Cancel any pending requests
    cancelRequest('walks/search')
  })
  
  return {
    // State
    searchQuery,
    searchMode,
    isSearchFocused,
    
    // Computed
    hasSearchResults,
    showLocationSuggestions,
    showSearchResults,
    
    // Store access
    filteredWalks: computed(() => searchStore.filteredWalks),
    locationSuggestions: computed(() => searchStore.locationSuggestions),
    isLoading: computed(() => searchStore.isLoading),
    searchError: computed(() => searchStore.error),
    
    // Methods
    handleSearchFocus,
    handleSearchBlur,
    clearSearch,
    handleLocationSelected,
    setSearchMode
  }
}
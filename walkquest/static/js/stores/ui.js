import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUiStore = defineStore('ui', () => {
  // State
  const error = ref(null)
  const loading = ref(false)
  const mapLoading = ref(true)
  const showSidebar = ref(false) // Start with sidebar hidden
  const fullscreen = ref(false)
  const mobileMenuOpen = ref(false)
  const loadingStates = ref({
    walks: false,
    map: false,
    path: false,
    search: false
  })
  const searchQuery = ref('')

  // Computed
  const isMobile = computed(() => {
    return window.innerWidth <= 768
  })

  // Actions
  const setError = (message) => {
    error.value = message
    console.error('UI Error:', message)
  }

  const clearError = () => {
    error.value = null
  }

  const setLoading = (state) => {
    loading.value = state
    console.log('Loading state:', state)
  }

  const setMapLoading = (state) => {
    mapLoading.value = state
    console.log('Map loading state:', state)
  }

  const setLoadingState = (key, state) => {
    if (key in loadingStates.value) {
      loadingStates.value[key] = state
      console.log(`Loading state [${key}]:`, state)
    }
  }

  const setSidebarVisibility = (visible) => {
    showSidebar.value = visible
    console.log('Sidebar visibility:', visible)
    
    // Dispatch event for any external listeners
    window.dispatchEvent(new CustomEvent('sidebar:visibility-changed', {
      detail: { visible }
    }))
  }

  const toggleSidebar = () => {
    setSidebarVisibility(!showSidebar.value)
  }

  const setFullscreen = (state) => {
    fullscreen.value = state
    console.log('Fullscreen state:', state)
  }

  const setMobileMenuOpen = (state) => {
    mobileMenuOpen.value = state
    console.log('Mobile menu state:', state)
  }

  const setSearchQuery = (query) => {
    searchQuery.value = query
    console.log('Search query:', query)
  }

  const resetState = () => {
    error.value = null
    loading.value = false
    mapLoading.value = true
    showSidebar.value = false
    fullscreen.value = false
    mobileMenuOpen.value = false
    searchQuery.value = ''
    loadingStates.value = {
      walks: false,
      map: false,
      path: false,
      search: false
    }
  }

  // Computed
  const isLoading = computed(() => {
    return loading.value || Object.values(loadingStates.value).some(state => state)
  })

  return {
    // State
    error,
    loading,
    mapLoading,
    showSidebar,
    fullscreen,
    mobileMenuOpen,
    loadingStates,
    searchQuery,

    // Computed
    isLoading,
    isMobile,

    // Actions
    setError,
    clearError,
    setLoading,
    setMapLoading,
    setLoadingState,
    setSidebarVisibility,
    toggleSidebar,
    setFullscreen,
    setMobileMenuOpen,
    setSearchQuery,
    resetState
  }
})
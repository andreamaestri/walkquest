import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUiStore = defineStore('ui', () => {
  // State
  const error = ref(null)
  const loading = ref(false)
  const mobileMenuOpen = ref(false)
  const fullscreen = ref(false)
  const showSidebar = ref(true) // Change default to true
  const isMobile = ref(false)
  const loadingStates = ref({
    walks: false,
    location: false,
    map: false,
    path: false,
    search: false
  })

  // Add drawer state
  const showDrawer = ref(false)

  // Computed
  const isAnyLoading = computed(() => {
    return Object.values(loadingStates.value).some(state => state)
  })

  // Actions
  const setError = (message) => {
    error.value = message
  }

  const setLoading = (value) => {
    loading.value = value
  }

  const setLoadingState = (key, value) => {
    if (key in loadingStates.value) {
      loadingStates.value[key] = value
    }
  }

  const setMobileMenuOpen = (value) => {
    mobileMenuOpen.value = value
  }

  const setSidebarVisibility = (value) => {
    showSidebar.value = value
  }

  // Update handleWalkSelected to handle mobile properly
  const handleWalkSelected = () => {
    if (!isMobile.value) {
      showSidebar.value = true
    }
    showDrawer.value = true
  }

  const handleWalkClosed = () => {
    showDrawer.value = false
    // Only restore sidebar on desktop
    if (!isMobile.value) {
      showSidebar.value = true
    }
  }

  const toggleSidebar = () => {
    showSidebar.value = !showSidebar.value
  }

  const initializeResponsiveState = () => {
    const checkMobile = () => {
      isMobile.value = window.innerWidth < 768
      // Don't automatically hide sidebar on mobile - let components control visibility
      if (!isMobile.value && !window.location.pathname.includes('/walk/')) {
        showSidebar.value = true
      }
    }

    // Initial check
    checkMobile()
    
    // Listen for resize
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }

  return {
    // State
    error,
    loading,
    loadingStates,
    mobileMenuOpen,
    fullscreen,
    showSidebar,
    isMobile,
    showDrawer,

    // Computed
    isAnyLoading,

    // Actions
    setError,
    setLoading,
    setLoadingState,
    setMobileMenuOpen,
    setSidebarVisibility,
    handleWalkSelected,
    handleWalkClosed,
    toggleSidebar,
    initializeResponsiveState
  }
})
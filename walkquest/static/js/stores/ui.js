import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUiStore = defineStore('ui', () => {
  // State
  const error = ref(null)
  const loading = ref(false)
  const mobileMenuOpen = ref(false)
  const fullscreen = ref(false)
  const showSidebar = ref(true)
  const isMobile = ref(false)
  const loadingStates = ref({
    walks: false,
    location: false,
    map: false,
    path: false,
    search: false
  })

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

  const initializeResponsiveState = () => {
    const checkMobile = () => {
      isMobile.value = window.innerWidth < 768
      showSidebar.value = !isMobile.value
    }

    checkMobile()
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

    // Computed
    isAnyLoading,

    // Actions
    setError,
    setLoading,
    setLoadingState,
    setMobileMenuOpen,
    setSidebarVisibility,
    initializeResponsiveState
  }
})
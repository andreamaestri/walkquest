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

  // Actions
  const setError = (message) => {
    error.value = message
  }

  const setLoading = (value) => {
    loading.value = value
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
    mobileMenuOpen,
    fullscreen,
    showSidebar,
    isMobile,

    // Actions
    setError,
    setLoading,
    setMobileMenuOpen,
    setSidebarVisibility,
    initializeResponsiveState
  }
})
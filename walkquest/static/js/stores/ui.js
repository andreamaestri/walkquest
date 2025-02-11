import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const error = ref(null)
  const loading = ref(false)
  const mapLoading = ref(true)
  const showSidebar = ref(true)
  const fullscreen = ref(false)
  const mobileMenuOpen = ref(false)
  const loadingStates = ref({
    map: false,
    path: false,
    search: false
  })

  const setError = (message) => {
    error.value = message
  }

  const setLoading = (state) => {
    loading.value = state
  }

  const setMapLoading = (state) => {
    mapLoading.value = state
  }

  const setLoadingState = (key, state) => {
    loadingStates.value[key] = state
  }

  const toggleSidebar = () => {
    showSidebar.value = !showSidebar.value
  }

  const setMobileMenuOpen = (state) => {
    mobileMenuOpen.value = state
  }

  return {
    error,
    loading,
    mapLoading,
    showSidebar,
    fullscreen,
    mobileMenuOpen,
    loadingStates,
    setError,
    setLoading,
    setMapLoading,
    setLoadingState,
    toggleSidebar,
    setMobileMenuOpen
  }
})
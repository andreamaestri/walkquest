import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const error = ref(null)
  const loading = ref(false)
  const mapLoading = ref(true)
  const showSidebar = ref(true)
  const fullscreen = ref(false)
  const mobileMenuOpen = ref(false)

  const setError = (message) => {
    error.value = message
  }

  const setLoading = (state) => {
    loading.value = state
  }

  const setMapLoading = (state) => {
    mapLoading.value = state
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
    setError,
    setLoading,
    setMapLoading,
    toggleSidebar,
    setMobileMenuOpen
  }
})
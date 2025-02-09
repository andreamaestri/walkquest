import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  state: () => ({
    mobileMenu: {
      isOpen: false
    },
    fullscreen: false,
    showSidebar: false,
    error: null,
    isLoading: false,
    loadingStates: {
      map: false,
      path: false,
      search: false
    },
    searchQuery: ''
  }),

  actions: {
    toggleMobileMenu() {
      this.mobileMenu.isOpen = !this.mobileMenu.isOpen
    },

    toggleSidebar() {
      this.showSidebar = !this.showSidebar
    },

    toggleFullscreen() {
      this.fullscreen = !this.fullscreen
    },

    setError(error) {
      this.error = error
    },

    clearError() {
      this.error = null
    },

    setLoading(state) {
      this.isLoading = state
    },

    setLoadingState(key, state) {
      if (key in this.loadingStates) {
        this.loadingStates[key] = state
      }
    },

    setSearchQuery(query) {
      this.searchQuery = query
    }
  }
})
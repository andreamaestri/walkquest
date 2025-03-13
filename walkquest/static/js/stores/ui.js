import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Debounce helper function
function debounce(fn, delay) {
  let timeoutId
  return function (...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), delay)
  }
}

export const useUiStore = defineStore('ui', {
  state: () => ({
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    breakpoints: {
      small: 640,
      medium: 768,
      large: 1024,
      xl: 1280
    },
    scrollY: 0,
    // Toast notification state
    toast: {
      message: '',
      visible: false,
      type: 'info' // 'info', 'success', 'error'
    },
    toastTimeout: null,
    // New state properties for loading and error handling
    loadingState: false,
    error: null,
    // New modal state
    modal: {
      isOpen: false,
      component: null,
      props: {}
    },
    // New dark mode state
    isDarkMode: localStorage.getItem('darkMode') === 'true',
    showDrawer: false,
    sidebarExpanded: localStorage.getItem('sidebarExpanded') === 'true'
  }),

  getters: {
    isMobile: (state) => state.windowWidth < state.breakpoints.medium,
    isTablet: (state) => state.windowWidth >= state.breakpoints.medium && state.windowWidth < state.breakpoints.large,
    isDesktop: (state) => state.windowWidth >= state.breakpoints.large,
    isWideScreen: (state) => state.windowWidth >= state.breakpoints.xl,
    isScrolled: (state) => state.scrollY > 0
  },

  actions: {
    updateWindowSize() {
      this.windowWidth = window.innerWidth
      this.windowHeight = window.innerHeight
    },

    updateScrollPosition() {
      this.scrollY = window.scrollY
    },

    // Show a toast notification
    showToast(message, type = 'info', duration = 3000) {
      // Clear any existing timeout
      if (this.toastTimeout) {
        clearTimeout(this.toastTimeout)
      }

      // Update toast state
      this.toast.message = message
      this.toast.type = type
      this.toast.visible = true

      // Auto-hide after duration
      this.toastTimeout = setTimeout(() => {
        this.toast.visible = false
      }, duration)
    },

    // Manually hide the toast
    hideToast() {
      if (this.toastTimeout) {
        clearTimeout(this.toastTimeout)
      }
      this.toast.visible = false
    },

    // Show a success notification
    showSuccessMessage(message, duration = 3000) {
      this.showToast(message, 'success', duration)
    },

    // Show an error notification
    showErrorMessage(message, duration = 3000) {
      this.showToast(message, 'error', duration)
    },

    // Show an info notification
    showInfoMessage(message, duration = 3000) {
      this.showToast(message, 'info', duration)
    },

    openModal(component, props = {}) {
      this.modal.component = component
      this.modal.props = props
      this.modal.isOpen = true
    },

    closeModal() {
      this.modal.isOpen = false
    },

    toggleDarkMode() {
      this.isDarkMode = !this.isDarkMode
      localStorage.setItem('darkMode', this.isDarkMode)
      document.documentElement.classList.toggle('dark', this.isDarkMode)
    },

    setLoadingState(value) {
      this.loadingState = value
    },

    setError(error) {
      this.error = error
    },

    initializeResponsiveState() {
      // Set initial values
      this.updateWindowSize()
      this.updateScrollPosition()

      // Create debounced resize handler
      const debouncedResize = debounce(this.updateWindowSize.bind(this), 100)

      // Add event listeners
      window.addEventListener('resize', debouncedResize)
      window.addEventListener('scroll', this.updateScrollPosition)
      
      // Return cleanup function
      return () => {
        window.removeEventListener('resize', debouncedResize)
        window.removeEventListener('scroll', this.updateScrollPosition)
      }
    },

    cleanupResponsiveState() {
      // This method is now handled by the cleanup function returned from initializeResponsiveState
    },

    handleWalkSelected() {
      this.showDrawer = true
      this.sidebarExpanded = false
      localStorage.setItem('sidebarExpanded', 'false')
    },

    handleWalkClosed() {
      this.showDrawer = false
      this.sidebarExpanded = true
      localStorage.setItem('sidebarExpanded', 'true')
    },

    setSidebarVisibility(visible) {
      this.sidebarExpanded = visible
      localStorage.setItem('sidebarExpanded', visible.toString())
    }
  }
})
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useUiStore = defineStore('ui', () => {
  // State
  const error = ref(null);
  const loading = ref(false);
  const mobileMenuOpen = ref(false);
  const fullscreen = ref(false);
  const showSidebar = ref(true); // Change default to true
  const isMobile = ref(false);
  const loadingStates = ref({
    walks: false,
    location: false,
    map: false,
    path: false,
    search: false
  });

  // Add drawer state
  const showDrawer = ref(false);

  // Add toast state
  const toast = ref({
    message: '',
    visible: false,
    type: 'info' // 'info', 'success', 'error'
  });

  // Computed
  const isAnyLoading = computed(() => {
    return Object.values(loadingStates.value).some(state => state);
  });

  // Actions
  const setError = (message) => {
    error.value = message;
  };

  const setLoading = (value) => {
    loading.value = value;
  };

  const setLoadingState = (key, value) => {
    if (key in loadingStates.value) {
      loadingStates.value[key] = value;
    }
  };

  const setMobileMenuOpen = (value) => {
    mobileMenuOpen.value = value;
  };

  const setSidebarVisibility = (value) => {
    showSidebar.value = value;
  };

  // Add setIsMobile action
  const setIsMobile = (value) => {
    isMobile.value = value;
  };

  // Update handleWalkSelected to handle mobile properly
  const handleWalkSelected = () => {
    if (!isMobile.value) {
      showSidebar.value = true;
    }
    showDrawer.value = true;
  };

  const handleWalkClosed = () => {
    showDrawer.value = false;
    // Only restore sidebar on desktop
    if (!isMobile.value) {
      showSidebar.value = true;
    }
  };

  const toggleSidebar = () => {
    showSidebar.value = !showSidebar.value;
  };

  const initializeResponsiveState = () => {
    const checkMobile = () => {
      const newIsMobile = window.innerWidth < 768;
      // Only update if there's a change to avoid unnecessary rerenders
      if (isMobile.value !== newIsMobile) {
        isMobile.value = newIsMobile;
      }
      
      // Don't automatically hide sidebar on mobile - let components control visibility
      if (!isMobile.value && !window.location.pathname.includes('/walk/')) {
        showSidebar.value = true;
      }
    };

    // Initial check
    checkMobile();
    
    // Listen for resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  };

  const showToast = (message, type = 'info') => {
    toast.value.message = message;
    toast.value.type = type;
    toast.value.visible = true;

    setTimeout(() => {
      hideToast();
    }, 3000);
  };

  const hideToast = () => {
    toast.value.visible = false;
    toast.value.message = '';
  };

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
    toast,

    // Computed
    isAnyLoading,

    // Actions
    setError,
    setLoading,
    setLoadingState,
    setMobileMenuOpen,
    setSidebarVisibility,
    setIsMobile, // Add the new action
    handleWalkSelected,
    handleWalkClosed,
    toggleSidebar,
    initializeResponsiveState,
    showToast,
    hideToast
  };
});
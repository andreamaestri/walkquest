import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useUiStore } from '../stores/ui';

/**
 * Composable for handling responsive layout concerns
 * Abstracts responsive breakpoints, device detection, and layout switching
 */
export default function useResponsiveLayout() {
  const uiStore = useUiStore();
  
  // Local state
  const isMobile = ref(false);
  const windowWidth = ref(window.innerWidth);
  const MOBILE_BREAKPOINT = 768;
  
  // Computed properties
  const layoutType = computed(() => isMobile.value ? 'mobile' : 'desktop');
  
  // Handle window resize
  const resizeHandler = () => {
    windowWidth.value = window.innerWidth;
    updateDeviceType();
  };
  
  // Debounced resize handler for performance
  let resizeTimeout = null;
  const debouncedResizeHandler = () => {
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }
    
    resizeTimeout = setTimeout(resizeHandler, 100);
  };
  
  // Update device type based on window width
  const updateDeviceType = () => {
    const newIsMobile = windowWidth.value < MOBILE_BREAKPOINT;
    
    // Only update if there's a change to avoid unnecessary rerenders
    if (isMobile.value !== newIsMobile) {
      isMobile.value = newIsMobile;
      
      // Instead of directly mutating the store, use its actions
      if (uiStore.setIsMobile) {
        uiStore.setIsMobile(newIsMobile);
      }
    }
  };
  
  // Set up event listeners on mount
  onMounted(() => {
    window.addEventListener('resize', debouncedResizeHandler);
    // Initial call to set device type
    updateDeviceType();
  });
  
  // Clean up event listeners on unmount
  onBeforeUnmount(() => {
    window.removeEventListener('resize', debouncedResizeHandler);
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }
  });
  
  /**
   * Check if the current layout is mobile
   */
  function checkIsMobile() {
    return isMobile.value;
  }
  
  /**
   * Manually trigger a layout check
   * Useful after orientation changes or app state changes
   */
  function checkLayout() {
    resizeHandler();
  }
  
  return {
    // State
    isMobile,
    windowWidth,
    
    // Computed
    layoutType,
    
    // Methods
    checkIsMobile,
    checkLayout
  };
}
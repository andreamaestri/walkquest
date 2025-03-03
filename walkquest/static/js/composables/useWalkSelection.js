import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useWalksStore } from '../stores/walks'
import { useUiStore } from '../stores/ui'
import { useRouter, useRoute } from 'vue-router'
import { cancelAllRequests } from '../services/api'

/**
 * Composable for handling walk selection and navigation
 * Abstracts walk selection logic and drawer management
 */
export default function useWalkSelection() {
  const walksStore = useWalksStore()
  const uiStore = useUiStore()
  const router = useRouter()
  const route = useRoute()
  
  // Local state
  const selectedWalk = ref(null)
  const isDrawerOpen = ref(false)
  const isTransitioning = ref(false)
  
  // Computed properties
  const selectedWalkData = computed(() => {
    if (!selectedWalk.value) return null
    return walksStore.getWalkById(selectedWalk.value)
  })
  
  const walkCategories = computed(() => {
    if (!selectedWalkData.value?.categories) return []
    
    return selectedWalkData.value.categories.map(category => {
      if (typeof category === 'string') return category
      return category.name
    })
  })
  
  // Initialize from route if available
  function initializeFromRoute() {
    const walkSlug = route.params.slug
    
    if (walkSlug) {
      const walk = walksStore.walks.find(w => w.slug === walkSlug)
      if (walk) {
        handleWalkSelection(walk.id, false)
      }
    }
  }
  
  /**
   * Handle walk selection
   * @param {string|number} walkId ID of the walk to select
   * @param {boolean} navigate Whether to navigate to the walk detail route
   */
  function handleWalkSelection(walkId, navigate = true) {
    // Skip if selecting the same walk
    if (selectedWalk.value === walkId) {
      // Just ensure drawer is open
      if (!isDrawerOpen.value) {
        isDrawerOpen.value = true
      }
      return
    }
    
    // Set transitioning state
    isTransitioning.value = true
    
    // Close drawer before changing walk (animation)
    if (isDrawerOpen.value) {
      isDrawerOpen.value = false
      
      // Wait for drawer close animation
      setTimeout(() => {
        selectWalkAndOpenDrawer(walkId, navigate)
      }, 300) // Match animation duration
    } else {
      selectWalkAndOpenDrawer(walkId, navigate)
    }
  }
  
  /**
   * Helper function to select walk and open drawer
   */
  function selectWalkAndOpenDrawer(walkId, navigate) {
    // Update selected walk
    selectedWalk.value = walkId
    
    // Fetch walk data if needed
    const walkData = walksStore.getWalkById(walkId)
    
    if (walkData && navigate) {
      // Update route if navigation is enabled
      router.push({ 
        name: 'walk-detail', 
        params: { slug: walkData.slug || walkId } 
      })
    }
    
    // Open drawer with the new walk
    isDrawerOpen.value = true
    
    // Clear transitioning state
    setTimeout(() => {
      isTransitioning.value = false
    }, 300) // Match animation duration
  }
  
  /**
   * Clear selection and close drawer
   */
  function clearSelection() {
    if (!selectedWalk.value) return
    
    isDrawerOpen.value = false
    
    // Wait for drawer close animation before clearing selection
    setTimeout(() => {
      selectedWalk.value = null
      // Navigate to home route
      router.push({ name: 'home' })
    }, 300) // Match animation duration
  }
  
  /**
   * Handle drawer close
   */
  function handleDrawerClose() {
    isDrawerOpen.value = false
    
    // Clear selection after animation
    setTimeout(() => {
      clearSelection()
    }, 300) // Match animation duration
  }
  
  // Initialize from route
  initializeFromRoute()
  
  // Watch for route changes
  watch(
    () => route.params.slug,
    (newSlug) => {
      if (newSlug) {
        const walk = walksStore.walks.find(w => w.slug === newSlug)
        if (walk && selectedWalk.value !== walk.id) {
          handleWalkSelection(walk.id, false)
        }
      } else if (selectedWalk.value) {
        // Route changed away from walk detail
        clearSelection()
      }
    }
  )
  
  // Clean up on component unmount
  onBeforeUnmount(() => {
    // Cancel any pending API requests
    cancelAllRequests()
  })
  
  return {
    // State
    selectedWalk,
    isDrawerOpen,
    isTransitioning,
    
    // Computed
    selectedWalkData,
    walkCategories,
    
    // Methods
    handleWalkSelection,
    clearSelection,
    handleDrawerClose
  }
}
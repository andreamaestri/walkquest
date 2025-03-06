import { ref, onMounted, onBeforeUnmount } from 'vue'

export function usePortal() {
  const portalRootExists = ref(false)
  let observer = null

  // Check if portal root exists
  const checkPortalRoot = () => {
    const root = document.getElementById('portal-root')
    if (root) {
      portalRootExists.value = true
      
      // Disconnect observer once portal root is found to prevent memory leaks
      if (observer) {
        observer.disconnect()
        observer = null
      }
    }
    return !!root
  }

  onMounted(() => {
    try {
      // Initial check
      if (!checkPortalRoot()) {
        // Set up mutation observer to watch for portal root creation
        observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            if (mutation.type === 'childList') {
              if (checkPortalRoot()) break
            }
          }
        })
        
        observer.observe(document.body, { childList: true, subtree: true })
      }
    } catch (error) {
      console.error('Error setting up portal observer:', error)
    }
  })

  // Clean up observer on unmount
  onBeforeUnmount(() => {
    if (observer) {
      observer.disconnect()
      observer = null
    }
  })

  const portalRoot = () => portalRootExists.value

  return {
    portalRoot
  }
}

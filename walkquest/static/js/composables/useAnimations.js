import { ref, nextTick } from 'vue'

export function useAnimations() {
  const isAnimating = ref(false)
  
  /**
   * Slide a modal in from the bottom
   */
  async function slideInModal(elementRef) {
    if (!elementRef.value || isAnimating.value) return
    
    isAnimating.value = true
    
    // Set initial position
    elementRef.value.style.transform = 'translateY(100%)'
    elementRef.value.style.opacity = '0'
    elementRef.value.style.display = 'flex'
    
    // Force reflow to ensure the initial state is applied
    elementRef.value.offsetHeight
    
    // Set transition properties
    elementRef.value.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out'
    
    await nextTick()
    
    // Animate in
    elementRef.value.style.transform = 'translateY(0)'
    elementRef.value.style.opacity = '1'
    
    // Wait for animation to complete
    await new Promise(resolve => setTimeout(resolve, 300))
    isAnimating.value = false
  }
  
  /**
   * Slide a modal out to the bottom
   */
  async function slideOutModal(elementRef) {
    if (!elementRef.value || isAnimating.value) return
    
    isAnimating.value = true
    
    // Set transition properties
    elementRef.value.style.transition = 'transform 0.3s ease-in, opacity 0.3s ease-in'
    
    // Animate out
    elementRef.value.style.transform = 'translateY(100%)'
    elementRef.value.style.opacity = '0'
    
    // Wait for animation to complete
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Hide element after animation completes
    elementRef.value.style.display = 'none'
    isAnimating.value = false
  }
  
  /**
   * Fade in an element
   */
  async function fadeIn(elementRef, duration = 300) {
    if (!elementRef.value || isAnimating.value) return
    
    isAnimating.value = true
    
    // Set initial state
    elementRef.value.style.opacity = '0'
    elementRef.value.style.display = 'block'
    
    // Force reflow
    elementRef.value.offsetHeight
    
    // Set transition
    elementRef.value.style.transition = `opacity ${duration}ms ease-out`
    
    await nextTick()
    
    // Animate in
    elementRef.value.style.opacity = '1'
    
    // Wait for animation to complete
    await new Promise(resolve => setTimeout(resolve, duration))
    isAnimating.value = false
  }
  
  /**
   * Fade out an element
   */
  async function fadeOut(elementRef, duration = 300) {
    if (!elementRef.value || isAnimating.value) return
    
    isAnimating.value = true
    
    // Set transition
    elementRef.value.style.transition = `opacity ${duration}ms ease-in`
    
    // Animate out
    elementRef.value.style.opacity = '0'
    
    // Wait for animation to complete
    await new Promise(resolve => setTimeout(resolve, duration))
    
    // Hide element after animation completes
    elementRef.value.style.display = 'none'
    isAnimating.value = false
  }
  
  /**
   * Show a temporary toast notification
   */
  async function showToast(toastRef, message, duration = 3000) {
    if (!toastRef.value) return
    
    // Set message
    toastRef.value.message = message
    
    // Show toast
    await fadeIn(toastRef)
    
    // Auto-hide after duration
    setTimeout(async () => {
      await fadeOut(toastRef)
    }, duration)
  }

  return {
    isAnimating,
    slideInModal,
    slideOutModal,
    fadeIn,
    fadeOut,
    showToast
  }
}
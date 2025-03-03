import { ref, onMounted, onBeforeUnmount } from 'vue'

export function useScrollBehavior() {
  const isScrolling = ref(false)
  let scrollTimeout = null
  
  const handleScroll = (element, callback) => {
    if (!element) return () => {}
    
    const onScroll = () => {
      isScrolling.value = true
      
      // Clear the previous timeout
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
      
      // Set a new timeout
      scrollTimeout = setTimeout(() => {
        isScrolling.value = false
        if (callback) callback()
      }, 150)
    }
    
    element.addEventListener('scroll', onScroll, { passive: true })
    
    return () => {
      element.removeEventListener('scroll', onScroll)
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
    }
  }
  
  const preventScroll = (element) => {
    if (!element) return
    
    let startY
    
    const onTouchStart = (e) => {
      startY = e.touches[0].clientY
    }
    
    const onTouchMove = (e) => {
      if (!startY) return
      
      const currentY = e.touches[0].clientY
      const deltaY = currentY - startY
      
      // Check if we're at the boundaries
      const scrollTop = element.scrollTop
      const scrollHeight = element.scrollHeight
      const clientHeight = element.clientHeight
      
      // Prevent overscroll only at boundaries
      if ((scrollTop <= 0 && deltaY > 0) || 
          (scrollTop + clientHeight >= scrollHeight && deltaY < 0)) {
        e.preventDefault()
      }
    }
    
    element.addEventListener('touchstart', onTouchStart, { passive: true })
    element.addEventListener('touchmove', onTouchMove, { passive: false })
    
    return () => {
      element.removeEventListener('touchstart', onTouchStart)
      element.removeEventListener('touchmove', onTouchMove)
    }
  }
  
  return {
    isScrolling,
    handleScroll,
    preventScroll
  }
}
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

export function useVirtualScroll(options = {}) {
  const {
    itemHeight = 100,
    buffer = 5,
    containerRef = null
  } = options

  const scrollTop = ref(0)
  const containerHeight = ref(0)
  const items = ref([])

  const visibleItems = computed(() => {
    const start = Math.floor(scrollTop.value / itemHeight)
    const visibleCount = Math.ceil(containerHeight.value / itemHeight)
    const paddedStart = Math.max(0, start - buffer)
    const paddedEnd = Math.min(items.value.length, start + visibleCount + buffer)

    return {
      items: items.value.slice(paddedStart, paddedEnd).map((item, index) => ({
        item,
        index: paddedStart + index
      })),
      startIndex: paddedStart,
      style: {
        paddingTop: `${paddedStart * itemHeight}px`,
        paddingBottom: `${(items.value.length - paddedEnd) * itemHeight}px`
      }
    }
  })

  const handleScroll = (e) => {
    scrollTop.value = e.target.scrollTop
  }

  const updateContainerHeight = () => {
    if (containerRef?.value) {
      containerHeight.value = containerRef.value.clientHeight
    }
  }

  const setItems = (newItems) => {
    items.value = newItems || []
  }

  let resizeObserver = null

  onMounted(() => {
    if (containerRef?.value) {
      containerRef.value.addEventListener('scroll', handleScroll)
      
      // Set up ResizeObserver for dynamic container height updates
      resizeObserver = new ResizeObserver(updateContainerHeight)
      resizeObserver.observe(containerRef.value)
      
      // Initial height
      updateContainerHeight()
    }
  })

  onBeforeUnmount(() => {
    if (containerRef?.value) {
      containerRef.value.removeEventListener('scroll', handleScroll)
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
    }
  })

  return {
    visibleItems,
    setItems,
    updateContainerHeight
  }
}
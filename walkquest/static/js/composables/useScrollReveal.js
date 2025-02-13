import { ref, onMounted, onBeforeUnmount } from 'vue'

export function useScrollReveal() {
  const revealed = ref(new Set())
  let observer = null

  const observe = (element, index) => {
    if (!observer) return

    observer.observe(element)
    element.dataset.revealIndex = index
  }

  onMounted(() => {
    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const index = entry.target.dataset.revealIndex
          revealed.value.add(index)
          observer.unobserve(entry.target)
        }
      })
    }, {
      threshold: 0.1,
      rootMargin: '50px'
    })
  })

  onBeforeUnmount(() => {
    if (observer) {
      observer.disconnect()
    }
  })

  return {
    revealed,
    observe,
    isRevealed: (index) => revealed.value.has(index.toString())
  }
}
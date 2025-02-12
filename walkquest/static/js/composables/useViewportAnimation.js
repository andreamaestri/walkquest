import { ref, onMounted, onBeforeUnmount } from 'vue'
import { animate, inView } from 'motion'

export function useViewportAnimation() {
  const viewportRefs = ref(new Set())

  onMounted(() => {
    const cleanup = inView('.walk-item', ({ target }) => {
      // Skip if already revealed
      if (viewportRefs.value.has(target)) return

      viewportRefs.value.add(target)
      animate(target, {
        opacity: [0, 1],
        y: [50, 0],
        scale: [0.9, 1]
      }, {
        duration: 0.6,
        easing: [0.2, 0.8, 0.2, 1],
        delay: 0.1
      })
    }, {
      margin: "0px 0px -10% 0px"
    })

    onBeforeUnmount(() => cleanup())
  })

  return {
    viewportRefs
  }
}
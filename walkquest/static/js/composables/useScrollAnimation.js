import { inView } from 'motion'
import { onMounted, onUnmounted, ref } from 'vue'

export function useScrollAnimation() {
  const isInView = ref(false)
  let stopScrollTracking

  const setupScrollTracking = (el, options = {}) => {
    if (!el) return

    const {
      onEnter = () => {},
      onLeave = () => {},
      margin = '-20%',
      threshold = 0.2
    } = options

    onMounted(() => {
      stopScrollTracking = inView(el, () => {
        isInView.value = true
        onEnter()

        return () => {
          isInView.value = false
          onLeave()
        }
      }, { margin, threshold })
    })

    onUnmounted(() => {
      if (stopScrollTracking) {
        stopScrollTracking()
      }
    })

    return {
      isInView
    }
  }

  return {
    setupScrollTracking,
    isInView
  }
}
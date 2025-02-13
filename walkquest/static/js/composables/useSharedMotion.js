// filepath: /Users/andrea/walkquest/walkquest/composables/useSharedMotion.js
import { useMotion } from '@vueuse/motion'

export const defaultTransition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
  mass: 1
}

export const motionPresets = {
  pop: {
    initial: { scale: 1 },
    hover: {
      scale: 1.02,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 25
      }
    }
  },
  slideInBottom: {
    initial: { opacity: 0, y: 20 },
    enter: {
      opacity: 1,
      y: 0,
      transition: defaultTransition
    }
  },
  slideInRight: {
    initial: { opacity: 0, x: -20 },
    enter: {
      opacity: 1,
      x: 0,
      transition: defaultTransition
    }
  },
  slideInLeft: {
    initial: { opacity: 0, x: 20 },
    enter: {
      opacity: 1,
      x: 0,
      transition: defaultTransition
    }
  }
}

export const useSharedMotion = (element, preset) => {
  const motion = useMotion(element, {
    ...motionPresets[preset]
  })

  return motion
}

export default useSharedMotion
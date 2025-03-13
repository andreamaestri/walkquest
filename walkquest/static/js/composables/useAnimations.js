import { animate } from 'motion'

export function useAnimations() {
  // Modal animations
  function animateModalEntry(element) {
    return animate(element, {
      opacity: [0, 1],
      scale: [0.95, 1]
    }, { 
      duration: 0.2,
      easing: [0.2, 0, 0, 1] // M3 emphasized easing
    })
  }

  function animateModalExit(element, onComplete) {
    return animate(element, {
      opacity: [1, 0],
      scale: [1, 0.95]
    }, { 
      duration: 0.2,
      easing: [0.3, 0, 0.8, 0.15], // M3 emphasized-accelerate
      onComplete
    })
  }

  // Calendar animations
  function animateCalendarChange(element, direction = 'next') {
    const startX = direction === 'next' ? '20%' : '-20%'
    
    return animate(element, {
      x: [startX, '0%'],
      opacity: [0.5, 1]
    }, {
      duration: 0.3,
      easing: [0.2, 0, 0, 1]
    })
  }

  return {
    animateModalEntry,
    animateModalExit,
    animateCalendarChange
  }
}
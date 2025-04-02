import { animate } from 'motion-v'

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

  // Interface element animations
  function animateInterfaceElement(element, options = {}, onComplete) {
    const {
      type = "entry", // "entry" or "exit"
      direction = "vertical", // "vertical" or "horizontal"
      duration = 0.3,
      easing = type === "entry" ? [0.2, 0, 0.2, 1] : [0.4, 0, 1, 1],
      reverseDirection = false,
    } = options;

    const animation = {
      opacity: type === "entry" ? [0, 1] : [1, 0],
      scale: type === "entry" ? [0.95, 1] : [1, 0.95],
    };

    if (direction === "horizontal") {
      animation.x = type === "entry"
        ? [reverseDirection ? 100 : -100, 0]
        : [0, reverseDirection ? -100 : 100];
    } else {
      animation.y = type === "entry" ? [10, 0] : [0, 10];
    }

    return animate(element, animation, {
      duration,
      easing,
      onComplete
    });
  }

  // Animation configurations for various UI elements
  const animationConfigs = {
    dialog: {
      entry: {
        keyframes: { opacity: [0, 1], scale: [0.95, 1] },
        options: { duration: 0.25, easing: [0.2, 0, 0, 1] }
      },
      exit: {
        keyframes: { opacity: [1, 0], scale: [1, 0.95] },
        options: { duration: 0.2, easing: [0.4, 0, 1, 1] }
      }
    },
    drawer: {
      entry: {
        keyframes: { x: ['-100%', '0%'] },
        options: { duration: 0.3, easing: [0.2, 0, 0, 1] }
      },
      exit: {
        keyframes: { x: ['0%', '-100%'] },
        options: { duration: 0.25, easing: [0.4, 0, 1, 1] }
      }
    },
    bottomSheet: {
      entry: {
        keyframes: { y: ['100%', '0%'] },
        options: { duration: 0.35, easing: [0.2, 0, 0, 1] }
      },
      exit: {
        keyframes: { y: ['0%', '100%'] },
        options: { duration: 0.3, easing: [0.4, 0, 1, 1] }
      }
    }
  };

  return {
    animate,
    animateModalEntry,
    animateModalExit,
    animateCalendarChange,
    animateInterfaceElement,
    animationConfigs
  }
}
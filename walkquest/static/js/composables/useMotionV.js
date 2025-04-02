import { animate, stagger, inView } from 'motion-v';
import { ref } from 'vue';

/**
 * Composable for consistent Motion for Vue animations
 * Provides standardized animations across the application
 */
export function useMotionV() {
  // Initialize state
  const isReady = ref(false);

  /**
   * Initialize Motion and set ready state
   */
  function initialize() {
    isReady.value = true;
    // Dispatch ready event for components using regular motion
    document.dispatchEvent(new Event('motion:ready'));
    console.log('Motion for Vue initialized');
  }

  /**
   * Standardized animation function with good defaults
   */
  function animateElement(element, keyframes, options = {}) {
    if (!element) return { finished: Promise.resolve() };
    
    return animate(element, keyframes, {
      duration: 0.3,
      easing: [0.2, 0, 0.2, 1], // MD3 standard curve
      ...options
    });
  }

  /**
   * Stagger animations for multiple elements
   */
  function staggerElements(elements, keyframes, options = {}) {
    if (!elements || !elements.length) return { finished: Promise.resolve() };
    
    return animate(elements, keyframes, {
      duration: 0.3,
      easing: [0.2, 0, 0.2, 1],
      delay: stagger(0.05),
      ...options
    });
  }

  /**
   * Standard animations for common UI patterns
   */
  const animations = {
    // Card animations
    card: {
      enter: {
        keyframes: {
          opacity: [0, 1],
          y: [20, 0],
          scale: [0.95, 1]
        },
        options: {
          duration: 0.4,
          easing: [0.34, 1.56, 0.64, 1] // Spring-like curve
        }
      },
      exit: {
        keyframes: {
          opacity: [1, 0],
          y: [0, 20],
          scale: [1, 0.95]
        },
        options: {
          duration: 0.3,
          easing: [0.4, 0, 0.2, 1]
        }
      },
      hover: {
        keyframes: {
          y: -4,
          scale: 1.02,
          backgroundColor: 'rgb(243, 244, 246)', // Tailwind gray-100
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' // Tailwind shadow-md
        },
        options: {
          duration: 0.3,
          easing: [0.2, 0.8, 0.2, 1]
        }
      },
      press: {
        keyframes: {
          scale: 0.98
        },
        options: {
          duration: 0.1,
          easing: [0.4, 0, 0.2, 1]
        }
      }
    },
    // Modal animations
    modal: {
      enter: {
        keyframes: {
          opacity: [0, 1],
          scale: [0.95, 1],
          y: [20, 0]
        },
        options: {
          duration: 0.3,
          easing: [0.34, 1.56, 0.64, 1]
        }
      },
      exit: {
        keyframes: {
          opacity: [1, 0],
          scale: [1, 0.95],
          y: [0, 20]
        },
        options: {
          duration: 0.2,
          easing: [0.4, 0, 0.2, 1]
        }
      }
    },
    // Drawer animations
    drawer: {
      enter: {
        keyframes: {
          x: ['-100%', '0%'],
          opacity: [0, 1]
        },
        options: {
          duration: 0.3,
          easing: [0.05, 0.7, 0.1, 1.0] // MD3 emphasized decelerate
        }
      },
      exit: {
        keyframes: {
          x: ['0%', '-100%'],
          opacity: [1, 0]
        },
        options: {
          duration: 0.25,
          easing: [0.3, 0.0, 0.8, 0.15] // MD3 emphasized accelerate
        }
      }
    },
    // List item animations
    list: {
      enter: {
        keyframes: {
          opacity: [0, 1],
          y: [15, 0]
        },
        options: {
          duration: 0.3,
          easing: [0.2, 0, 0.2, 1],
          delay: stagger(0.05, { startDelay: 0.1 })
        }
      },
      exit: {
        keyframes: {
          opacity: [1, 0],
          y: [0, 15]
        },
        options: {
          duration: 0.2,
          easing: [0.4, 0, 0.2, 1],
          delay: stagger(0.05)
        }
      }
    }
  };

  // Material Design 3 easing curves
  const easings = {
    standard: [0.2, 0.0, 0, 1.0],
    standardAccelerate: [0.3, 0.0, 1.0, 1.0],
    standardDecelerate: [0.0, 0.0, 0.2, 1.0],
    emphasized: [0.2, 0.0, 0, 1.0],
    emphasizedAccelerate: [0.3, 0.0, 0.8, 0.15],
    emphasizedDecelerate: [0.05, 0.7, 0.1, 1.0],
    spring: [0.34, 1.56, 0.64, 1]
  };

  // Initialize on creation
  initialize();

  // Export all animation functions and utilities
  return {
    isReady,
    animate,
    stagger,
    inView,
    animateElement,
    staggerElements,
    animations,
    easings
  };
}
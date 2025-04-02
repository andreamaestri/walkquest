/**
 * Motion for Vue composable
 * This composable provides a consistent interface for using Motion for Vue throughout the application
 */
import { ref } from 'vue';

// Import necessary utilities from motion-v
// We're using the import notation that will allow tree-shaking
import { animate, stagger, inView } from 'motion-v';

export function useMotionV() {
  const isReady = ref(false);

  /**
   * Initialize Motion and set ready state
   */
  const initialize = () => {
    isReady.value = true;
    document.dispatchEvent(new Event('motion:ready'));
    console.log('Motion for Vue initialized');
  };

  /**
   * Animate an element with standard material design easing
   */
  const animateElement = (element, keyframes, options = {}) => {
    // Use motion-v's animate function with good defaults
    return animate(element, keyframes, {
      duration: 0.3,
      easing: [0.2, 0, 0.2, 1], // Material Design standard easing
      ...options
    });
  };

  /**
   * Apply staggered animations to multiple elements
   */
  const staggerElements = (elements, keyframes, options = {}) => {
    return animate(elements, keyframes, {
      delay: stagger(options.interval || 0.05, options),
      ...options
    });
  };

  /**
   * Create in-view animations easily
   */
  const createInViewAnimation = (element, animateInOptions, exitOptions = null) => {
    return inView(element, ({ target, isIntersecting }) => {
      if (isIntersecting) {
        animate(target, animateInOptions.keyframes, animateInOptions.options || {});
      } else if (exitOptions) {
        animate(target, exitOptions.keyframes, exitOptions.options || {});
      }
    });
  };

  /**
   * Hover animation utility that follows Material Design standards
   */
  const createHoverAnimation = (element, options = {}) => {
    const { 
      scale = true, 
      elevation = true,
      customEnter = null,
      customLeave = null
    } = options;

    element.addEventListener('mouseenter', () => {
      const keyframes = customEnter || {};
      
      if (scale && !customEnter) {
        keyframes.scale = 1.03;
      }
      
      if (elevation && !customEnter) {
        keyframes.boxShadow = 'var(--md-sys-elevation-2)';
      }
      
      animate(element, keyframes, { 
        duration: 0.2, 
        easing: [0.2, 0, 0, 1] 
      });
    });

    element.addEventListener('mouseleave', () => {
      const keyframes = customLeave || {};
      
      if (scale && !customLeave) {
        keyframes.scale = 1;
      }
      
      if (elevation && !customLeave) {
        keyframes.boxShadow = 'var(--md-sys-elevation-1)';
      }
      
      animate(element, keyframes, { 
        duration: 0.3, 
        easing: [0.2, 0, 0.2, 1] 
      });
    });
  };

  /**
   * Common animation presets
   */
  const presets = {
    fadeIn: {
      keyframes: { opacity: [0, 1] },
      options: { duration: 0.3, easing: [0.2, 0, 0.2, 1] }
    },
    fadeOut: {
      keyframes: { opacity: [1, 0] },
      options: { duration: 0.2, easing: [0.4, 0, 1, 1] }
    },
    slideIn: {
      keyframes: { y: [20, 0], opacity: [0, 1] },
      options: { duration: 0.35, easing: [0.2, 0, 0, 1] }
    },
    pulse: {
      keyframes: { scale: [1, 1.05, 1] },
      options: { duration: 0.4, easing: [0.34, 1.56, 0.64, 1] }
    }
  };

  return {
    animate,
    stagger,
    inView,
    isReady,
    initialize,
    animateElement,
    staggerElements,
    createInViewAnimation,
    createHoverAnimation,
    presets
  };
}
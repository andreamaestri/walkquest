/**
 * Provides scroll-based animation utilities using Motion for Vue's inView
 */
import { inView } from 'motion';
import { useMotionV } from './useMotionV';

export function useScrollAnimation() {
  const { animations, easings, stagger } = useMotionV();

  /**
   * Create scroll-triggered animation for an element
   * 
   * @param {HTMLElement|string} element - Element or selector to animate
   * @param {Object} keyframes - Animation keyframes
   * @param {Object} options - Animation options
   * @returns {Object} - Cleanup function
   */
  function createScrollAnimation(element, keyframes, options = {}) {
    if (!element) return { cleanup: () => {} };
    
    // Handle element or selector
    const targetElement = typeof element === 'string' 
      ? document.querySelector(element)
      : element;
      
    if (!targetElement) return { cleanup: () => {} };
    
    // Default options
    const defaultOptions = {
      threshold: 0.2,
      amount: 0.2,
      once: true,
      ...options
    };
    
    // Create animation
    return inView(targetElement, ({ target, isInView }) => {
      if (isInView || !defaultOptions.once) {
        target.animate(keyframes, {
          duration: 0.6,
          easing: easings.emphasizedDecelerate,
          fill: 'both',
          ...options
        });
      }
    }, defaultOptions);
  }
  
  /**
   * Animate elements when they enter the viewport
   * 
   * @param {Array|NodeList|string} elements - Elements or selector to animate
   * @param {string} animation - Animation name ('fadeIn', 'slideUp', etc.)
   * @param {Object} options - Animation options
   * @returns {Array} - Array of cleanup functions
   */
  function animateOnScroll(elements, animation = 'fadeIn', options = {}) {
    // Get elements if selector string is provided
    const targetElements = typeof elements === 'string'
      ? document.querySelectorAll(elements)
      : elements;
      
    if (!targetElements || !targetElements.length) return [];
    
    // Animation presets
    const animationPresets = {
      fadeIn: {
        keyframes: { opacity: [0, 1] },
        options: { duration: 0.5 }
      },
      slideUp: {
        keyframes: { opacity: [0, 1], y: [20, 0] },
        options: { duration: 0.6 }
      },
      slideLeft: {
        keyframes: { opacity: [0, 1], x: [20, 0] },
        options: { duration: 0.6 }
      },
      slideRight: {
        keyframes: { opacity: [0, 1], x: [-20, 0] },
        options: { duration: 0.6 }
      },
      scale: {
        keyframes: { opacity: [0, 1], scale: [0.9, 1] },
        options: { duration: 0.5 }
      },
      custom: options.keyframes ? {
        keyframes: options.keyframes,
        options: {}
      } : animationPresets.fadeIn
    };
    
    // Get animation preset or default to fadeIn
    const preset = animationPresets[animation] || animationPresets.fadeIn;
    
    // Apply stagger if multiple elements and stagger option is provided
    if (targetElements.length > 1 && options.stagger) {
      const staggerOptions = typeof options.stagger === 'number'
        ? { amount: options.stagger }
        : options.stagger;
        
      options.delay = stagger(staggerOptions.amount || 0.1, {
        start: staggerOptions.start || 0,
        from: staggerOptions.from || 'start'
      });
    }
    
    // Create animation for each element
    const cleanupFunctions = [];
    Array.from(targetElements).forEach((el, index) => {
      const cleanupFn = createScrollAnimation(el, preset.keyframes, {
        ...preset.options,
        ...options,
        delay: typeof options.delay === 'function' 
          ? options.delay(index, targetElements.length)
          : (options.delay || 0)
      });
      cleanupFunctions.push(cleanupFn);
    });
    
    return cleanupFunctions;
  }
  
  return {
    createScrollAnimation,
    animateOnScroll
  };
}
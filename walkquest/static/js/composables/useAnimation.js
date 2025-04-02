/**
 * Provides basic animation utilities using Motion
 * Enhanced with more consistent animation patterns
 */
import { animate } from 'motion';
import { useMotionV } from './useMotionV';

export function useAnimation() {
  const { 
    animations, 
    easings 
  } = useMotionV();

  /**
   * Animate an element with improved defaults
   * @param {HTMLElement} element - The element to animate
   * @param {Object} keyframes - Animation keyframes
   * @param {Object} options - Animation options
   * @returns {Animation} The animation instance
   */
  function animateElement(element, keyframes, options = {}) {
    if (!element) return { finished: Promise.resolve() };
    
    return animate(element, keyframes, {
      duration: 0.3,
      easing: easings.standard,
      ...options
    });
  }

  /**
   * Creates a fade animation
   * @param {HTMLElement} element - The element to animate
   * @param {string} direction - 'in' or 'out'
   * @param {Object} options - Animation options
   * @returns {Animation} The animation instance
   */
  function fade(element, direction = 'in', options = {}) {
    const keyframes = direction === 'in' 
      ? { opacity: [0, 1] } 
      : { opacity: [1, 0] };
    
    return animateElement(element, keyframes, {
      duration: direction === 'in' ? 0.3 : 0.2,
      ...options
    });
  }

  /**
   * Creates a slide animation
   * @param {HTMLElement} element - The element to animate
   * @param {string} direction - 'in' or 'out'
   * @param {string} from - 'top', 'right', 'bottom', 'left'
   * @param {Object} options - Animation options
   * @returns {Animation} The animation instance
   */
  function slide(element, direction = 'in', from = 'bottom', options = {}) {
    let propName, startValue, endValue;
    
    switch (from) {
      case 'top':
        propName = 'y';
        startValue = -20;
        break;
      case 'right':
        propName = 'x';
        startValue = 20;
        break;
      case 'bottom':
        propName = 'y';
        startValue = 20;
        break;
      case 'left':
        propName = 'x';
        startValue = -20;
        break;
      default:
        propName = 'y';
        startValue = 20;
    }
    
    const keyframes = {
      opacity: direction === 'in' ? [0, 1] : [1, 0],
      [propName]: direction === 'in' ? [startValue, 0] : [0, startValue]
    };
    
    return animateElement(element, keyframes, {
      duration: direction === 'in' ? 0.3 : 0.2,
      easing: direction === 'in' ? easings.emphasizedDecelerate : easings.emphasizedAccelerate,
      ...options
    });
  }

  /**
   * Creates a scale animation
   * @param {HTMLElement} element - The element to animate
   * @param {string} direction - 'in' or 'out'
   * @param {Object} options - Animation options
   * @returns {Animation} The animation instance
   */
  function scale(element, direction = 'in', options = {}) {
    const keyframes = {
      opacity: direction === 'in' ? [0, 1] : [1, 0],
      scale: direction === 'in' ? [0.95, 1] : [1, 0.95]
    };
    
    return animateElement(element, keyframes, {
      duration: direction === 'in' ? 0.35 : 0.25,
      easing: direction === 'in' ? easings.spring : easings.standard,
      ...options
    });
  }

  /**
   * Creates a press animation (for buttons/cards)
   * @param {HTMLElement} element - The element to animate
   * @param {Object} options - Animation options
   * @returns {Object} An object with press and release functions
   */
  function press(element, options = {}) {
    const defaultOptions = {
      scale: 0.97,
      duration: 0.1,
      easing: easings.standard,
      ...options
    };
    
    return {
      down: () => animateElement(element, { scale: defaultOptions.scale }, defaultOptions),
      up: () => animateElement(element, { scale: 1 }, { 
        ...defaultOptions, 
        duration: 0.2,
        easing: easings.spring 
      })
    };
  }

  return {
    animateElement,
    fade,
    slide,
    scale,
    press,
    animations,
    easings
  };
}

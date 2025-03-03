/**
 * Simple Animation Composable
 * Provides basic animation utilities using Motion One
 */
import { animate } from 'motion';

export function useAnimation() {
  /**
   * Animate an element with standard transitions
   * @param {HTMLElement} element - Element to animate
   * @param {Object} keyframes - Animation keyframes
   * @param {Object} options - Animation options
   * @returns {Promise} - Animation promise
   */
  const animateElement = (element, keyframes, options = {}) => {
    if (\!element) return Promise.resolve();
    
    return animate(element, keyframes, {
      duration: 0.3,
      easing: [0.2, 0, 0.2, 1], // Material Design standard easing
      ...options
    });
  };
  
  /**
   * Create a simple fade transition
   * @param {HTMLElement} element - Element to animate
   * @param {string} direction - 'in' or 'out'
   * @param {Object} options - Animation options
   * @returns {Promise} - Animation promise
   */
  const fade = (element, direction = 'in', options = {}) => {
    const opacity = direction === 'in' ? [0, 1] : [1, 0];
    return animateElement(element, { opacity }, options);
  };
  
  /**
   * Create a slide transition
   * @param {HTMLElement} element - Element to animate
   * @param {string} direction - 'in' or 'out'
   * @param {string} from - 'left', 'right', 'top', 'bottom'
   * @param {Object} options - Animation options
   * @returns {Promise} - Animation promise
   */
  const slide = (element, direction = 'in', from = 'left', options = {}) => {
    const distance = options.distance || 100;
    let keyframes = {};
    
    // Set initial values based on direction and from
    switch (from) {
      case 'left':
        keyframes.x = direction === 'in' ? [-distance, 0] : [0, -distance];
        break;
      case 'right':
        keyframes.x = direction === 'in' ? [distance, 0] : [0, distance];
        break;
      case 'top':
        keyframes.y = direction === 'in' ? [-distance, 0] : [0, -distance];
        break;
      case 'bottom':
        keyframes.y = direction === 'in' ? [distance, 0] : [0, distance];
        break;
    }
    
    // Add opacity animation
    keyframes.opacity = direction === 'in' ? [0, 1] : [1, 0];
    
    return animateElement(element, keyframes, options);
  };
  
  return {
    animateElement,
    fade,
    slide
  };
}

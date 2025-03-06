import { animate, spring } from 'motion';

/**
 * Composable for managing animations
 * Provides consistent animation patterns across components
 */
export function useAnimations() {
  /**
   * Animation configurations for different types of animations
   */
  const animationConfigs = {
    fluid: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
      mass: 0.8,
      restSpeed: 0.01,
      restDelta: 0.01
    },
    fluidFast: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
      mass: 0.6,
      restSpeed: 0.01,
      restDelta: 0.01
    },
    easeOut: {
      easing: [0.22, 1, 0.36, 1],
      duration: 0.6
    },
    md3Standard: {
      duration: 0.3,
      easing: [0.2, 0, 0.2, 1] // MD3 standard easing
    },
    md3Exit: {
      duration: 0.25,
      easing: [0.4, 0, 1, 1] // MD3 exit easing
    }
  };

  /**
   * Animate an interface element with consistent behavior
   * @param {HTMLElement} el - Element to animate
   * @param {Object} options - Animation options
   * @param {Function} onComplete - Callback when animation completes
   * @returns {Promise} - Animation promise
   */
  const animateInterfaceElement = async (el, options = {}, onComplete) => {
    const {
      type = "entry", // entry or exit
      direction = "vertical", // vertical or horizontal
      duration = 0.3,
      easing = type === "entry" ? [0.2, 0, 0.2, 1] : [0.4, 0, 1, 1],
      reverseDirection = false,
    } = options;

    if (!el) {
      if (onComplete) onComplete();
      return;
    }

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

    try {
      await animate(el, animation, {
        duration,
        easing,
      }).finished;
    } catch (error) {
      console.error("Animation error:", error);
    }
    
    if (onComplete) onComplete();
  };

  /**
   * Animate a drawer element with enhanced behavior
   * @param {HTMLElement} el - Element to animate
   * @param {Object} animation - Animation keyframes
   * @param {Object} config - Animation configuration
   * @returns {Promise} - Animation promise
   */
  const animateDrawerElement = async (el, animation, config = {}) => {
    if (!el) return;
    return animate(el, animation, {
      ...animationConfigs.fluid,
      ...config
    }).finished;
  };

  /**
   * Run a sequence of animations on multiple elements
   * @param {Array<HTMLElement>} elements - Elements to animate
   * @param {Array<Object>} animations - Animation configurations
   * @param {Function} onComplete - Callback when all animations complete
   * @returns {Promise} - Animation promise
   */
  const runAnimationSequence = async (elements, animations, onComplete) => {
    const promises = elements.map((el, i) => {
      if (!el) return Promise.resolve();
      return animate(
        el,
        animations[i].keyframes,
        {
          ...animationConfigs.fluid,
          ...animations[i].options,
          delay: (animations[i].options?.delay || 0) + (i * 0.05)
        }
      ).finished;
    });
    
    await Promise.all(promises);
    onComplete?.();
  };

  /**
   * Animate typography elements with special effects
   * @param {HTMLElement} container - Container with typography elements
   */
  const animateTypography = (container) => {
    if (!container) return;
    
    const typographyElements = container.querySelectorAll(
      '.m3-headline-small, .m3-title-medium, .m3-title-small'
    );
    
    typographyElements.forEach(el => {
      el.style.opacity = '0';
      animateDrawerElement(el, {
        letterSpacing: ['-2px', '0px'],
        opacity: [0, 1]
      }, {
        duration: 0.4,
        easing: 'ease-out'
      });
    });
  };

  /**
   * Animate content transition with fade and scale
   * @param {HTMLElement} el - Element to animate
   * @param {Function} done - Vue transition done callback
   */
  const animateContentTransition = async (el, done) => {
    await animate(
      el,
      {
        opacity: [0, 1],
        scale: [0.98, 1],
        y: [-10, 0],
      },
      {
        duration: 0.3,
        easing: [0.22, 1, 0.36, 1],
        onComplete: done,
      }
    ).finished;
  };

  /**
   * Animate details element open/close
   * @param {Event} event - Toggle event
   */
  const animateDetailsToggle = (event) => {
    const detail = event.target;
    const content = detail.querySelector('.details-content');
    
    if (!content) return;
    
    if (detail.open) {
      // Expand: Animate from 0 to content scrollHeight then clear explicit height
      content.style.height = '0px';
      content.style.overflow = 'hidden';
      const targetHeight = content.scrollHeight;
      
      animate(content, 
        { height: [0, targetHeight + 'px'] }, 
        { duration: 0.3, easing: 'ease-out' }
      ).then(() => {
        content.style.height = '';
        content.style.overflow = 'visible';
      });
    } else {
      // Collapse: Animate from current height to 0
      content.style.height = content.offsetHeight + 'px';
      content.style.overflow = 'hidden';
      
      animate(content, 
        { height: [content.offsetHeight + 'px', '0px'] },
        { duration: 0.3, easing: 'ease-in' }
      );
    }
  };

  /**
   * Animate a form element selection
   * @param {HTMLElement} element - Element to animate
   * @param {Boolean} wasSelected - Whether the element was previously selected
   * @returns {Object} - Animation instance
   */
  const animateSelection = (element, wasSelected) => {
    if (!element) return null;
    
    if (wasSelected) {
      // Deselected animation
      return animate(element, { 
        scale: [1, 0.95, 1],
        backgroundColor: [
          'rgb(var(--md-sys-color-secondary-container))',
          'rgb(var(--md-sys-color-surface-container))'
        ]
      }, {
        duration: 0.3,
        easing: [0.2, 0, 0.2, 1]
      });
    } else {
      // Selected animation
      return animate(element, { 
        scale: [1, 1.1, 1],
        backgroundColor: [
          'rgb(var(--md-sys-color-surface-container))',
          'rgb(var(--md-sys-color-secondary-container))'
        ]
      }, {
        duration: 0.3,
        easing: spring({ stiffness: 300, damping: 30 })
      });
    }
  };

  /**
   * Animate modal dialog entry
   * @param {HTMLElement} element - Element to animate
   * @returns {Object} - Animation instance
   */
  const animateModalEntry = (element) => {
    if (!element) return null;
    
    return animate(element, {
      opacity: [0, 1],
      y: ['100%', '0%']
    }, {
      duration: 0.3,
      easing: [0.2, 0, 0.2, 1]
    });
  };

  /**
   * Animate modal dialog exit
   * @param {HTMLElement} element - Element to animate
   * @param {Function} onComplete - Callback when animation completes
   * @returns {Object} - Animation instance
   */
  const animateModalExit = (element, onComplete) => {
    if (!element) return null;
    
    return animate(element, {
      opacity: [1, 0],
      y: ['0%', '100%']
    }, {
      duration: 0.2,
      easing: [0.4, 0, 1, 1],
      onComplete
    });
  };

  /**
   * Animate calendar month change
   * @param {HTMLElement} element - Calendar element
   * @param {String} direction - 'prev' or 'next'
   * @returns {Object} - Animation instance
   */
  const animateCalendarChange = (element, direction) => {
    if (!element) return null;
    
    return animate(element, {
      x: [direction === 'prev' ? '-20px' : '20px', '0px'],
      opacity: [0.8, 1]
    }, {
      duration: 0.2,
      easing: [0.2, 0, 0.2, 1]
    });
  };

  /**
   * Animate time unit change in time picker
   * @param {HTMLElement} element - Time unit element
   * @param {String} direction - 'up' or 'down'
   * @returns {Object} - Animation instance
   */
  const animateTimeUnitChange = (element, direction) => {
    if (!element) return null;
    
    return animate(element, {
      y: [direction === 'up' ? '10px' : '-10px', '0px'],
      opacity: [0.5, 1]
    }, {
      duration: 0.2,
      easing: [0.2, 0, 0.2, 1]
    });
  };

  return {
    animationConfigs,
    animateInterfaceElement,
    animateDrawerElement,
    runAnimationSequence,
    animateTypography,
    animateContentTransition,
    animateDetailsToggle,
    animateSelection,
    animateModalEntry,
    animateModalExit,
    animateCalendarChange,
    animateTimeUnitChange
  };
}
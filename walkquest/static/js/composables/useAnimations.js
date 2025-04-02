/**
 * Primary animation composable that combines both Motion and Motion-V capabilities
 */
import { animate as motionAnimate } from 'motion';
import { animate as motionVAnimate } from 'motion-v';
import { useMotionV } from './useMotionV';
import { useAnimation } from './useAnimation';
import { useScrollAnimation } from './useScrollAnimation';
import { ref, onMounted, onBeforeUnmount } from 'vue';

export function useAnimations() {
  // Get utilities from all animation composables
  const motionV = useMotionV();
  const motionAnimations = useAnimation();
  const scrollAnimations = useScrollAnimation();
  
  // Track ready state
  const isReady = ref(false);
  
  // Cleanup functions for scroll animations
  const cleanupFunctions = [];
  
  /**
   * Initialize animation system
   */
  function initialize() {
    isReady.value = true;
    console.log('Animation system initialized');
  }
  
  /**
   * Register a cleanup function for scroll animations
   */
  function registerCleanup(cleanupFn) {
    if (typeof cleanupFn === 'function') {
      cleanupFunctions.push(cleanupFn);
    } else if (Array.isArray(cleanupFn)) {
      cleanupFunctions.push(...cleanupFn);
    }
  }
  
  /**
   * Animate modal entry with standardized animation
   */
  function animateModalEntry(element) {
    return motionAnimations.animateElement(element, motionV.animations.modal.enter.keyframes, 
      motionV.animations.modal.enter.options);
  }
  
  /**
   * Animate modal exit with standardized animation
   */
  function animateModalExit(element) {
    return motionAnimations.animateElement(element, motionV.animations.modal.exit.keyframes, 
      motionV.animations.modal.exit.options);
  }
  
  /**
   * Animate time unit change for time pickers
   */
  function animateTimeUnitChange(element, direction = 'up') {
    const y = direction === 'up' ? [-20, 0] : [20, 0];
    const opacity = [0, 1];
    
    return motionAnimations.animateElement(element, { y, opacity }, {
      duration: 0.2,
      easing: motionV.easings.standard
    });
  }
  
  /**
   * Animate drawer content in
   */
  function animateDrawerContentIn(element) {
    if (!element) return { finished: Promise.resolve() };
    
    return motionAnimations.animateElement(element, {
      opacity: [0, 1],
      y: [10, 0]
    }, {
      duration: 0.35,
      easing: motionV.easings.emphasizedDecelerate
    });
  }
  
  /**
   * Animate drawer content out
   */
  function animateDrawerContentOut(element) {
    if (!element) return { finished: Promise.resolve() };
    
    return motionAnimations.animateElement(element, {
      opacity: [1, 0],
      y: [0, 10]
    }, {
      duration: 0.25,
      easing: motionV.easings.emphasizedAccelerate
    });
  }
  
  /**
   * Animate category click for drawer interactions
   */
  async function animateCategoryClick(category) {
    const categoryEl = document.querySelector(`.category-item[data-category="${category.slug}"]`);
    if (!categoryEl) return;
    
    await motionAnimations.animateElement(categoryEl, {
      scale: [1, 1.05, 1],
      backgroundColor: [
        'rgb(var(--md-sys-color-surface-container))',
        'rgb(var(--md-sys-color-secondary-container))',
        'rgb(var(--md-sys-color-surface-container))'
      ]
    }, {
      duration: 0.3,
      easing: motionV.easings.spring
    }).finished;
  }
  
  /**
   * Toggle animation for details elements
   */
  function toggleDetailsAnimation(event) {
    const details = event.target;
    const summary = details.querySelector('summary');
    const content = details.querySelector('.details-content');
    
    if (!summary || !content) return;
    
    if (details.open) {
      // Animating open
      motionAnimations.animateElement(content, {
        opacity: [0, 1],
        height: ['0px', 'auto']
      }, {
        duration: 0.3,
        easing: motionV.easings.emphasizedDecelerate
      });
      
      motionAnimations.animateElement(summary.querySelector('.toggle-icon'), {
        rotate: ['0deg', '180deg']
      }, {
        duration: 0.3,
        easing: motionV.easings.standard
      });
    } else {
      // Setup for animating closed - we need the starting height
      const startHeight = `${content.offsetHeight}px`;
      
      // Animating closed
      motionAnimations.animateElement(content, {
        opacity: [1, 0],
        height: [startHeight, '0px']
      }, {
        duration: 0.25,
        easing: motionV.easings.emphasizedAccelerate
      });
      
      motionAnimations.animateElement(summary.querySelector('.toggle-icon'), {
        rotate: ['180deg', '0deg']
      }, {
        duration: 0.25,
        easing: motionV.easings.standard
      });
    }
  }
  
  // Setup and cleanup
  onMounted(() => {
    initialize();
  });
  
  onBeforeUnmount(() => {
    // Clean up any registered animations
    cleanupFunctions.forEach(cleanup => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    });
  });
  
  return {
    // Motion-V specific
    motionV: motionVAnimate,
    // Regular Motion specific 
    motion: motionAnimate,
    // Combined utilities
    ...motionAnimations,
    ...scrollAnimations,
    // Modal animations
    animateModalEntry,
    animateModalExit,
    // Time picker animations
    animateTimeUnitChange,
    // Drawer animations
    animateDrawerContentIn,
    animateDrawerContentOut,
    // Category animations
    animateCategoryClick,
    // Details element animations
    toggleDetailsAnimation,
    // Animation presets
    animations: motionV.animations,
    easings: motionV.easings,
    // Ready state
    isReady,
    // Cleanup registration
    registerCleanup
  };
}
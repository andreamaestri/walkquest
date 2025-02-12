// Initialize all walk card animations
export const initializeHoverEffects = () => {
    if (!window.Motion) return;

    // Only apply hover effects to non-expanded cards
    const isCardExpandable = (element) => 
        !element.classList.contains('expanded');

    window.Motion.hover('.walk-item:not(.expanded)', (element) => {
        // Skip if card is expanded
        if (element.classList.contains('expanded')) return;

        // Get expandable content
        const expandableContent = element.querySelector('.expandable-content');
        if (!expandableContent) return;

        // Create and store enter animation with Tailwind-compatible values
        const enterAnimation = window.Motion.animate([
            [element, {
                y: -4,
                scale: 1.01,
                backgroundColor: 'rgb(243, 244, 246)', // Tailwind gray-100
                borderColor: 'rgb(59, 130, 246)', // Tailwind blue-500
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' // Tailwind shadow-md
            }, {
                duration: 0.3,
                easing: [0.2, 0.8, 0.2, 1]
            }],
            [element.querySelectorAll('.category-tag'), {
                scale: 1.05,
                backgroundColor: 'rgb(238, 242, 255)', // Tailwind indigo-50
                color: 'rgb(79, 70, 229)' // Tailwind indigo-600
            }, {
                delay: window.Motion.stagger(0.05),
                duration: 0.2,
                easing: [0.2, 0.8, 0.2, 1]
            }]
        ]);

        // Return leave animation with Tailwind-compatible values
        return () => {
            enterAnimation.stop();
            
            window.Motion.animate([
                [element, {
                    y: 0,
                    scale: 1,
                    backgroundColor: 'rgb(255, 255, 255)', // Tailwind white
                    borderColor: 'rgb(229, 231, 235)', // Tailwind gray-200
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' // Tailwind shadow-sm
                }, {
                    duration: 0.2,
                    easing: [0.4, 0, 0.2, 1]
                }],
                [element.querySelectorAll('.category-tag'), {
                    scale: 1,
                    backgroundColor: 'rgb(238, 242, 255)', // Tailwind indigo-50
                    color: 'rgb(99, 102, 241)' // Tailwind indigo-500
                }, {
                    duration: 0.2,
                    easing: [0.4, 0, 0.2, 1]
                }]
            ]);
        };
    });
};

// Initialize Motion for walk animations
export const initializeMotion = () => {
  if (!window.Motion) {
    console.warn('Motion library not found');
    return;
  }

  // Initialize hover effects for walk cards
  window.Motion.hover('.walk-item:not(.expanded)', (element) => {
    // Skip if card is expanded
    if (element.classList.contains('expanded')) return;

    // Create enter animation with Tailwind-compatible values
    const enterAnimation = window.Motion.animate([
      [element, {
        y: -4,
        scale: 1.01,
        backgroundColor: 'rgb(243, 244, 246)', // Tailwind gray-100
        borderColor: 'rgb(59, 130, 246)', // Tailwind blue-500
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' // Tailwind shadow-md
      }, {
        duration: 0.3,
        easing: [0.2, 0.8, 0.2, 1]
      }],
      [element.querySelectorAll('.category-tag'), {
        scale: 1.05,
        backgroundColor: 'rgb(238, 242, 255)', // Tailwind indigo-50
        color: 'rgb(79, 70, 229)' // Tailwind indigo-600
      }, {
        delay: window.Motion.stagger(0.05),
        duration: 0.2,
        easing: [0.2, 0.8, 0.2, 1]
      }]
    ]);

    // Return leave animation with Tailwind-compatible values
    return () => {
      enterAnimation.stop();
      
      window.Motion.animate([
        [element, {
          y: 0,
          scale: 1,
          backgroundColor: 'rgb(255, 255, 255)', // Tailwind white
          borderColor: 'rgb(229, 231, 235)', // Tailwind gray-200
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' // Tailwind shadow-sm
        }, {
          duration: 0.2,
          easing: [0.4, 0, 0.2, 1]
        }],
        [element.querySelectorAll('.category-tag'), {
          scale: 1,
          backgroundColor: 'rgb(238, 242, 255)', // Tailwind indigo-50
          color: 'rgb(99, 102, 241)' // Tailwind indigo-500
        }, {
          duration: 0.2,
          easing: [0.4, 0, 0.2, 1]
        }]
      ]);
    };
  });
};

// Export animation utilities
export const WalkAnimations = { 
    initializeHoverEffects,
    initializeMotion
};

// Initialize all animations when Motion is ready
window.addEventListener('motion:ready', () => {
    console.log('Initializing walk card animations');
    initializeHoverEffects();
    initializeMotion();
    console.log('Walk card animations initialized');
});

export default { initializeMotion };

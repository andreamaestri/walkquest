// Initialize all walk card animations
const initializeHoverEffects = () => {
    if (!window.Motion) return;

    // Only apply hover effects to non-expanded cards
    const isCardExpandable = (element) => 
        !element.classList.contains('expanded') && !element.hasAttribute('x-data');

    window.Motion.hover('.walk-item', (element) => {
        const expandableContent = element.querySelector('.expandable-content');
        if (!expandableContent) return;

        // Get natural height once
        expandableContent.style.height = 'auto';
        const targetHeight = expandableContent.offsetHeight;
        expandableContent.style.height = '0px';
        expandableContent.style.opacity = '0';

        // Create and store enter animation for cleanup
        const enterAnimation = window.Motion.animate([
            [element, {
                y: 0, // Start at initial position for smoother transition
                scale: 0.95, // Subtle scale-up
                opacity: 0, // Fade in
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.08)' // Softer shadow
            }, {
                duration: 0.3, // Slightly longer duration
                easing: [0.2, 0.4, 0.2, 1] // More natural easing
            }],
            [element, { // Second animation on the element for the final state
                scale: 1,
                willChange: 'transform',
                backfaceVisibility: 'hidden',
                transform: 'translateZ(0)',
            }, {
                duration: 0.2,
                easing: [0.4, 0, 0.2, 1]
            }],
            [expandableContent, {
                height: targetHeight,
                opacity: 1,
                marginTop: 16
            }, {
                duration: 0.3,
                easing: [0.2, 0.4, 0.2, 1] // Consistent easing
            }],
            [element.querySelectorAll('.category-tag'), {
                scale: 1.05, // Smaller scale
                backgroundColor: '#E0E7FF',
                color: '#4338CA'
            }, {
                delay: window.Motion.stagger(0.08), // Slightly longer stagger
                duration: 0.2,
                easing: [0.2, 0.4, 0.2, 1] // Consistent easing
            }]
        ]);

        // Return the leave handler function
        return () => {
            // Stop enter animation if it's still running
            enterAnimation.stop();

            // Start leave animation
            window.Motion.animate([
                [element, {
                    scale: 0.98, // Scale down slightly before disappearing
                    opacity: 0,
                    boxShadow: 'none'
                }, {
                    duration: 0.2,
                    easing: [0.4, 0, 0.2, 1] // Consistent easing
                }],
                [expandableContent, {
                    height: 0,
                    opacity: 0,
                    marginTop: 0
                }, {
                    duration: 0.2, // Match the element's fade out
                    easing: [0.4, 0, 0.2, 1] // Consistent easing
                }],
                [element.querySelectorAll('.category-tag'), {
                    scale: 0.95,  // Smaller scale down
                    backgroundColor: '#EEF2FF',
                    color: '#4F46E5'
                }, {
                    duration: 0.2,
                    easing: [0.4, 0, 0.2, 1] // Consistent easing
                }]
            ]);
        };
    });
};

// Initialize press animations for walk cards

// Export animation utilities to window
window.WalkAnimations = { 
    initializeHoverEffects
};

// Initialize all animations when Motion is ready
window.addEventListener('motion:ready', () => {
    console.log('Initializing walk card animations');
    initializeHoverEffects();
    console.log('Walk card animations initialized');
});

// Initialize all walk card animations
const initializeHoverEffects = () => {
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

        // Create and store enter animation
        const enterAnimation = window.Motion.animate([
            [element, {
                y: -4,
                scale: 1.01,
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                borderColor: 'rgba(96, 165, 250, 0.5)',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.08)'
            }, {
                duration: 0.3,
                easing: [0.2, 0.8, 0.2, 1]
            }],
            [element.querySelectorAll('.category-tag'), {
                scale: 1.05,
                backgroundColor: '#E0E7FF',
                color: '#4338CA'
            }, {
                delay: window.Motion.stagger(0.05),
                duration: 0.2,
                easing: [0.2, 0.8, 0.2, 1]
            }]
        ]);

        // Return leave animation
        return () => {
            enterAnimation.stop();
            
            window.Motion.animate([
                [element, {
                    y: 0,
                    scale: 1,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    boxShadow: 'none'
                }, {
                    duration: 0.2,
                    easing: [0.4, 0, 0.2, 1]
                }],
                [element.querySelectorAll('.category-tag'), {
                    scale: 1,
                    backgroundColor: '#EEF2FF',
                    color: '#4F46E5'
                }, {
                    duration: 0.2,
                    easing: [0.4, 0, 0.2, 1]
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

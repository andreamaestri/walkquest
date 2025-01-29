// Single definition of hover effect initialization
const initializeHoverEffects = () => {
    if (!window.Motion) return;

    // Use Motion's hover API as documented
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
                y: -8,
                scale: 1.02,
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }, {
                duration: 0.2,
                easing: [0.2, 0, 0, 1]
            }],
            [expandableContent, {
                height: targetHeight,
                opacity: 1,
                marginTop: 16
            }, {
                duration: 0.3,
                easing: [0.2, 0, 0, 1]
            }],
            [element.querySelectorAll('.category-tag'), {
                scale: 1.05,
                backgroundColor: '#E0E7FF',
                color: '#4338CA' 
            }, {
                delay: window.Motion.stagger(0.05),
                duration: 0.2
            }]
        ]);

        // Return the leave handler function
        return () => {
            // Stop enter animation if it's still running
            enterAnimation.stop();
            
            // Start leave animation
            window.Motion.animate([
                [element, {
                    y: 0,
                    scale: 1,
                    boxShadow: 'none'
                }, {
                    duration: 0.2,
                    easing: [0.4, 0, 0.2, 1]
                }],
                [expandableContent, {
                    height: 0,
                    opacity: 0,
                    marginTop: 0
                }, {
                    duration: 0.15,
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

// Export animation utilities to window
window.WalkAnimations = { initializeHoverEffects };
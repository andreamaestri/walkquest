// Optimize hover animations with motion best practices
const initializeHoverEffects = () => {
    if (!window.Motion) return;

    // Use Motion's hover API with configuration options
    window.Motion.hover('.walk-item', {
        // Set hover scale threshold
        scale: 1.02,
        // Add spring physics
        spring: {
            stiffness: 300,
            damping: 25
        },
        // Add enter/leave callbacks
        enter: (element) => {
            const expandableContent = element.querySelector('.expandable-content');
            if (!expandableContent) return;

            // Get natural height once
            expandableContent.style.height = 'auto';
            const targetHeight = expandableContent.offsetHeight;
            expandableContent.style.height = '0px';
            expandableContent.style.opacity = '0';

            return window.Motion.animate([
                [element, {
                    y: -8,
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
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
                    delay: window.Motion.stagger(0.05)
                }]
            ]);
        },
        leave: (element) => {
            const expandableContent = element.querySelector('.expandable-content');
            if (!expandableContent) return;

            return window.Motion.animate([
                [element, {
                    y: 0,
                    scale: 1,
                    boxShadow: 'none'
                }],
                [expandableContent, {
                    height: 0,
                    opacity: 0,
                    marginTop: 0
                }, {
                    duration: 0.2,
                    easing: [0.4, 0, 0.2, 1]
                }],
                [element.querySelectorAll('.category-tag'), {
                    scale: 1,
                    backgroundColor: '#EEF2FF',
                    color: '#4F46E5'
                }]
            ]);
        }
    });
};

// Export animation utilities
window.WalkAnimations = { initializeHoverEffects };
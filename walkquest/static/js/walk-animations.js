// Initialize all walk card animations
const initializeWalkCardAnimations = () => {
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

// Initialize press animations for walk cards
const initializePressHandlers = () => {
    if (!window.Motion) return;

    // Track currently expanded card
    let currentlyExpanded = null;

    window.Motion.press('.walk-item', (element) => {
        const expandableContent = element.querySelector('.expandable-content');
        if (!expandableContent) return;

        // Get Alpine component scope
        const scope = Alpine.getScope(element);
        
        // If there's a currently expanded card and it's not this one, collapse it
        if (currentlyExpanded && currentlyExpanded !== element) {
            const prevScope = Alpine.getScope(currentlyExpanded);
            prevScope.expanded = false;
            
            window.Motion.animate(currentlyExpanded, {
                scale: 1,
                y: 0
            }, { 
                duration: 0.2,
                easing: [0.4, 0, 0.2, 1]
            });

            window.Motion.animate(
                currentlyExpanded.querySelector('.expandable-content'),
                { height: 0, opacity: 0 },
                { duration: 0.2 }
            );
        }

        // Toggle current card
        scope.expanded = !scope.expanded;
        
        if (scope.expanded) {
            currentlyExpanded = element;
            
            // Expand animation
            window.Motion.animate(element, {
                scale: 1.02,
                y: -8
            }, { 
                duration: 0.3,
                easing: [0.2, 0, 0, 1]
            });

            // Get natural height
            expandableContent.style.height = 'auto';
            const targetHeight = expandableContent.offsetHeight;
            expandableContent.style.height = '0px';

            // Animate content expansion
            window.Motion.animate(
                expandableContent,
                { height: targetHeight, opacity: 1 },
                { duration: 0.3 }
            );

            // Update store for map interaction
            const walkData = Alpine.raw(scope.$data.walk);
            scope.$store.walks.setSelectedWalk(walkData);
        } else {
            currentlyExpanded = null;
            
            // Collapse animation
            window.Motion.animate(element, {
                scale: 1,
                y: 0
            }, { 
                duration: 0.2,
                easing: [0.4, 0, 0.2, 1]
            });

            window.Motion.animate(
                expandableContent,
                { height: 0, opacity: 0 },
                { duration: 0.2 }
            );
        }

        // Return cleanup function
        return () => {
            window.Motion.animate(element, { scale: 1 });
        };
    });
};

// Export animation utilities to window
window.WalkAnimations = { 
    initializeHoverEffects,
    initializePressHandlers
};

// Initialize all animations when Motion is ready
window.addEventListener('motion:ready', () => {
    initializeHoverEffects();
    initializePressHandlers();
});

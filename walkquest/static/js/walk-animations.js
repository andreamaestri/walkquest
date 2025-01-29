// Initialize all walk card animations
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

// Initialize press animations for walk cards
const initializePressHandlers = () => {
    if (!window.Motion) return;
    
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && 
                mutation.attributeName === 'class' && 
                mutation.target.classList.contains('walk-item')) {
                
                const element = mutation.target;
                const expanded = element.classList.contains('expanded');
                const expandableContent = element.querySelector('.expandable-content');
                
                if (!expandableContent) return;

                if (expanded) {
                    expandableContent.style.height = 'auto';
                    const targetHeight = expandableContent.offsetHeight;
                    expandableContent.style.height = '0px';

                    // Smoother expansion animation
                    window.Motion.animate(element, {
                        scale: [1, 1.01],
                        y: [0, -4],
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                    }, { 
                        duration: 0.3,
                        easing: [0.2, 0.8, 0.2, 1] // Custom spring-like easing
                    });

                    // Content expansion with improved flow
                    window.Motion.animate(
                        expandableContent,
                        { 
                            height: targetHeight,
                            opacity: 1,
                            marginTop: 12
                        },
                        { 
                            duration: 0.45,
                            easing: [0.2, 0.8, 0.2, 1]
                        }
                    );

                    // Staggered child animations
                    window.Motion.animate(
                        expandableContent.children,
                        { 
                            y: [8, 0],
                            opacity: [0, 1]
                        },
                        { 
                            duration: 0.25,
                            delay: window.Motion.stagger(0.03, { start: 0.1 }),
                            easing: [0.2, 0.8, 0.2, 1]
                        }
                    );
                } else {
                    // Quicker, smoother collapse
                    window.Motion.animate(element, {
                        scale: 1,
                        y: 0,
                        boxShadow: 'none'
                    }, { 
                        duration: 0.2,
                        easing: [0.3, 0, 0.2, 1]
                    });

                    window.Motion.animate(
                        expandableContent,
                        { 
                            height: 0,
                            opacity: 0,
                            marginTop: 0
                        },
                        { 
                            duration: 0.2,
                            easing: [0.3, 0, 0.2, 1]
                        }
                    );

                    window.Motion.animate(
                        expandableContent.children,
                        { opacity: 0 },
                        { 
                            duration: 0.15,
                            easing: [0.3, 0, 0.2, 1]
                        }
                    );
                }
            }
        });
    });

    // Set up observers for existing and future cards
    const setupCardObserver = (element) => {
        if (element.classList.contains('walk-item')) {
            observer.observe(element, {
                attributes: true,
                attributeFilter: ['class']
            });
        }
    };

    // Initialize existing cards
    document.querySelectorAll('.walk-item').forEach(setupCardObserver);

    // Watch for new cards
    const listObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) { // Element node
                    if (node.classList?.contains('walk-item')) {
                        setupCardObserver(node);
                    }
                    // Also check child nodes
                    node.querySelectorAll?.('.walk-item')?.forEach(setupCardObserver);
                }
            });
        });
    });

    // Start observing the container for new cards
    const container = document.querySelector('.walk-list') || document.body;
    listObserver.observe(container, {
        childList: true,
        subtree: true
    });
};

// Export animation utilities to window
window.WalkAnimations = { 
    initializeHoverEffects,
    initializePressHandlers
};

// Initialize all animations when Motion is ready
window.addEventListener('motion:ready', () => {
    console.log('Initializing walk card animations');
    initializeHoverEffects();
    initializePressHandlers();
    console.log('Walk card animations initialized');
});

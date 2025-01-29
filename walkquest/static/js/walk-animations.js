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
    console.log('Initializing press handlers');

    // Handle click animations for all cards
    document.addEventListener('click', (event) => {
        const walkItem = event.target.closest('.walk-item');
        if (!walkItem || event.target.closest('button')) return;

        const expandableContent = walkItem.querySelector('.expandable-content');
        if (!expandableContent) return;

        // Let Alpine handle the state change
        const expanded = walkItem.classList.contains('expanded');
        console.log('Card clicked, current expanded state:', expanded);

        // Animation will be handled by the mutation observer
        walkItem.classList.toggle('expanded');
    });

    // Watch for class changes that indicate expansion state
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const element = mutation.target;
                const expanded = element.classList.contains('expanded');
                const expandableContent = element.querySelector('.expandable-content');
                if (!expandableContent) return;

                console.log('Card expansion state changed:', expanded);

                if (expanded) {
                    // Get natural height
                    expandableContent.style.height = 'auto';
                    const targetHeight = expandableContent.offsetHeight;
                    expandableContent.style.height = '0px';

                    // Expand animation
                    window.Motion.animate(element, {
                        scale: 1.02,
                        y: -8,
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                    }, { 
                        duration: 0.3,
                        easing: [0.2, 0, 0, 1]
                    });

                    // Animate content expansion
                    window.Motion.animate(
                        expandableContent,
                        { height: targetHeight, opacity: 1 },
                        { duration: 0.3 }
                    );
                } else {
                    // Collapse animation
                    window.Motion.animate(element, {
                        scale: 1,
                        y: 0,
                        boxShadow: 'none'
                    }, { duration: 0.2 });

                    window.Motion.animate(
                        expandableContent,
                        { height: 0, opacity: 0 },
                        { duration: 0.2 }
                    );
                }
            }
        });
    });

    // Observe all current and future walk items
    document.querySelectorAll('.walk-item').forEach(walkItem => {
        observer.observe(walkItem, {
            attributes: true,
            attributeFilter: ['class']
        });
    });

    // Set up mutation observer to watch for new cards
    const listObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.classList?.contains('walk-item')) {
                    observer.observe(node, {
                        attributes: true,
                        attributeFilter: ['class']
                    });
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

// This file is kept for module organization, but component registration is handled in project.js
// Add any additional walkList-specific utilities or helper functions here if needed

// Example helper function for walk list animations
const createWalkListAnimations = (element, options = {}) => {
    if (!window.Motion) return;

    const defaultConfig = {
        initial: {
            opacity: [0, 1],
            y: [50, 0],
            scale: [0.95, 1]
        },
        timing: {
            delay: window.Motion.stagger(0.15),
            duration: 0.8,
            easing: [0.33, 1, 0.68, 1]
        }
    };

    const config = {
        initial: { ...defaultConfig.initial, ...options.initial },
        timing: { ...defaultConfig.timing, ...options.timing }
    };

    return window.Motion.animate(element, config.initial, config.timing);
};
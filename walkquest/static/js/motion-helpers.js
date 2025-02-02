// Wait for Motion to be available before defining helpers
function initializeMotionHelpers() {
    window.initMotionPress = (element, options = {}) => {
        if (!window.Motion?.press || !element) return null;

        const callbacks = {
            onPressStart: typeof options.onPressStart === 'function' ? options.onPressStart : () => {},
            onPressEnd: typeof options.onPressEnd === 'function' ? options.onPressEnd : () => {}
        };

        try {
            // Correct Motion.press API usage:
            // press(elementOrSelector, onPressStart, options)
            return window.Motion.press(
                element,
                (element, event) => {
                    callbacks.onPressStart();
                    return () => callbacks.onPressEnd();
                },
                {
                    scale: options.scale || 0.97,
                    duration: options.duration || 100
                }
            );
        } catch (error) {
            console.error('Motion press error:', error);
            return null;
        }
    };
}

// Initialize immediately if Motion is available, otherwise wait for ready event
if (window.Motion) {
    initializeMotionHelpers();
} else {
    window.addEventListener('motion:ready', initializeMotionHelpers, { once: true });
}

console.log('Motion helpers setup complete');

// Motion for Vue helpers
import { animate } from 'motion-v';

// Initialize Motion press helper for UI elements
export function initMotionPress(element, options = {}) {
    if (!element) return null;

    const { 
        scale = true,
        onPress = null,
        onRelease = null
    } = options;

    try {
        // Apply press effect with Motion for Vue
        element.addEventListener('mousedown', () => {
            if (scale) {
                animate(element, { scale: 0.95 }, {
                    duration: 0.2,
                    easing: [0.2, 0, 0, 1]
                });
            }

            if (onPress && typeof onPress === 'function') {
                onPress(element);
            }
        });

        element.addEventListener('mouseup', () => {
            if (scale) {
                animate(element, { scale: 1 }, {
                    duration: 0.3,
                    easing: [0.2, 0, 0.2, 1]
                });
            }

            if (onRelease && typeof onRelease === 'function') {
                onRelease(element);
            }
        });

        element.addEventListener('mouseleave', () => {
            if (scale) {
                animate(element, { scale: 1 }, {
                    duration: 0.3,
                    easing: [0.2, 0, 0.2, 1]
                });
            }
        });

        return {
            element,
            cleanup: () => {
                // Could add cleanup logic here if needed
            }
        };
    } catch (error) {
        console.error('Motion press error:', error);
        return null;
    }
}

// Initialize immediately if Motion is available, otherwise wait for ready event
export function initMotionHelpers() {
    window.initMotionPress = initMotionPress;
    
    // Dispatch ready event to let components know motion is available
    document.dispatchEvent(new Event('motion:ready'));
}

// Export motion utilities
export { animate };

console.log('Motion for Vue helpers setup complete');

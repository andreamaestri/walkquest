// Initialize configuration
export function initializeConfig() {
    try {
        // Get config from script tag
        const configScript = document.getElementById('config-data');
        if (!configScript) {
            throw new Error('Config data script tag not found');
        }

        // Parse config JSON
        const config = JSON.parse(configScript.textContent);
        console.log('Parsed config:', config);

        // Set up global config
        window.walkquestConfig = {
            ...config,
            csrfToken: document.querySelector('meta[name="csrf-token"]')?.content
        };

        console.log('Global config initialized:', window.walkquestConfig);
    } catch (error) {
        console.error('Failed to initialize config:', error);
    }
}

// Error handling for component initialization
export function initializeErrorHandling() {
    document.addEventListener('error:component-init', (event) => {
        console.error('Component initialization error:', event.detail);
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.classList.remove('hidden');
            errorContainer.textContent = 'Failed to initialize components. Please refresh the page.';
        }
    });
}

// Initialize animations
export function initializeAnimations() {
    if (window.WalkAnimations) {
        window.WalkAnimations.initializeHoverEffects();
    } else {
        window.addEventListener('motion:ready', () => {
            if (window.WalkAnimations) {
                window.WalkAnimations.initializeHoverEffects();
            }
        });
    }
}

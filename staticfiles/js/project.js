// Initialize configuration
function initializeConfig() {
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

// Initialize services and components
document.addEventListener('DOMContentLoaded', () => {
    // Initialize config first
    initializeConfig();

    // Initialize API service
    if (window.ApiService?.init) {
        window.ApiService.init();
        console.log('ApiService initialized');
    } else {
        console.error('ApiService not found - check script loading order');
    }

    // Initialize animations
    if (window.WalkAnimations) {
        window.WalkAnimations.initializeHoverEffects();
    } else {
        window.addEventListener('motion:ready', () => {
            if (window.WalkAnimations) {
                window.WalkAnimations.initializeHoverEffects();
            }
        });
    }

    // Error handling for component initialization
    document.addEventListener('error:component-init', (event) => {
        console.error('Component initialization error:', event.detail);
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.classList.remove('hidden');
            errorContainer.textContent = 'Failed to initialize components. Please refresh the page.';
        }
    });
});

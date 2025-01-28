// Application defaults
const DEFAULT_CONFIG = {
    map: {
        style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
        defaultCenter: [-4.85, 50.4],
        defaultZoom: 9.5,
        markerColors: {
            default: '#FF0000',
            selected: '#00FF00',
            favorite: '#FFD700'
        }
    },
    filters: {
        categories: true,
        features: true,
        distance: true
    }
};

document.addEventListener('alpine:init', () => {
    // Set up global config within Alpine lifecycle
    window.walkquestConfig = {
        ...DEFAULT_CONFIG,
        csrfToken: document.querySelector('meta[name="csrf-token"]')?.content
    };

    // Initialize ApiService within Alpine lifecycle
    if (window.ApiService?.init) {
        window.ApiService.init();
    } else {
        console.error('ApiService not found - check script loading order');
    }
});

document.addEventListener('DOMContentLoaded', () => {
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

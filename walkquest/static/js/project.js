import { api } from './services.js';
import { initializeAlpineStore, registerAlpineDirectives } from './alpine-components.js';
import { walkInterface } from './components/walkInterface.js';

// Default configuration fallback
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

// Initialize core dependencies
function initializeDependencies() {
    return new Promise((resolve, reject) => {
        try {
            // Check for required dependencies
            if (typeof window._ === 'undefined') {
                throw new Error('Lodash is required but not loaded');
            }
            if (typeof window.dayjs === 'undefined') {
                throw new Error('Day.js is required but not loaded');
            }

            // Initialize dayjs plugins
            if (window.dayjs_plugin_relativeTime) {
                window.dayjs.extend(window.dayjs_plugin_relativeTime);
            }
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

// Initialize Alpine.js components and store
function initializeAlpine(Alpine) {
    // Register walkInterface component
    Alpine.data('walkInterface', walkInterface);

    // Initialize store
    Alpine.store('app', initializeAlpineStore());

    // Register custom directives
    registerAlpineDirectives(Alpine);

    console.log('Alpine.js initialization completed');
}

// Wait for Alpine to be ready
document.addEventListener('alpine:init', async () => {
    try {
        // Initialize dependencies first
        await initializeDependencies();

        // Get Alpine from window and initialize
        initializeAlpine(window.Alpine);
    } catch (error) {
        console.error('Alpine initialization error:', error);
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.classList.remove('hidden');
            errorContainer.textContent = 'Application initialization failed. Please refresh the page.';
        }
    }
});

// Handle post-initialization tasks
document.addEventListener('alpine:initialized', () => {
    try {
        // Initialize dayjs relative time plugin if needed
        if (window.dayjs && !window.dayjs().fromNow) {
            window.dayjs.extend(window.dayjs_plugin_relativeTime);
        }
    } catch (error) {
        console.error('Post-initialization error:', error);
    }
});

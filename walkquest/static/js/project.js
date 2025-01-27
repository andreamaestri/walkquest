import { api } from './services.js';
import { initializeAlpineStore, registerAlpineDirectives } from './alpine-components.js';
import './components/walkInterface.js';

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
    } catch (error) {
        console.error('Dependencies initialization error:', error);
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.classList.remove('hidden');
            errorContainer.textContent = 'Application initialization failed. Please refresh the page.';
        }
    }
}

// Initialize the application
document.addEventListener('alpine:init', () => {
    try {
        // Initialize dependencies first
        initializeDependencies();

        // Initialize store
        window.Alpine.store('app', initializeAlpineStore());

        // Register custom directives
        registerAlpineDirectives(window.Alpine);

        console.log('Project initialization completed');
    } catch (error) {
        console.error('Initialization error:', error);
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.classList.remove('hidden');
            errorContainer.textContent = 'Application initialization failed. Please refresh the page.';
        }
    }
});

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

// Check for required dependencies
const checkDependencies = () => {
    if (typeof window._ === 'undefined') {
        throw new Error('Lodash is required but not loaded');
    }
    if (typeof window.dayjs === 'undefined') {
        throw new Error('Day.js is required but not loaded');
    }
};

// Initialize Alpine.js components and store
document.addEventListener('alpine:init', () => {
    try {
        checkDependencies();
        // Register walkInterface component
        Alpine.data('walkInterface', () => walkInterface());
        // Initialize store
        Alpine.store('app', initializeAlpineStore());
        // Register custom directives
        registerAlpineDirectives(Alpine);
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
        // Initialize dayjs relative time plugin
        if (window.dayjs) {
            window.dayjs.extend(window.dayjs_plugin_relativeTime);
        }
    } catch (error) {
        console.error('Post-initialization error:', error);
    }
});
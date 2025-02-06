// Import npm packages
import Alpine from 'alpinejs';
import intersect from '@alpinejs/intersect';
import morph from '@alpinejs/morph';
import 'htmx.org';
import "iconify-icon";

// Attach to window if needed
window.Alpine = Alpine;

// Initialize Alpine plugins
Alpine.plugin(intersect);
Alpine.plugin(morph);

// Import other modules in order
import './motion-helpers.js';
import './project.js';
import './walkCardMixin.js';
import './walk-animations.js';
import './custom-layer-handler.js';

// Add component definitions
const loading = () => ({
    get loadingStates() {
        return Alpine.store('ui').loadingStates;
    },
    init() {
        // Initialize loading states if they are not already initialized
        if (!Alpine.store('ui').loadingStates || Alpine.store('ui').loadingStates.length === 0) {
            Alpine.store('ui').loadingStates = [
                { path: '/api/walks', loading: false },
                { path: '/api/map', loading: false }
            ];
        }
    }
});

const mobileMenu = () => ({
    isOpen: false,
    toggle() {
        this.isOpen = !this.isOpen;
    }
});

const walkInterface = () => ({
    ...Alpine.store('ui'),
    walks: [],
    loading: false,
    init() {
        // Initialize the walk interface
        console.log('Walk interface initialized');
        this.walks = Alpine.store('walks').items;
    },
    handleWalkSelection(walk) {
        Alpine.store('walks').selectedWalk = walk;
    },
    fetchWalks() {
        this.loading = true;
        // Implement walk fetching logic
        console.log('Fetching walks with query:', this.searchQuery);
    }
});

// Register Alpine components and stores
document.addEventListener('alpine:init', () => {
    // Register stores first
    Alpine.store('walks', { 
        selectedWalk: null,
        loading: false,
        items: []  
    });
    
    Alpine.store('globals', {
        fullscreen: false
    });
    
    Alpine.store('ui', { 
        showSidebar: false,
        searchQuery: '',
        error: null,
        isLoading: false,
        loadingStates: [], 
        isMapLoading: false,
        updateLoadingState(path, isLoading) {
            const states = this.loadingStates || [];
            this.loadingStates = states.map(state => 
                state.path === path ? { ...state, loading: isLoading } : state
            );
        }
    });

    // Then register components
    Alpine.data('loading', loading);
    Alpine.data('mobileMenu', mobileMenu);
    Alpine.data('walkInterface', walkInterface);
    Alpine.data('globalState', () => ({
        ...Alpine.store('ui'),
        ...Alpine.store('walks'),
        ...Alpine.store('globals'),
        get walks() { return Alpine.store('walks').items; }
    }));
});

// Initialize Alpine
Alpine.start();

// Initialize ApiService
import { ApiService } from './services.js';
window.ApiService = ApiService;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ApiService.init());
} else {
    ApiService.init();
}

// Initialize Motion
window.addEventListener('DOMContentLoaded', () => {
    window.dispatchEvent(new Event('motion:ready'));
    console.log('Motion initialized');
});
// Default state values for Alpine.js stores and components
export const defaultState = {
    ui: {
        showSidebar: false,
        searchQuery: '',
        error: null,
        isLoading: false,
        mapLoading: false,
        loadingStates: {
            path: false,
            search: false,
            walks: new Set()
        }
    },
    walks: {
        selectedWalk: null,
        selectedWalkId: null,
        loading: false,
        items: []
    },
    globals: {
        fullscreen: false,
        mobileMenu: {
            isOpen: false
        }
    }
};

// Helper function to merge component defaults with instance state
export function withDefaults(component, defaults = {}) {
    return {
        ...defaults,
        ...component,
        init() {
            // Initialize with default values first
            Object.assign(this, defaults);
            // Then call the component's init if it exists
            if (typeof component.init === 'function') {
                component.init.call(this);
            }
        }
    };
}
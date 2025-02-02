document.addEventListener('alpine:init', () => {
    // Initialize global store with all required properties
    Alpine.store('globals', {
        // Mobile menu state with complete implementation
        mobileMenu: {
            isOpen: false,
            toggleMenu() {
                this.isOpen = !this.isOpen;
            }
        },
        
        // Legacy properties for backward compatibility
        isOpen: false,
        toggleMenu() {
            this.mobileMenu.toggleMenu();
            this.isOpen = this.mobileMenu.isOpen;
        },

        // Loading state with complete implementation
        loading: {
            show: false,
            setShow(value) {
                this.show = value;
                // Trigger events for component sync
                window.dispatchEvent(new Event(value ? 'loading:show' : 'loading:hide'));
            }
        },
        show: false,

        // Global state properties with defaults
        showSidebar: window.localStorage.getItem('sidebar') === 'true',
        searchQuery: '',
        error: null,
        isLoading: false,
        isLoadingMore: false,
        hasMore: true,
        page: 1,
        
        // Loading states
        loadingStates: {
            map: false,
            path: false
        },
        isMapLoading: true,
        map: null,
        
        // Store reference getters with safe fallbacks
        get store() {
            return Alpine.store('walks') || {};
        },
        
        get selectedWalk() {
            return Alpine.store('walks')?.selectedWalk || null;
        },
        
        get pendingFavorites() {
            return Alpine.store('walks')?.pendingFavorites || new Set();
        },
        
        // Walk interface with safe defaults
        walkInterface: {
            init() {
                return undefined;
            },
            handleWalkSelection(detail) {
                const store = Alpine.store('walks');
                if (store?.setSelectedWalk) {
                    store.setSelectedWalk(detail);
                }
            }
        },

        // Helper methods with safe checks
        isPending(walkId) {
            const store = Alpine.store('walks');
            return store?.isPending ? store.isPending(walkId) : false;
        },
        
        // Safe initialization
        init() {
            console.log('Globals store initialized');
            
            // Initialize walks store if needed
            if (!Alpine.store('walks')) {
                Alpine.store('walks', {
                    selectedWalk: null,
                    pendingFavorites: new Set()
                });
            }

            // Initialize walkInterface if provided
            if (this.walkInterface?.init) {
                this.walkInterface.init();
            }
        }
    });

    // Log successful initialization
    console.log('Alpine.js global store initialized:', Alpine.store('globals'));
});

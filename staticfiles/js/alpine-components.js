// Define component functions immediately in global scope
(function() {
    // Mobile menu component
    window.mobileMenu = function() {
        return {
            isOpen: false,
            toggleMenu() {
                this.isOpen = !this.isOpen;
                const globals = Alpine.store('globals');
                if (globals) {
                    globals.mobileMenu.isOpen = this.isOpen;
                    globals.isOpen = this.isOpen;
                }
            }
        };
    };

    // Loading component
    window.loading = function() {
        return {
            show: false,
            init() {
                const globals = Alpine.store('globals');
                if (globals?.loading) {
                    this.show = globals.loading.show;
                }

                window.addEventListener('loading:show', () => {
                    this.show = true;
                    const globals = Alpine.store('globals');
                    if (globals?.loading) globals.loading.show = true;
                });
                
                window.addEventListener('loading:hide', () => {
                    this.show = false;
                    const globals = Alpine.store('globals');
                    if (globals?.loading) globals.loading.show = false;
                });
            }
        };
    };

    // Walk interface component
    window.walkInterface = function() {
        return {
            walks: [],
            searchQuery: '',
            showSidebar: window.localStorage.getItem('sidebar') === 'true',
            isMapLoading: true,
            error: null,
            loadingStates: { map: false, path: false },
            map: null,
            markers: new Map(),
            markerCache: new Map(),
            hasMore: true,
            page: 1,
            
            init() {
                console.group('WalkInterface Initialization');
                try {
                    // Sync with global store
                    const globals = Alpine.store('globals');
                    if (globals?.walkInterface) {
                        Object.assign(this, globals.walkInterface);
                    }
                    
                    // Initialize walks store if needed
                    if (!Alpine.store('walks')) {
                        Alpine.store('walks', {
                            selectedWalk: null,
                            pendingFavorites: new Set()
                        });
                    }
                    
                    // Add walk selection listener
                    window.addEventListener('walk:selected', (event) => {
                        if (event.detail) {
                            this.handleWalkSelection(event.detail);
                        }
                    });
                    
                    console.log('WalkInterface initialized');
                } catch (error) {
                    console.error('WalkInterface initialization failed:', error);
                    this.error = 'Failed to initialize interface';
                } finally {
                    console.groupEnd();
                }
            },

            handleWalkSelection(detail) {
                if (!detail) return;
                
                const store = Alpine.store('walks');
                if (store) {
                    store.setSelectedWalk(detail);
                }
            }
        };
    };
})();

// Initialize Alpine.js stores and components
document.addEventListener('alpine:init', () => {
    // Initialize walks store first
    Alpine.store('walks', {
        selectedWalk: null,
        pendingFavorites: new Set(),
        loading: false,
        progress: 0,
        
        setSelectedWalk(walk) {
            this.stopLoading();
            this.progress = 0;
            this.selectedWalk = walk;
            
            if (walk) {
                this.startLoading();
                this.setProgress(20);
            }
        },
        
        setProgress(value) {
            this.progress = Math.min(100, Math.max(0, value));
            if (this.progress === 100) {
                setTimeout(() => this.stopLoading(), 200);
            }
        },
        
        startLoading() {
            this.loading = true;
        },
        
        stopLoading() {
            this.loading = false;
        },
        
        togglePendingFavorite(walkId) {
            if (this.pendingFavorites.has(walkId)) {
                this.pendingFavorites.delete(walkId);
            } else {
                this.pendingFavorites.add(walkId);
            }
        },
        
        isPending(walkId) {
            return this.pendingFavorites.has(walkId);
        }
    });

    // Register components
    Alpine.data('loading', window.loading);
    Alpine.data('mobileMenu', window.mobileMenu);
    Alpine.data('walkInterface', window.walkInterface);

    // Backward compatibility
    window.adjustScroll = function(element) {
        const walkInterface = document.querySelector('[x-data="walkInterface"]')?.__x?.Alpine;
        if (walkInterface) {
            walkInterface.$data.ensureInView(element);
        }
    };

    console.log('Alpine.js initialization complete:', {
        store: Alpine.store('walks'),
        components: {
            walkInterface: window.walkInterface,
            mobileMenu: window.mobileMenu,
            loading: window.loading
        }
    });
});

// Initialize Alpine.js when ready
if (window.Alpine) {
    initializeComponents();
} else {
    document.addEventListener('alpine:init', initializeComponents);
}

function initializeComponents() {
    console.log('Initializing Alpine.js components...');

    // Initialize store first
    Alpine.store('walks', {
        selectedWalk: null,
        pendingFavorites: new Set(),
        setSelectedWalk(walk) {
            this.selectedWalk = walk;
            console.log('Selected walk updated:', walk?.walk_name);
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
    Alpine.data('mobileMenu', mobileMenu);
    Alpine.data('loading', loading);
    Alpine.data('walkInterface', walkInterface);
}

function mobileMenu() {
    return {
        isOpen: false,
        toggleMenu() {
            this.isOpen = !this.isOpen;
        }
    };
}

function loading() {
    return {
        show: false,
        init() {
            // Watch for loading events
            window.addEventListener('loading:show', () => this.show = true);
            window.addEventListener('loading:hide', () => this.show = false);
        }
    };
}

function walkInterface() {
    return {
        // Component state
        walks: [],
        searchQuery: "",
        showSidebar: window.localStorage.getItem('sidebar') === 'true',
        isMapLoading: true,
        isLoading: false,
        isLoadingMore: false,
        hasMore: true,
        page: 1,
        map: null,
        markers: new Map(),
        error: null,

        // Initialize all data
        initializeData() {
            const walksData = document.getElementById('walks-data');
            if (!walksData) return;
            const initialData = JSON.parse(walksData.textContent);
            this.walks = initialData.walks || [];
            this.hasMore = initialData.hasMore || false;
        },

        init() {
            console.log('Initializing walkInterface...');
            this.initializeData();
            this.initializeMap();
        },

        // Map initialization
        async initializeMap() {
            const configScript = document.getElementById('config-data');
            if (!configScript) {
                console.error('Config data script tag not found');
                this.error = 'Configuration not found';
                this.isMapLoading = false;
                return;
            }

            try {
                const config = JSON.parse(configScript.textContent);
                if (!config.mapboxToken) {
                    throw new Error('Mapbox token not found in config');
                }

                mapboxgl.accessToken = config.mapboxToken;
                
                this.map = new mapboxgl.Map({
                    container: this.$refs.map,
                    style: config.map?.style || 'mapbox://styles/mapbox/streets-v12',
                    center: config.map?.defaultCenter || [-4.85, 50.4],
                    zoom: config.map?.defaultZoom || 9.5,
                    preserveDrawingBuffer: true
                });

                this.map.on('load', () => {
                    console.log('Map loaded successfully');
                    this.isMapLoading = false;
                    this.map.resize();
                });

                this.map.addControl(new mapboxgl.NavigationControl(), 'top-left');

                // Handle map errors
                this.map.on('error', (e) => {
                    console.error('Map error:', e);
                    this.error = 'Map failed to load';
                    this.isMapLoading = false;
                });
            } catch (error) {
                console.error('Failed to initialize map:', error);
                this.error = error.message;
                this.isMapLoading = false;
            }
        },

        // Walks data management
        async fetchWalks() {
            if (!window.ApiService?.filterWalks) {
                console.error('ApiService.filterWalks not available');
                this.error = 'API service not available';
                return;
            }

            this.isLoading = true;
            window.dispatchEvent(new Event('loading:show'));

            try {
                const response = await window.ApiService.filterWalks({
                    search: this.searchQuery,
                    page: 1,
                    page_size: 10
                });
                
                this.walks = response.walks || [];
                this.hasMore = (response.walks || []).length >= 10;
                this.page = 1;
                this.error = null;
            } catch (err) {
                console.error('Failed to fetch walks:', err);
                this.error = 'Failed to load walks. Please try again.';
            } finally {
                this.isLoading = false;
                window.dispatchEvent(new Event('loading:hide'));
            }
        },

        async loadMore() {
            if (this.isLoadingMore || !this.hasMore) return;
            
            this.isLoadingMore = true;
            const nextPage = this.page + 1;

            try {
                const response = await window.ApiService.filterWalks({
                    search: this.searchQuery,
                    page: nextPage,
                    page_size: 10
                });
                
                const newWalks = response.walks || [];
                this.walks = [...this.walks, ...newWalks];
                this.hasMore = newWalks.length >= 10;
                this.page = nextPage;
                this.error = null;
            } catch (err) {
                console.error('Failed to load more walks:', err);
                this.error = 'Failed to load more walks. Please try again.';
            } finally {
                this.isLoadingMore = false;
            }
        },

        // Favorite handling
        async toggleFavorite(walkId) {
            try {
                const result = await window.ApiService.toggleFavorite(walkId);
                const walk = this.walks.find(w => w.id === walkId);
                if (walk) walk.is_favorite = result.is_favorite;
            } catch (error) {
                console.error('Failed to toggle favorite:', error);
                this.error = 'Failed to update favorite status';
            }
        },

        // Event handlers
        handleWalkSelection(detail) {
            if (!detail) return;
            
            // Update store and UI
            this.$store.walks.setSelectedWalk(detail);
            this.$nextTick(() => {
                this.showSidebar = true;
                window.localStorage.setItem('sidebar', 'true');
                
                // Update map view if coordinates available
                if (this.map && detail.longitude && detail.latitude) {
                    this.map.flyTo({
                        center: [detail.longitude, detail.latitude],
                        zoom: 14,
                        essential: true,
                        padding: { right: 384 } // Account for sidebar width
                    });
                }
            });
        }
    };
}

// Add debug initialization event listener
window.addEventListener('alpine:initialized', () => {
    console.log('Alpine.js ready:', {
        store: Alpine.store('walks'),
        walkInterface: Alpine.data('walkInterface'),
        walkList: Alpine.data('walkList'),
        mobileMenu: Alpine.data('mobileMenu'),
        loading: Alpine.data('loading')
    });
});


// Debug initialization
window.addEventListener('alpine:initialized', () => {
    console.log('Alpine.js ready:', {
        store: Alpine.store('walks'),
        walkInterface: Alpine.data('walkInterface'),
        walkList: Alpine.data('walkList'),
        mobileMenu: Alpine.data('mobileMenu'),
        loading: Alpine.data('loading')
    });
});

// Define WalkQuest Alpine plugin
function walkquestPlugin(Alpine) {
    // Register components
    Alpine.data('walkInterface', () => ({
        // Component state
        showSidebar: false,
        selectedWalk: null,
        config: window.walkquestConfig || {},
        map: null,
        markers: new Map(),
        isMapLoading: true,
        pendingFavorites: new Set(),

        // Initialization
        init() {
            console.log('Initializing map component...');
            this.initializeMap();
        },

        async initializeMap() {
            if (!window.ApiService?.init) {
                console.error('ApiService not properly initialized');
                return;
            }

            // Get config from script tag
            const configScript = document.getElementById('config-data');
            if (!configScript) {
                console.error('Config data script tag not found');
                return;
            }

            try {
                // Parse config
                const config = JSON.parse(configScript.textContent);
                console.log('Parsed config:', config);
                
                if (!config.mapboxToken) {
                    console.error('Mapbox token not found in config');
                    return;
                }

                // Initialize Mapbox
                mapboxgl.accessToken = config.mapboxToken;

                // Initialize map
                console.log('Creating map with container:', this.$refs.map);
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
            } catch (error) {
                console.error('Failed to initialize map:', error);
                this.isMapLoading = false;
            }
        },

        // Map utility functions
        formatDistance(distance) {
            return `${(distance / 1000).toFixed(1)}km`;
        },

        sanitizeHtml(str) {
            return String(str).replace(/[&<>"']/g, m => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            })[m]);
        },

        calculateBounds(geometry) {
            if (!geometry?.coordinates?.length) return null;
            
            const bounds = new mapboxgl.LngLatBounds();
            geometry.coordinates.forEach(coord => {
                if (Array.isArray(coord) && coord.length >= 2) {
                    bounds.extend(coord);
                }
            });
            return bounds;
        },

        createMarker({ longitude, latitude, is_favorite }, config = {}, onClick) {
            const markerColor = is_favorite 
                ? (this.config.map?.markerColors?.favorite || '#FFD700')
                : (this.config.map?.markerColors?.default || '#FF0000');

            const marker = new mapboxgl.Marker({ color: markerColor })
                .setLngLat([longitude, latitude]);

            if (onClick) {
                marker.getElement().addEventListener('click', onClick);
            }

            return marker;
        },

        handleWalkSelection(detail) {
            if (!detail) return;
            
            this.selectedWalk = detail;
            this.showSidebar = true;
            
            // Update map view if coordinates available
            if (this.map && detail.longitude && detail.latitude) {
                this.map.flyTo({
                    center: [detail.longitude, detail.latitude],
                    zoom: 14,
                    essential: true
                });
            }
        },

        async toggleFavorite(walkId) {
            if (this.pendingFavorites.has(walkId)) return;

            if (!this.map) {
                console.error('Map not initialized');
                return;
            }

            const marker = this.markers.get(walkId);
            if (!marker) {
                console.error('Marker not found:', walkId);
                return;
            }

            // Add favorite status
            this.pendingFavorites.add(walkId);
            try {
                const result = await window.ApiService.toggleFavorite(walkId);
                const walk = this.walks.find(w => w.id === walkId);
                if (walk) {
                    walk.is_favorite = result.is_favorite;
                }
            } catch (error) {
                console.error('Failed to toggle favorite:', error);
            } finally {
                this.pendingFavorites.delete(walkId);
            }
        }
    }));

    // Register walkList component
    Alpine.data('walkList', () => ({
        walks: [],
        isLoading: false,
        isLoadingMore: false,
        hasMore: false,
        error: null,
        searchQuery: '',
        page: 1,
        pendingFavorites: new Set(),
        
        init() {
            console.log('Initializing walkList component...');
            const walksData = document.getElementById('walks-data');
            if (walksData) {
                try {
                    const initialData = JSON.parse(walksData.textContent);
                    this.walks = initialData.walks || [];
                    this.hasMore = initialData.hasMore || false;
                } catch (err) {
                    console.error('Failed to parse initial walks data:', err);
                }
            }
            this.fetchWalks();
        },

        async fetchWalks() {
            if (!window.ApiService?.filterWalks) {
                console.error('ApiService.filterWalks not available');
                return;
            }

            this.isLoading = true;
            this.error = null;
            try {
                const response = await window.ApiService.filterWalks({
                    search: this.searchQuery,
                    page: 1,
                    page_size: 10
                });
                this.walks = response.walks || [];
                this.hasMore = (response.walks || []).length >= 10;
                this.page = 1;
            } catch (err) {
                console.error('Failed to fetch walks:', err);
                this.error = 'Failed to load walks. Please try again.';
            } finally {
                this.isLoading = false;
            }
        },

        async loadMore() {
            if (this.isLoadingMore || !this.hasMore) return;
            
            this.isLoadingMore = true;
            this.page++;
            try {
                const response = await window.ApiService.filterWalks({
                    search: this.searchQuery,
                    page: this.page,
                    page_size: 10
                });
                const newWalks = response.walks || [];
                this.walks = [...this.walks, ...newWalks];
                this.hasMore = newWalks.length >= 10;
            } catch (err) {
                console.error('Failed to load more walks:', err);
                this.error = 'Failed to load more walks. Please try again.';
                this.page--;
            } finally {
                this.isLoadingMore = false;
            }
        },

        checkScroll() {
            const scrollPosition = window.innerHeight + window.scrollY;
            const documentHeight = document.documentElement.scrollHeight;
            const threshold = 200;
            if (documentHeight - scrollPosition < threshold) {
                this.loadMore();
            }
        }
    }));
}

// Register plugin with Alpine
document.addEventListener('alpine:init', () => {
    console.log('Initializing WalkQuest Alpine plugin...');
    Alpine.plugin(walkquestPlugin);
    console.debug('Alpine data and plugins registered');
});

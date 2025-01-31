// Define the loading component outside alpine:init to ensure it's available immediately
window.loading = () => ({
    show: false,
    init() {
        window.addEventListener('loading:show', () => {
            this.show = true;
        });
        window.addEventListener('loading:hide', () => {
            this.show = false;
        });
    }
});

// Wait for Alpine.js to be ready
document.addEventListener('alpine:init', () => {
    console.log('Initializing Alpine.js components...');

    // Register loading component with Alpine
    Alpine.data('loading', window.loading);

    // Initialize store first
    Alpine.store('walks', {
        selectedWalk: null,
        pendingFavorites: new Set(),
        
        setSelectedWalk(walk) {
            this.selectedWalk = walk;
            // Dispatch a custom event for walk selection
            window.dispatchEvent(new CustomEvent('walkSelected', { detail: walk }));
            console.log('Selected walk updated:', walk?.walk_name);
        },
        togglePendingFavorite(walkId) {
            this.pendingFavorites.has(walkId) 
                ? this.pendingFavorites.delete(walkId)
                : this.pendingFavorites.add(walkId);
        },
        isPending(walkId) {
            return this.pendingFavorites.has(walkId);
        }
    });

    // Define mobile menu component
    Alpine.data('mobileMenu', () => ({
        isOpen: false,
        toggleMenu() {
            this.isOpen = !this.isOpen;
        }
    }));

    // Define walk interface component
    Alpine.data('walkInterface', () => ({
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
        markerCache: new Map(), // Cache marker DOM elements
        error: null,
        loadingStates: {
            map: false,
            path: false
        },
        currentRouteState: {
            id: null,
            color: null
        },

        init() {
            return new Promise(async (resolve) => {
                console.group('WalkInterface Initialization');
                console.log('Starting initialization...');
                
                try {
                    await this.initializeData();
                    await this.initializeMap();
                    await this.fetchWalks();
                    console.log('Initialization complete');
                } catch (error) {
                    console.error('Initialization failed:', error);
                    this.error = 'Failed to initialize interface';
                } finally {
                    console.groupEnd();
                    resolve();
                }
            });
        },

        async initializeData() {
            console.log('Initializing data...');
            const walksData = document.getElementById('walks-data');
            if (!walksData) {
                console.warn('No initial walks data found');
                return;
            }

            try {
                const initialData = JSON.parse(walksData.textContent);
                this.walks = initialData.walks || [];
                this.hasMore = initialData.hasMore || false;
                console.log('Data initialized with', this.walks.length, 'walks');
                
                // Initialize markers for initial walks once map is loaded
                this.$nextTick(() => {
                    if (this.map) {
                        this.updateMarkers(this.walks);
                    }
                });
            } catch (error) {
                console.error('Failed to parse initial data:', error);
                throw error;
            }
        },

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
                const mapContainer = document.getElementById('map');
                if (!mapContainer) {
                    throw new Error('Map container element not found');
                }
                
                this.map = new mapboxgl.Map({
                    container: mapContainer,
                    style: 'mapbox://styles/mapbox/outdoors-v12?optimize=true',
                    center: config.map?.defaultCenter || [-4.85, 50.4],
                    zoom: config.map?.defaultZoom || 9.5,
                    preserveDrawingBuffer: false,
                    maxZoom: 16, // Limit max zoom for performance
                    minZoom: 1,  // Lower minimum zoom for context
                    renderWorldCopies: false, // Disable world copies for performance
                    trackResize: true,
                    useWebGL: true,
                    antialias: false,
                    maxBounds: new mapboxgl.LngLatBounds(
                        [-5.8, 49.8], // Southwest coordinates (includes Scilly Isles)
                        [-4.0, 51.0]  // Northeast coordinates (includes north coast)
                    )
                });

                this.map.on('load', () => {
                    console.log('Map loaded successfully');
                    this.isMapLoading = false;
                    this.map.resize();
                    
                    try {
                        // Remove existing source and layer if they exist
                        if (this.map.getLayer('route')) {
                            this.map.removeLayer('route');
                        }
                        if (this.map.getSource('route')) {
                            this.map.removeSource('route');
                        }

                        // Add new source and layer
                        this.map.addSource('route', {
                            type: 'geojson',
                            data: {
                                type: 'Feature',
                                properties: {},
                                geometry: {
                                    type: 'LineString',
                                    coordinates: []
                                }
                            }
                        });

                        this.map.addLayer({
                            id: 'route',
                            type: 'line',
                            source: 'route',
                            layout: {
                                'line-join': 'round',
                                'line-cap': 'round'
                            },
                            paint: {
                                'line-color': '#242424',
                                'line-width': 4
                            }
                        });

                        console.log('Successfully initialized route source and layer');
                    } catch (error) {
                        console.error('Error initializing route:', error);
                    }

                    // Debug logging
                    console.log('Path layer initialized:', this.map.getLayer('walk-path'));
                    
                    // Initialize markers
                    if (this.walks.length > 0) {
                        this.updateMarkers(this.walks);
                    }
                });

                this.map.addControl(new mapboxgl.NavigationControl(), 'top-left');
            } catch (error) {
                console.error('Failed to initialize map:', error);
                this.error = error.message;
                this.isMapLoading = false;
            }
        },

        async fetchWalks() {
            if (this.isLoading) return;
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
                
                // Update markers for new walks
                this.updateMarkers(this.walks);
            } catch (error) {
                console.error('Failed to fetch walks:', error);
                this.error = 'Failed to load walks. Please try again.';
            } finally {
                this.isLoading = false;
                window.dispatchEvent(new Event('loading:hide'));
            }
        },

        async loadMore() {
            if (this.isLoadingMore || !this.hasMore) return;
            this.isLoadingMore = true;

            try {
                const response = await window.ApiService.filterWalks({
                    search: this.searchQuery,
                    page: this.page + 1,
                    page_size: 10
                });
                
                const newWalks = response.walks || [];
                this.walks = [...this.walks, ...newWalks];
                this.hasMore = newWalks.length >= 10;
                this.page++;
                this.error = null;

                // Update markers with complete list of walks
                this.updateMarkers(this.walks);
            } catch (error) {
                console.error('Failed to load more walks:', error);
                this.error = 'Failed to load more walks. Please try again.';
            } finally {
                this.isLoadingMore = false;
            }
        },

        handleWalkSelection(detail) {
            if (!detail || !window.htmx) {
                console.error('Invalid walk detail or HTMX not loaded');
                return;
            }
            // Update store and UI state
            Alpine.store('walks').setSelectedWalk(detail);
            this.showSidebar = true;
            this.$store.walks.setSelectedWalk(detail);

            // Update map view and fetch path
            this.updateMapView(detail);
            
            this.$nextTick(() => {
                this.showSidebar = true;
                window.localStorage.setItem('sidebar', 'true');
                
                if (this.currentRouteState.id === detail.id) {
                    // Route is already loaded, just update the view
                    this.updateMapView(detail);
                    return;
                }

                this.currentRouteState.id = detail.id;

                // Clear existing path efficiently
                const source = this.map.getSource('route');
                if (source) {
                    source.setData({
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'LineString',
                            coordinates: []
                        }
                    });
                }

                // Update path color based on steepness level
                const color = {
                    'Moderate': '#4338CA',    // Blue for moderate
                    'Challenging': '#DC2626', // Red for challenging
                    'Easy': '#10B981'         // Green for easy
                }[detail.steepness_level] || '#242424';

                if (this.currentRouteState.color !== color) {
                    this.currentRouteState.color = color;
                    this.map.setPaintProperty('route', 'line-color', color);
                }

                // Fetch and display new path with AbortController
                const controller = new AbortController();
                const signal = controller.signal;

                fetch(`/api/walks/${detail.id}/geometry`, { signal })
                    .then(response => response.json())
                    .then(geojson => {
                        if (this.currentRouteState.id !== detail.id) return;

                        const source = this.map.getSource('route');
                        if (source) {
                            source.setData(geojson);
                        }

                        // Update map view with the new path
                        this.updateMapView(detail, geojson.coordinates);
                    })
                    .catch(error => {
                        if (error.name === 'AbortError') return;
                        console.error('Failed to load walk geometry:', error);
                    });

                return () => controller.abort(); // Cleanup function
            });
        },

        updateMapView(detail, coordinates = null) {
            if (!this.map || !detail) return;

            const padding = { top: 50, bottom: 50, left: 50, right: 384 };

            if (coordinates && coordinates.length > 0) {
                // If we have path coordinates, fit bounds to show the entire path
                const bounds = coordinates.reduce((bounds, coord) => {
                    return bounds.extend(coord);
                }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

                this.map.fitBounds(bounds, {
                    padding,
                    maxZoom: 15,
                    duration: 1000
                });
            } else if (detail.longitude && detail.latitude) {
                // Otherwise just center on the walk point
                this.map.flyTo({
                    center: [detail.longitude, detail.latitude],
                    zoom: 14,
                    essential: true,
                    padding
                });
                // Fetch and display path
                this.fetchAndDisplayPath(detail.id);
            }
        },

        // Add helper method for loading states
        setLoadingState(type, isLoading) {
            if (!this.loadingStates) {
                this.loadingStates = {};
            }
            this.loadingStates[type] = isLoading;
        },

        updateMarkers(walks) {
            if (!this.map) return;
            
            const existingIds = new Set(this.markers.keys());
            const newIds = new Set();
            
            // Update or add new markers
            for (const walk of walks) {
                if (!walk.latitude || !walk.longitude) continue;
                newIds.add(walk.id);
                
                if (!this.markers.has(walk.id)) {
                    // Create new marker if it doesn't exist
                    let markerEl;
                    if (this.markerCache.has(walk.id)) {
                        markerEl = this.markerCache.get(walk.id);
                    } else {
                        const marker = new mapboxgl.Marker({
                            // Optimize marker options
                            clickTolerance: 3,
                            draggable: false
                        })
                        .setLngLat([walk.longitude, walk.latitude])
                        .addTo(this.map);
                        
                        markerEl = marker.getElement();
                        markerEl.addEventListener('click', () => {
                            this.handleWalkSelection(walk);
                        });
                        
                        this.markerCache.set(walk.id, markerEl);
                        this.markers.set(walk.id, marker);
                    }
                } else {
                    // Update existing marker position if needed
                    const marker = this.markers.get(walk.id);
                    marker.setLngLat([walk.longitude, walk.latitude]);
                }
            }
            
            // Remove markers that are no longer needed
            for (const id of existingIds) {
                if (!newIds.has(id)) {
                    const marker = this.markers.get(id);
                    if (marker) {
                        marker.remove();
                        this.markers.delete(id);
                    }
                }
            }
        }
    }));
});

// Single debug initialization event listener
window.addEventListener('alpine:initialized', () => {
    console.log('Alpine.js ready:', {
        store: Alpine.store('walks'),
        walkInterface: Alpine.data('walkInterface'),
        walkList: Alpine.data('walkList'),
        mobileMenu: Alpine.data('mobileMenu'),
        loading: Alpine.data('loading')
    });
});

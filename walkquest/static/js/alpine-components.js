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
        error: null,
        loadingStates: {
            map: false,
            path: false
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
                    style: config.map?.style || 'mapbox://styles/mapbox/streets-v12',
                    center: config.map?.defaultCenter || [-4.85, 50.4],
                    zoom: config.map?.defaultZoom || 9.5,
                    preserveDrawingBuffer: true
                });

                this.map.on('load', () => {
                    console.log('Map loaded successfully');
                    this.isMapLoading = false;
                    this.map.resize();
                    
                    // Initialize map source and layer
                    if (!this.map.getSource('walk-path')) {
                        this.map.addSource('walk-path', {
                            type: 'geojson',
                            data: {
                                type: 'Feature',
                                properties: {},
                                geometry: { type: 'LineString', coordinates: [] }
                            }
                        });

                        this.map.addLayer({
                            id: 'walk-path',
                            type: 'line',
                            source: 'walk-path',
                            layout: {
                                'line-join': 'round',
                                'line-cap': 'round'
                            },
                            paint: {
                                'line-color': '#4338CA',
                                'line-width': 4,
                                'line-opacity': 0.8
                            }
                        });
                    }
                    
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
            
            console.group('Walk Selection');
            console.log('Processing walk:', detail);
            
            this.$store.walks.setSelectedWalk(detail);
            
            this.$nextTick(() => {
                this.showSidebar = true;
                window.localStorage.setItem('sidebar', 'true');
                
                // Configure path loading
                const mapPathLayer = document.getElementById('map-path-layer');
                if (mapPathLayer) {
                    // Clear existing path while loading
                    const source = this.map.getSource('walk-path');
                    if (source) {
                        source.setData({
                            type: 'Feature',
                            properties: {},
                            geometry: { type: 'LineString', coordinates: [] }
                        });
                    }

                    // Setup HTMX request
                    console.log('Setting up HTMX request for geometry:', `/api/walks/${detail.id}/geometry`);
                    mapPathLayer.setAttribute('hx-get', `/api/walks/${detail.id}/geometry`);
                    
                    // Debug listeners
                    const beforeRequest = (evt) => {
                        if (evt.detail.target.id === 'map-path-layer') {
                            console.log('HTMX Request starting:', evt.detail.requestConfig);
                            this.setLoadingState('path', true);
                        }
                    };

                    const afterRequest = (evt) => {
                        if (evt.detail.target.id === 'map-path-layer') {
                            console.log('HTMX Response received:', evt.detail.xhr.responseText);
                            this.setLoadingState('path', false);
                        }
                    };

                    // Add debug event listeners
                    document.body.addEventListener('htmx:beforeRequest', beforeRequest);
                    document.body.addEventListener('htmx:afterRequest', afterRequest);

                    // Handle geometry data loading
                    const handleGeometryLoad = (evt) => {
                        if (evt.detail.target.id === 'map-path-layer') {
                            try {
                                const pathElement = document.getElementById('path-data');
                                if (!pathElement || !pathElement.textContent) {
                                    throw new Error('No path data received');
                                }

                                const pathData = JSON.parse(pathElement.textContent);
                                console.log('Processing geometry data:', pathData);

                                if (!pathData.geometry?.coordinates) {
                                    throw new Error('Invalid geometry data structure');
                                }

                                // Update map with path data
                                const source = this.map.getSource('walk-path');
                                if (source) {
                                    source.setData({
                                        type: 'Feature',
                                        properties: {
                                            walk_id: detail.id,
                                            difficulty: detail.steepness_level || 'medium'
                                        },
                                        geometry: pathData.geometry
                                    });

                                    // Update path styling
                                    const color = {
                                        easy: '#10B981',
                                        medium: '#4338CA',
                                        hard: '#DC2626'
                                    }[detail.steepness_level] || '#4338CA';

                                    this.map.setPaintProperty('walk-path', 'line-color', color);

                                    // Fit bounds to show the entire path
                                    const bounds = new mapboxgl.LngLatBounds();
                                    pathData.geometry.coordinates.forEach(coord => bounds.extend(coord));
                                    this.map.fitBounds(bounds, {
                                        padding: { top: 50, bottom: 50, left: 50, right: 384 },
                                        maxZoom: 15,
                                        duration: 1000
                                    });
                                }
                            } catch (error) {
                                console.error('Failed to process geometry:', error);
                                this.error = `Failed to load walk path: ${error.message}`;
                            }

                            // Cleanup listeners
                            document.body.removeEventListener('htmx:afterSettle', handleGeometryLoad);
                            document.body.removeEventListener('htmx:beforeRequest', beforeRequest);
                            document.body.removeEventListener('htmx:afterRequest', afterRequest);
                        }
                    };

                    // Add main event listener and trigger request
                    document.body.addEventListener('htmx:afterSettle', handleGeometryLoad);
                    mapPathLayer.classList.remove('hidden');
                }

                // Update map view
                if (this.map && detail.longitude && detail.latitude) {
                    this.map.flyTo({
                        center: [detail.longitude, detail.latitude],
                        zoom: 14,
                        essential: true,
                        padding: { right: 384 }
                    });
                }
            });

            console.groupEnd();
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

            // Remove existing markers
            for (const marker of this.markers.values()) {
                marker.remove();
            }
            this.markers.clear();

            // Add new markers
            for (const walk of walks) {
                if (!walk.latitude || !walk.longitude) continue;

                // Create marker using Mapbox default marker
                const marker = new mapboxgl.Marker()
                    .setLngLat([walk.longitude, walk.latitude])
                    .addTo(this.map);

                // Add click handler
                marker.getElement().addEventListener('click', () => {
                    this.handleWalkSelection(walk);
                });

                this.markers.set(walk.id, marker);
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

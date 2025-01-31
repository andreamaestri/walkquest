// Initialize Alpine components and store
document.addEventListener('alpine:init', () => {
    // Register loading component
    Alpine.data('loading', () => ({
        show: false,
        init() {
            window.addEventListener('loading:show', () => this.show = true);
            window.addEventListener('loading:hide', () => this.show = false);
        }
    }));

    // Register mobile menu component
    Alpine.data('mobileMenu', () => ({
        isOpen: false,
        toggleMenu() {
            this.isOpen = !this.isOpen;
        }
    }));

    // Initialize global store first
    Alpine.store('walks', {
        selectedWalk: null,
        pendingFavorites: new Set(),
        initialized: false,
        
        init() {
            this.initialized = true;
            console.log('Walks store initialized');
        },

        setSelectedWalk(walk) {
            this.selectedWalk = walk;
            console.log('Selected walk updated:', walk?.walk_name);
            // Trigger reactive updates
            Alpine.effect(() => {
                if (walk) {
                    document.dispatchEvent(new CustomEvent('walk-selected', {
                        detail: walk
                    }));
                }
            });
        },

        togglePendingFavorite(walkId) {
            this.pendingFavorites.has(walkId)
                ? this.pendingFavorites.delete(walkId)
                : this.pendingFavorites.add(walkId);
        },

        isPending(walkId) {
            return this.pendingFavorites.has(walkId);
        },

        hasSelectedWalk() {
            return !!this.selectedWalk;
        }
    });

    // Define walk interface component with proper initialization
    Alpine.data('walkInterface', () => ({
        // Component state with default values
        walks: [],
        searchQuery: "",
        showSidebar: false,
        isMapLoading: true,
        isLoading: false,
        isLoadingMore: false,
        hasMore: true,
        page: 1,
        map: null,
        error: null,
        loadingStates: {
            map: false,
            path: false,
            data: false
        },
        currentRouteState: {
            id: null,
            color: null,
            path: null
        },
        pointsSource: null,
        mapInitialized: false,

        // Component initialization
        init() {
            // Initialize sidebar state from localStorage
            this.showSidebar = localStorage.getItem('sidebar') === 'true';
            
            return new Promise(async (resolve) => {
                console.group('WalkInterface Initialization');
                console.log('Starting initialization...');
                
                // Reset error state
                this.error = null;
                
                try {
                    // Ensure Alpine.js store is initialized
                    if (!this.$store.walks) {
                        throw new Error('Alpine.js store not initialized');
                    }

                    // Initialize in sequence
                    this.loadingStates.data = true;
                    await this.initializeData();
                    this.loadingStates.data = false;

                    this.loadingStates.map = true;
                    await this.initializeMap();
                    this.loadingStates.map = false;

                    this.isLoading = true;
                    await this.fetchWalks();
                    this.isLoading = false;

                    // Mark initialization as complete
                    this.mapInitialized = true;
                    console.log('Initialization complete');
                } catch (error) {
                    console.error('Initialization failed:', error);
                    this.error = error.message || 'Failed to initialize interface';
                    
                    // Reset loading states on error
                    this.loadingStates = {
                        map: false,
                        path: false,
                        data: false
                    };
                    this.isLoading = false;
                    this.isMapLoading = false;
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
            if (this.mapInitialized) {
                return;
            }

            const configScript = document.getElementById('config-data');
            if (!configScript) {
                const error = 'Configuration not found';
                console.error(error);
                this.error = error;
                this.isMapLoading = false;
                return;
            }

            try {
                // Parse and validate configuration
                let config;
                try {
                    config = JSON.parse(configScript.textContent);
                } catch (parseError) {
                    throw new Error('Invalid map configuration format');
                }

                if (!config.mapboxToken) {
                    throw new Error('Mapbox token not found in config');
                }

                // Initialize Mapbox GL
                if (typeof mapboxgl === 'undefined') {
                    throw new Error('Mapbox GL JS not loaded');
                }

                mapboxgl.accessToken = config.mapboxToken;

                // Validate map container
                const mapContainer = document.getElementById('map');
                if (!mapContainer) {
                    throw new Error('Map container element not found');
                }
                
                // Initialize map with validated config
                const mapConfig = {
                    container: mapContainer,
                    style: 'mapbox://styles/mapbox/standard?optimize=true',
                    center: config.map?.defaultCenter || [-4.85, 50.4],
                    zoom: config.map?.defaultZoom || 9.5,
                    preserveDrawingBuffer: true,
                    maxZoom: 16,
                    minZoom: 1,
                    renderWorldCopies: false,
                    maxBounds: new mapboxgl.LngLatBounds(
                        [-5.8, 49.8],
                        [-4.0, 51.0]
                    ),
                    failIfMajorPerformanceCaveat: true
                };

                this.map = new mapboxgl.Map(mapConfig);

                // Add error handling for map
                this.map.on('error', (e) => {
                    console.error('Mapbox GL error:', e);
                    this.error = 'Map error: ' + (e.error?.message || 'Unknown error');
                    this.isMapLoading = false;
                });

                // Wait for map to load
                await new Promise((resolve, reject) => {
                    this.map.once('load', () => {
                        resolve();
                    });

                    this.map.once('error', (e) => {
                        reject(new Error('Map failed to load: ' + (e.error?.message || 'Unknown error')));
                    });
                });

                // Initialize map components after successful load
                console.log('Map loaded successfully');
                this.isMapLoading = false;
                this.map.resize();
                
                // Clean up existing sources and layers
                ['route', 'points'].forEach(id => {
                    const layers = [
                        id,
                        'clusters',
                        'cluster-count',
                        'unclustered-point'
                    ];
                    layers.forEach(layer => {
                        if (this.map.getLayer(layer)) {
                            this.map.removeLayer(layer);
                        }
                    });
                    if (this.map.getSource(id)) {
                        this.map.removeSource(id);
                    }
                });

                // Wait for style to load completely
                if (!this.map.isStyleLoaded()) {
                    this.map.once('style.load', () => {
                        this.initializeSources();
                    });
                    return;
                }

                this.initializeSources();

                this.map.addControl(new mapboxgl.NavigationControl(), 'top-left');
            } catch (error) {
                console.error('Failed to initialize map:', error);
                this.error = error.message;
                this.isMapLoading = false;
            }
        },

        initializeSources() {
            try {
        // Add route source and layer first
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
                'line-color': '#4338CA',
                'line-width': 8
            }
        });

        // Add points source
        this.map.addSource('points', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            },
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 50
        });

        // Add layers in correct order
        this.map.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'points',
            filter: ['has', 'point_count'],
            paint: {
                'circle-color': '#4338CA',
                'circle-radius': [
                    'step',
                    ['get', 'point_count'],
                    20,
                    10,
                    30,
                    20,
                    40
                ]
            }
        });

        this.map.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'points',
            filter: ['has', 'point_count'],
            layout: {
                'text-field': '{point_count_abbreviated}',
                'text-size': 12
            },
            paint: {
                'text-color': '#ffffff'
            }
        });

        // Use circle layer for individual points instead of symbols
        this.map.addLayer({
            id: 'unclustered-point',
            type: 'circle',
            source: 'points',
            filter: ['!', ['has', 'point_count']],
            paint: {
                'circle-radius': 8,
                'circle-color': '#4338CA',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff'
            }
        });

        this.setupMapEventHandlers();
        this.pointsSource = this.map.getSource('points');
        console.log('Successfully initialized map sources and layers');
    } catch (error) {
        console.error('Error initializing sources:', error);
    }
},

setupMapEventHandlers() {
    try {
        // Handle cluster clicks
        this.map.on('click', 'clusters', (e) => {
            const features = this.map.queryRenderedFeatures(e.point, {
                layers: ['clusters']
            });
            const clusterId = features[0].properties.cluster_id;
            this.map.getSource('points').getClusterExpansionZoom(
                clusterId,
                (err, zoom) => {
                    if (err) return;
                    this.map.easeTo({
                        center: features[0].geometry.coordinates,
                        zoom: zoom,
                        duration: 500
                    });
                }
            );
        });

        // Handle individual point clicks
        this.map.on('click', 'unclustered-point', (e) => {
            const feature = e.features[0];
            const properties = feature.properties;
            // Parse the stringified properties
            const walk = {
                id: properties.id,
                walk_name: properties.walk_name,
                steepness_level: properties.steepness_level,
                latitude: feature.geometry.coordinates[1],
                longitude: feature.geometry.coordinates[0],
                ...properties
            };
            this.handleWalkSelection(walk);
        });

        // Change cursor on hover
        const pointerLayers = ['clusters', 'unclustered-point'];
        pointerLayers.forEach(layer => {
            this.map.on('mouseenter', layer, () => {
                this.map.getCanvas().style.cursor = 'pointer';
            });
            this.map.on('mouseleave', layer, () => {
                this.map.getCanvas().style.cursor = '';
            });
        });

        // Initialize markers if we have walks
        if (this.walks.length > 0) {
            this.updateMarkers(this.walks);
        }

        // Add navigation control
        this.map.addControl(new mapboxgl.NavigationControl(), 'top-left');

    } catch (error) {
        console.error('Failed to setup map event handlers:', error);
        this.error = 'Failed to initialize map interactions';
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
            
            this.$store.walks.setSelectedWalk(detail);
            
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
                }[detail.steepness_level] || '#4338CA';

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
            if (!this.map || !this.pointsSource) return;

            // Convert walks to GeoJSON features
            const features = walks
                .filter(walk => walk.latitude && walk.longitude)
                .map(walk => ({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [walk.longitude, walk.latitude]
                    },
                    properties: {
                        id: walk.id,
                        walk_name: walk.walk_name,
                        steepness_level: walk.steepness_level,
                        description: walk.description,
                        distance_km: walk.distance_km,
                        ascent_meters: walk.ascent_meters,
                        time_minutes: walk.time_minutes
                    }
                }));

            // Update points source with new features
            this.pointsSource.setData({
                type: 'FeatureCollection',
                features: features
            });
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

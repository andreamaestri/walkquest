// Initialize Alpine component for map interface
document.addEventListener('alpine:init', () => {
    Alpine.data('walkInterface', () => ({
        // Component state
        showSidebar: false,
        isLoading: false,
        isLoadingMore: false,
        isMapLoading: false,
        error: null,
        searchQuery: '',
        map: null,
        markers: new Map(),
        currentPath: null,
        pathSource: null,
        pathAnimation: null,
        config: window.walkquestConfig || {},

        // Computed properties
        get selectedWalk() {
            return Alpine.store('walks').selectedWalk;
        },

        get pendingFavorites() {
            return Alpine.store('walks').pendingFavorites;
        },

        init() {
            console.log('Initializing map interface...');
            
            // Add cleanup handler
            this.$cleanup(() => {
                if (this.pathAnimation) {
                    cancelAnimationFrame(this.pathAnimation);
                }
            });

            // Listen for walk selection events
            window.addEventListener('walk-selected', (event) => {
                console.log('Walk selected:', event.detail);
                this.handleWalkSelection(event.detail);
            });

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

                // Initialize map immediately
                const mapContainer = this.$refs.map;
                while (mapContainer.firstChild) {
                    mapContainer.removeChild(mapContainer.firstChild);
                }

                try {
                    console.log('Creating map with container:', this.$refs.map);
                    this.map = new mapboxgl.Map({
                        container: mapContainer,
                        style: config.map?.style || 'mapbox://styles/mapbox/outdoors-v12',
                        center: config.map?.defaultCenter || [-4.85, 50.4],
                        zoom: config.map?.defaultZoom || 9.5,
                        preserveDrawingBuffer: true,
                        interactive: true,
                        touchZoomRotate: true,
                        touchPitch: true,
                        cooperativeGestures: true
                    });

                    if (!mapboxgl.supported({ failIfMajorPerformanceCaveat: true })) {
                        console.warn('WebGL performance may be limited');
                        this.map.setStyle('mapbox://styles/mapbox/light-v10');
                    }

                    this.map.on('load', () => {
                        console.log('Map loaded successfully');
                        this.map.resize();
                        this.initializePathLayer();
                        this.isMapLoading = false;
                    });

                    this.map.on('error', (e) => {
                        console.error('Map error:', e);
                    });

                    // Add navigation control and touch handlers
                    this.map.addControl(new mapboxgl.NavigationControl(), 'top-left');
                    const mapCanvas = this.map.getCanvas();
                    const touchOptions = { passive: true };
                    
                    mapCanvas.addEventListener('touchstart', (e) => {
                        e.preventDefault();
                        this.map.dragPan.enable();
                    }, touchOptions);
                    
                    mapCanvas.addEventListener('touchmove', (e) => {
                        if (e.touches.length > 1) {
                            this.map.dragPan.disable();
                        }
                    }, touchOptions);
                    
                    mapCanvas.addEventListener('touchend', () => {
                        this.map.dragPan.enable();
                    }, touchOptions);

                    // Handle container resize
                    new ResizeObserver(() => this.map.resize())
                        .observe(mapContainer);

                    // Process initial walks if available
                    const walksData = document.getElementById('walks-data');
                    if (walksData) {
                        const initialData = JSON.parse(walksData.textContent);
                        this.processInitialWalks(initialData.walks || []);
                    }

                } catch (error) {
                    console.error('Failed to initialize map:', error);
                }

            } catch (error) {
                console.error('Failed to parse config:', error);
            }
        },

        processInitialWalks(walks) {
            walks.forEach(walk => {
                if (walk.longitude && walk.latitude) {
                    this.addMarker({
                        id: walk.id,
                        longitude: walk.longitude,
                        latitude: walk.latitude,
                        is_favorite: walk.is_favorite
                    }, {}, () => {
                        Alpine.store('walks').setSelectedWalk(walk);
                        this.showSidebar = true;
                    });
                }
            });

            const bounds = new mapboxgl.LngLatBounds();
            walks.forEach(walk => {
                if (walk.longitude && walk.latitude) {
                    bounds.extend([walk.longitude, walk.latitude]);
                }
            });
            
            if (!bounds.isEmpty()) {
                this.map.fitBounds(bounds, {
                    padding: 50,
                    maxZoom: 14
                });
            }
        },

        initializePathLayer() {
            try {
                if (!this.map) {
                    console.warn('Map not initialized when attempting to add path layer');
                    return;
                }

                // Remove existing layer and source if they exist
                if (this.map.getLayer('walk-path')) {
                    this.map.removeLayer('walk-path');
                }
                if (this.map.getSource('walk-path')) {
                    this.map.removeSource('walk-path');
                }

                // Add new source and layer
                this.map.addSource('walk-path', {
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

                console.log('Path layer initialized successfully');
            } catch (error) {
                console.error('Error initializing path layer:', error);
            }
        },

        async morphPath(walk) {
            try {
                console.log('Morphing path for walk:', walk);
                
                if (!walk?.path) {
                    console.warn('No path data available for walk:', walk?.id);
                    return;
                }

                const pathData = walk.path.coordinates || walk.path;
                console.log('Path data:', pathData);

                if (!Array.isArray(pathData) || pathData.length === 0) {
                    console.warn('Invalid path data format:', pathData);
                    return;
                }

                // Ensure path layer exists
                const source = this.map.getSource('walk-path');
                if (!source) {
                    console.log('Path source not found, initializing...');
                    this.initializePathLayer();
                }

                // Update path data
                const newData = {
                    type: 'Feature',
                    properties: {
                        difficulty: walk.difficulty || 'medium',
                        isActive: true
                    },
                    geometry: {
                        type: 'LineString',
                        coordinates: pathData
                    }
                };

                this.map.getSource('walk-path').setData(newData);

                // Update style based on difficulty
                const color = {
                    easy: '#10B981',    // Green
                    medium: '#4338CA',  // Indigo
                    hard: '#DC2626'     // Red
                }[walk.difficulty] || '#4338CA';

                this.map.setPaintProperty('walk-path', 'line-color', color);
                this.currentPath = pathData;

                // Fit bounds to show the entire path
                this.fitPathBounds(pathData);

            } catch (error) {
                console.error('Error morphing path:', error);
            }
        },

        addMarker({ id, longitude, latitude, is_favorite }, config = {}, onClick) {
            this.removeMarker(id);
            
            const markerColor = is_favorite 
                ? (this.config.map?.markerColors?.favorite || '#FFD700')
                : (this.config.map?.markerColors?.default || '#FF0000');

            const marker = new mapboxgl.Marker({ color: markerColor })
                .setLngLat([longitude, latitude])
                .addTo(this.map);

            if (onClick) {
                marker.getElement().addEventListener('click', onClick);
            }

            this.markers.set(id, marker);
            return marker;
        },

        removeMarker(id) {
            const marker = this.markers.get(id);
            if (marker) {
                marker.remove();
                this.markers.delete(id);
            }
        },

        removeAllMarkers() {
            this.markers.forEach(marker => marker.remove());
            this.markers.clear();
        },

        handleWalkSelection(detail) {
            if (!detail) return;
            
            console.log('Handling walk selection:', detail);
            Alpine.store('walks').setSelectedWalk(detail);
            this.showSidebar = true;
            
            if (detail.longitude && detail.latitude) {
                this.addMarker({
                    id: detail.id,
                    longitude: detail.longitude,
                    latitude: detail.latitude,
                    is_favorite: detail.is_favorite
                }, {}, () => {
                    Alpine.store('walks').setSelectedWalk(detail);
                    this.showSidebar = true;
                });

                this.map.flyTo({
                    center: [detail.longitude, detail.latitude],
                    zoom: 14,
                    essential: true
                }, {
                    duration: 1000,
                    padding: { right: detail.path ? 384 : 0 }
                });

                if (detail.path && detail.path.length > 0) {
                    this.morphPath(detail);
                }
            }
        },

        fitPathBounds(path) {
            if (!path || !path.length) return;

            const bounds = new mapboxgl.LngLatBounds();
            path.forEach(coord => {
                bounds.extend(coord);
            });

            this.map.fitBounds(bounds, {
                padding: {
                    top: 50, bottom: 50,
                    left: 50, right: 384
                },
                maxZoom: 15
            });
        }
    }));
});

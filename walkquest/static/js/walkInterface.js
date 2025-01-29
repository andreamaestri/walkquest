// Initialize Alpine component for map interface
document.addEventListener('alpine:init', () => {
    Alpine.data('walkInterface', () => ({
        // Component state
        showSidebar: false,
        isLoading: false,
        isLoadingMore: false,
        isMapLoading: true,
        error: null,
        searchQuery: '',
        map: null,
        markers: new Map(),
        currentPath: null,
        pathSource: null,
        config: null,

        // Computed properties
        get selectedWalk() {
            return Alpine.store('walks').selectedWalk;
        },

        get pendingFavorites() {
            return Alpine.store('walks').pendingFavorites;
        },

        init() {
            console.group('Initializing Map Interface');
            
            // Get config from script tag
            const configScript = document.getElementById('config-data');
            if (!configScript) {
                console.error('Config data script tag not found');
                return;
            }

            try {
                this.config = JSON.parse(configScript.textContent);
                if (!this.config.mapboxToken) {
                    throw new Error('Mapbox token not found in config');
                }

                // Initialize Mapbox
                mapboxgl.accessToken = this.config.mapboxToken;

                // Get container and ensure it's empty
                const mapContainer = this.$refs.map;
                if (!mapContainer) {
                    throw new Error('Map container not found');
                }

                while (mapContainer.firstChild) {
                    mapContainer.removeChild(mapContainer.firstChild);
                }

                // Create map instance
                this.map = new mapboxgl.Map({
                    container: mapContainer,
                    style: this.config.map?.style || 'mapbox://styles/mapbox/outdoors-v12',
                    center: this.config.map?.defaultCenter || [-4.85, 50.4],
                    zoom: this.config.map?.defaultZoom || 9.5,
                    preserveDrawingBuffer: true,
                    cooperativeGestures: true
                });

                // Setup map event handlers
                this.map.on('style.load', () => {
                    console.log('Map style loaded, initializing layers');
                    console.group('Map Initialization');
                    console.log('Map center:', this.map.getCenter());
                    console.log('Map zoom:', this.map.getZoom());
                    this.initializeLayers();
                    console.groupEnd();

                    // Process initial walks if available
                    const walksData = document.getElementById('walks-data');
                    if (walksData) {
                        try {
                            const initialData = JSON.parse(walksData.textContent);
                            console.log('Initial walks data:', initialData);
                            const walks = initialData;
                            if (walks && walks.length > 0) {
                                console.log('Processing walks:', walks.length);
                                this.processInitialWalks(walks);
                            } else {
                                console.warn('No initial walks data found');
                            }
                        } catch (error) {
                            console.error('Failed to process initial walks:', error);
                            this.error = 'Failed to load walks';
                        }
                        this.isMapLoading = false;
                    }
                });

                this.map.on('error', (e) => {
                    console.error('Map error:', e);
                    this.error = 'Failed to load map';
                });

                // Add navigation control
                this.map.addControl(new mapboxgl.NavigationControl(), 'top-left');

                // Add touch handlers
                const mapCanvas = this.map.getCanvas();
                const touchOptions = { passive: true };
                
                mapCanvas.addEventListener('touchstart', (e) => {
                    if (e.cancelable) e.preventDefault();
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
                new ResizeObserver(() => {
                    if (this.map) this.map.resize();
                }).observe(mapContainer);

                // Add cleanup handler
                this.$cleanup(() => {
                    if (this.map) {
                        this.map.remove();
                    }
                });

            } catch (error) {
                console.error('Failed to initialize map:', error);
                this.error = error.message;
            } finally {
                console.groupEnd();
            }
        },

        initializeLayers() {
            if (!this.map.getSource('walk-path')) {
                // Add the GeoJSON source for the walk path
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

                // Add the line layer
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

                console.log('Path layers initialized');
            }
        },

        processInitialWalks(walks) {
            if (!this.map) return;

            console.group('Processing Initial Walks');
            console.log('Total walks to process:', walks.length);
            
            // Validate walk data before processing
            walks = walks.filter(walk => {
                const isValid = this.validateWalkCoordinates(walk);
                if (!isValid) {
                    console.warn('Invalid coordinates for walk:', walk.id);
                }
                return isValid;
            });

            console.log('Valid walks after filtering:', walks.length);

            const bounds = new mapboxgl.LngLatBounds();
            let hasValidCoordinates = false;

            // Wait for map to be loaded before adding markers
            const addMarkers = () => {
                if (!this.map.loaded()) {
                    console.log('Map not yet loaded, waiting...');
                    requestAnimationFrame(addMarkers);
                    return;
                }

                this.addWalkMarkers(walks, bounds);
                console.log('All markers added successfully');
                console.groupEnd();
            };

            addMarkers();
        },

        addWalkMarkers(walks, bounds) {
            walks.forEach(walk => {
                if (walk.longitude && walk.latitude) {
                    console.log('Adding marker for walk:', walk.id, 'at:', walk.longitude, walk.latitude);
                    
                    this.addMarker({
                        id: walk.id,
                        longitude: walk.longitude,
                        latitude: walk.latitude,
                        is_favorite: walk.is_favorite
                    }, {}, () => {
                        Alpine.store('walks').setSelectedWalk(walk);
                        this.showSidebar = true;
                    });
                    
                    bounds.extend([walk.longitude, walk.latitude]);
                }
            });

            if (!bounds.isEmpty()) {
                console.log('Fitting to bounds:', bounds.toString());
                this.map.fitBounds(bounds, {
                    padding: 50,
                    maxZoom: 14
                });
            } else {
                console.warn('No valid bounds to fit to');
            }
        },

        validateWalkCoordinates(walk) {
            if (!walk) return false;
            
            const lng = parseFloat(walk.longitude);
            const lat = parseFloat(walk.latitude);
            
            if (isNaN(lng) || isNaN(lat)) {
                console.warn('Invalid coordinates for walk:', walk.id, { lng, lat });
                return false;
            }
            
            return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
        },

        addMarker({ id, longitude, latitude, is_favorite }, config = {}, onClick) {
            if (!this.map) return null;
            
            this.removeMarker(id);
            
            try {
                const lng = parseFloat(longitude);
                const lat = parseFloat(latitude);
                
                if (isNaN(lng) || isNaN(lat)) {
                    throw new Error('Invalid coordinates');
                }

                const markerOptions = {
                    color: is_favorite ? '#FFD700' : '#FF0000',
                    draggable: false,
                    anchor: 'bottom'
                };

                console.log('Creating marker:', { id, lng, lat, is_favorite, options: markerOptions });
                
                const marker = new mapboxgl.Marker(markerOptions)
                    .setLngLat([lng, lat])
                    .addTo(this.map);

                if (onClick) {
                    marker.getElement().addEventListener('click', onClick);
                }

                this.markers.set(id, marker);
                console.log('Marker added successfully');
                return marker;
            } catch (error) {
                console.error('Failed to add marker:', error);
                return null;
            }
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

        async handleWalkSelection(detail) {
            if (!detail || !this.map) return;
            
            console.group('Walk Selection');
            console.log('Processing walk:', detail.id);
            
            Alpine.store('walks').setSelectedWalk(detail);
            this.showSidebar = true;
            
            if (detail.longitude && detail.latitude) {
                // Add or update marker
                this.addMarker({
                    id: detail.id,
                    longitude: detail.longitude,
                    latitude: detail.latitude,
                    is_favorite: detail.is_favorite
                });

                // Center map on selected walk
                this.map.easeTo({
                    center: [detail.longitude, detail.latitude],
                    zoom: 14,
                    duration: 1000,
                    padding: { right: detail.path ? 384 : 0 }
                });

                try {
                    console.log('Fetching geometry for walk:', detail.id);
                    const geometryData = await window.ApiService.getWalkGeometry(detail.id);

                    if (geometryData.status === 'error') {
                        throw new Error(geometryData.message);
                    }

                    // Update the GeoJSON source with new data
                    const source = this.map.getSource('walk-path');
                    if (source) {
                        source.setData({
                            type: 'Feature',
                            properties: {
                                difficulty: detail.difficulty || 'medium'
                            },
                            geometry: geometryData.geometry
                        });

                        // Update the path's appearance based on difficulty
                        const color = {
                            easy: '#10B981',    // Green
                            medium: '#4338CA',  // Indigo
                            hard: '#DC2626'     // Red
                        }[detail.difficulty] || '#4338CA';

                        this.map.setPaintProperty('walk-path', 'line-color', color);
                        
                        // Fit the map view to the path
                        if (geometryData.geometry?.coordinates?.length) {
                            const bounds = new mapboxgl.LngLatBounds();
                            geometryData.geometry.coordinates.forEach(coord => {
                                bounds.extend(coord);
                            });
                            
                            this.map.fitBounds(bounds, {
                                padding: {
                                    top: 50,
                                    bottom: 50,
                                    left: 50,
                                    right: 384 // Account for sidebar
                                },
                                maxZoom: 15
                            });
                        }
                    }
                } catch (error) {
                    console.error('Failed to load walk geometry:', error);
                    this.error = `Failed to load walk path: ${error.message}`;
                }
            }
            console.groupEnd();
        }
    }));
});

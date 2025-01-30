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
        pathCache: new Map(), // Cache for storing loaded paths

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

                // Get container and ensure it's completely empty
                const mapContainer = document.getElementById('map');
                if (!mapContainer) {
                    throw new Error('Map container not found');
                }

                // Clear all previous content
                while (mapContainer.firstChild) {
                    mapContainer.removeChild(mapContainer.firstChild);
                }

                // Check for WebGL support
                const supported = mapboxgl.supported();
                if (!supported) {
                    throw new Error('WebGL is not supported in this browser');
                }

                // Create map instance
                this.map = new mapboxgl.Map({
                    container: mapContainer,
                    style: this.config.map?.style || 'mapbox://styles/mapbox/outdoors-v12',
                    center: [-5.051, 50.261], // Centered on Truro
                    zoom: 12,
                    preserveDrawingBuffer: true,
                    cooperativeGestures: true,
                    maxPitch: 60, // Limit pitch to avoid terrain cutoff issues
                    minZoom: 5,   // Prevent zooming out too far
                    maxZoom: 18   // Limit maximum zoom level
                });

                // Setup map event handlers
                this.map.on('load', () => {
                    console.log('Map loaded, loading initial walks');
                    this.loadInitialWalks();
                });

                this.map.on('error', (e) => {
                    console.error('Map error:', e);
                    this.error = 'Failed to load map';
                });

                // Add navigation control with passive touchmove listener
                const navControl = new mapboxgl.NavigationControl();
                this.map.addControl(navControl, 'top-left');
                
                // Fix touchmove listener
                const touchmoveHandler = (e) => {
                    e.preventDefault();
                };
                touchmoveHandler.passive = true;
                mapContainer.addEventListener('touchmove', touchmoveHandler, { passive: true });

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

        loadInitialWalks() {
            const walksData = document.getElementById('walks-data');
            if (!walksData?.textContent) {
                console.error('No initial walks data found');
                return;
            }

            try {
                console.log('Loading initial walks...');
                const walks = JSON.parse(walksData.textContent);
                
                // Wait for map to be ready
                if (!this.map) {
                    console.error('Map not initialized');
                    return;
                }

                // Initialize layers
                this.initializeLayers();

                // Clear existing markers
                this.removeAllMarkers();

                // Process walks
                if (Array.isArray(walks) && walks.length > 0) {
                    console.log(`Processing ${walks.length} walks`);
                    this.processInitialWalks(walks);
                } else {
                    console.warn('No walks found in data');
                }
            } catch (err) {
                console.error('Failed to parse walks data:', err);
                this.error = 'Failed to load walks data';
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
            
            const bounds = new mapboxgl.LngLatBounds();

            walks.forEach(walk => {
                if (!this.isValidCoordinates(walk.latitude, walk.longitude)) {
                    console.warn(`Invalid coordinates for walk ${walk.id}`);
                    return;
                }

                console.log('Adding marker for walk:', walk.id, 'at:', walk.longitude, walk.latitude);
                
                // Create marker with default style
                const marker = new mapboxgl.Marker({
                    color: walk.is_favorite ? '#FFD700' : '#4338CA'
                })
                .setLngLat([walk.longitude, walk.latitude])
                .setPopup(
                    new mapboxgl.Popup({
                        closeButton: true,
                        closeOnClick: true,
                        anchor: 'top',
                        offset: [0, -10]
                    })
                    .setHTML(`<h3>${walk.walk_name}</h3>`)
                );

                // Add hover events
                marker.getElement().addEventListener('mouseenter', () => {
                    marker.togglePopup();
                });

                marker.getElement().addEventListener('mouseleave', () => {
                    marker.togglePopup();
                });

                marker.addTo(this.map);
                this.markers.set(walk.id, marker);

                // Add click handler
                marker.getElement().addEventListener('click', () => {
                    this.handleWalkSelection(walk);
                });

                bounds.extend([walk.longitude, walk.latitude]);
            });

            if (!bounds.isEmpty()) {
                console.log('Fitting to bounds:', bounds.toString());
                this.map.fitBounds(bounds, {
                    padding: 50,
                    maxZoom: 14
                });
            }

            console.log('All markers added successfully');
            console.groupEnd();
            this.isMapLoading = false;
        },

        isValidCoordinates(lat, lng) {
            return lat && lng &&
                   !isNaN(lat) && !isNaN(lng) &&
                   lat >= -90 && lat <= 90 &&
                   lng >= -180 && lng <= 180;
        },

        addMarker(walk) {
            if (!this.map || !walk) return null;
            
            if (!this.isValidCoordinates(walk.latitude, walk.longitude)) {
                console.warn(`Invalid coordinates for walk ${walk.id}`);
                return null;
            }

            this.removeMarker(walk.id);

            // Create unique HTML element for marker
            const el = document.createElement('div');
            el.className = 'walk-marker';
            el.setAttribute('data-walk-id', walk.id);
            el.style.backgroundColor = walk.is_favorite ? '#FFD700' : '#4338CA';
            el.style.width = '24px';
            el.style.height = '24px';
            el.style.borderRadius = '50%';
            el.style.cursor = 'pointer';
            el.style.border = '2px solid #ffffff';
            el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

            // Create and configure marker
            const marker = new mapboxgl.Marker({
                element: el,
                anchor: 'center'
            })
            .setLngLat([walk.longitude, walk.latitude])
            .setPopup(
                new mapboxgl.Popup({
                    closeButton: true,
                    closeOnClick: true,
                    anchor: 'top',
                    offset: [0, -10],
                    className: 'walk-popup'
                })
                .setHTML(`<h3 class="walk-title">${walk.walk_name}</h3>`)
            );

            // Use event delegation for better performance
            const handleMarkerEvents = (event) => {
                if (event.type === 'mouseenter') {
                    marker.togglePopup();
                } else if (event.type === 'mouseleave') {
                    marker.togglePopup();
                } else if (event.type === 'click') {
                    this.handleWalkSelection(walk);
                }
            };

            el.addEventListener('mouseenter', handleMarkerEvents);
            el.addEventListener('mouseleave', handleMarkerEvents);
            el.addEventListener('click', handleMarkerEvents);

            marker.addTo(this.map);
            this.markers.set(walk.id, {
                marker,
                element: el,
                handlers: handleMarkerEvents
            });

            console.log('Marker added successfully:', walk.id);
            return marker;
        },

        removeMarker(id) {
            const markerData = this.markers.get(id);
            if (markerData) {
                const { marker, element, handlers } = markerData;
                
                // Remove popup if it exists
                const popup = marker.getPopup();
                if (popup) popup.remove();
                
                // Remove event listeners
                if (element) {
                    element.removeEventListener('mouseenter', handlers);
                    element.removeEventListener('mouseleave', handlers);
                    element.removeEventListener('click', handlers);
                }
                
                // Remove the marker from the map
                marker.remove();
                
                // Clean up references
                this.markers.delete(id);
            }
        },

        removeAllMarkers() {
            this.markers.forEach(({ marker, element, handlers }) => {
                // Remove popup if it exists
                const popup = marker.getPopup();
                if (popup) popup.remove();
                
                // Remove event listeners
                if (element) {
                    element.removeEventListener('mouseenter', handlers);
                    element.removeEventListener('mouseleave', handlers);
                    element.removeEventListener('click', handlers);
                }
                marker.remove();
            });
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
                this.addMarker(detail);

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
                        // Validate and process geometry data
                        const geometry = geometryData.geometry;
                        if (!geometry || !geometry.coordinates || !Array.isArray(geometry.coordinates)) {
                            throw new Error('Invalid geometry data received');
                        }

                        // Filter out any invalid coordinates and ensure minimum length property
                        const validCoordinates = geometry.coordinates.filter(coord =>
                            Array.isArray(coord) &&
                            coord.length >= 2 &&
                            !isNaN(coord[0]) &&
                            !isNaN(coord[1])
                        );

                        if (validCoordinates.length < 2) {
                            throw new Error('Not enough valid coordinates for path');
                        }

                        // Calculate path length for geometry-type point calculations
                        const pathLength = validCoordinates.reduce((total, coord, i) => {
                            if (i === 0) return 0;
                            const prev = validCoordinates[i - 1];
                            const dist = Math.sqrt(
                                Math.pow(coord[0] - prev[0], 2) +
                                Math.pow(coord[1] - prev[1], 2)
                            ) * 111319.9; // Convert to meters
                            return total + dist;
                        }, 0);

                        source.setData({
                            type: 'Feature',
                            properties: {
                                difficulty: detail.difficulty || 'medium',
                                len: pathLength
                            },
                            geometry: {
                                type: 'LineString',
                                coordinates: validCoordinates
                            }
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

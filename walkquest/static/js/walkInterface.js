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
                    center: [-5.051, 50.261], // Centered on Truro
                    zoom: 12,
                    preserveDrawingBuffer: true,
                    cooperativeGestures: true
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

       loadInitialWalks() {
           const walksData = document.getElementById('walks-data');
           if (!walksData?.textContent) {
               console.error('No initial walks data found');
               return;
           }

           try {
               // Add debug logging
               console.log('Raw walks data:', walksData.textContent);
               const walks = JSON.parse(walksData.textContent);
               console.log('Parsed walks:', walks);
               
               // Log specific walk with SVG issue
               const marazionWalk = walks.find(w => w.walk_name === "Marazion to Perranuthnoe");
               if (marazionWalk) {
                   console.log('Marazion walk data:', marazionWalk);
               }
               
               this.processInitialWalks(walks);
           } catch (err) {
               console.error('Failed to parse walks data:', err);
               // Log the specific position where parsing failed
               console.error('Parse error position:', err.message);
               // Try to identify the problematic section
               const errorPos = parseInt(err.message.match(/\d+/)?.[0] || 0);
               if (errorPos) {
                   console.error('Context around error:',
                       walksData.textContent.substring(Math.max(0, errorPos - 50),
                       Math.min(walksData.textContent.length, errorPos + 50))
                   );
               }
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
                
                const marker = new mapboxgl.Marker({
                    color: walk.is_favorite ? '#FFD700' : '#2b2b2b',
                    draggable: false,
                    scale: 1.2
                })
                .setLngLat([walk.longitude, walk.latitude])
                .setPopup(new mapboxgl.Popup().setHTML(
                    `<h3>${walk.walk_name}</h3>`
                ));

                marker.addTo(this.map);
                this.markers.set(walk.id, marker);

                // Add click handler
                marker.getElement().addEventListener('click', () => {
                    Alpine.store('walks').setSelectedWalk(walk);
                    this.showSidebar = true;
                });

                // Add debug popup
                new mapboxgl.Popup({ closeButton: false })
                    .setLngLat([walk.longitude, walk.latitude])
                    .setHTML(`Marker ID: ${walk.id}<br>Coords: ${walk.longitude}, ${walk.latitude}`)
                    .addTo(this.map);

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

            const marker = new mapboxgl.Marker({
                color: walk.is_favorite ? '#FFD700' : '#2b2b2b',
                draggable: false,
                scale: 1.2
            })
            .setLngLat([walk.longitude, walk.latitude])
            .setPopup(new mapboxgl.Popup().setHTML(
                `<h3>${walk.walk_name}</h3>`
            ));

            marker.addTo(this.map);
            this.markers.set(walk.id, marker);

            // Add debug popup
            new mapboxgl.Popup({ closeButton: false })
                .setLngLat([walk.longitude, walk.latitude])
                .setHTML(`Marker ID: ${walk.id}<br>Coords: ${walk.longitude}, ${walk.latitude}`)
                .addTo(this.map);

            // Add click handler
            marker.getElement().addEventListener('click', () => {
                Alpine.store('walks').setSelectedWalk(walk);
                this.showSidebar = true;
            });

            console.log('Marker added successfully:', walk.id);
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

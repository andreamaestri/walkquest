// Initialize Alpine component for map interface
document.addEventListener('alpine:init', () => {
    Alpine.data('walkInterface', () => ({
        map: null,
        markers: new Map(),
        showSidebar: false,
        isMapLoading: true,
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
                try {
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
                        // Force a resize to ensure proper rendering
                        this.map.resize();
                        this.isMapLoading = false;
                    });

                    this.map.on('error', (e) => {
                        console.error('Map error:', e);
                    });

                    // Add navigation control
                    this.map.addControl(new mapboxgl.NavigationControl(), 'top-left');

                    // Add markers for initial walks if available
                    const walksData = document.getElementById('walks-data');
                    if (walksData) {
                        try {
                            const initialData = JSON.parse(walksData.textContent);
                            const walks = initialData.walks || [];
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

                            // If we have walks with coordinates, fit the map to show all markers
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
                        } catch (err) {
                            console.error('Failed to process initial walks:', err);
                        }
                    }
                } catch (error) {
                    console.error('Failed to initialize map:', error);
                }

            } catch (error) {
                console.error('Failed to parse config:', error);
            }
        },

        addMarker({ id, longitude, latitude, is_favorite }, config = {}, onClick) {
            // Remove existing marker if present
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

            // Store marker reference
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
            
            Alpine.store('walks').setSelectedWalk(detail);
            this.showSidebar = true;
            
            // Update map view and add marker if coordinates available
            if (detail.longitude && detail.latitude) {
                // Add or update marker for selected walk
                this.addMarker({
                    id: detail.id,
                    longitude: detail.longitude,
                    latitude: detail.latitude,
                    is_favorite: detail.is_favorite
                }, {}, () => {
                    // Marker click handler
                    Alpine.store('walks').setSelectedWalk(detail);
                    this.showSidebar = true;
                });

                this.map.flyTo({
                    center: [detail.longitude, detail.latitude],
                    zoom: 14,
                    essential: true
                });
            }
        }
    }));
});

// Initialize Alpine component for map interface
document.addEventListener('alpine:init', () => {
    Alpine.data('walkInterface', () => ({
        map: null,
        marker: null,
        showSidebar: false,
        error: null,
        loadingStates: {
            map: false,
            path: false
        },

        init() {
            // Initialize map with custom style and controls
            mapboxgl.accessToken = document.getElementById('mapbox-token').content;
            
            this.map = new mapboxgl.Map({
                container: 'map',
                style: 'mapbox://styles/mapbox/outdoors-v12',
                center: [-0.127758, 51.507351],
                zoom: 10
            });

            // Add map controls
            this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');
            this.map.addControl(new mapboxgl.GeolocateControl({
                positionOptions: { enableHighAccuracy: true },
                trackUserLocation: true
            }), 'top-right');

            // Initialize path source and layer on map load
            this.map.on('load', () => {
                // Add GeoJSON source for walk paths
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

                // Add path layer with styling
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
            });
        },

        // Update path data and styling
        updatePath(pathData, detail) {
            const source = this.map.getSource('walk-path');
            if (!source) return;

            // Validate and process geometry data
            const geometry = pathData.geometry;
            if (!geometry || !geometry.coordinates || !Array.isArray(geometry.coordinates)) {
                throw new Error('Invalid geometry data received');
            }

            // Filter out invalid coordinates
            const validCoordinates = geometry.coordinates.filter(coord =>
                Array.isArray(coord) &&
                coord.length >= 2 &&
                !isNaN(coord[0]) &&
                !isNaN(coord[1])
            );

            if (validCoordinates.length < 2) {
                throw new Error('Not enough valid coordinates for path');
            }

            // Calculate path length
            const pathLength = validCoordinates.reduce((total, coord, i) => {
                if (i === 0) return 0;
                const prev = validCoordinates[i - 1];
                const dist = Math.sqrt(
                    Math.pow(coord[0] - prev[0], 2) +
                    Math.pow(coord[1] - prev[1], 2)
                ) * 111319.9; // Convert to meters
                return total + dist;
            }, 0);

            // Update source data
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

            // Update path appearance based on difficulty
            const color = {
                easy: '#10B981',    // Green
                medium: '#4338CA',  // Indigo
                hard: '#DC2626'     // Red
            }[detail.difficulty] || '#4338CA';

            this.map.setPaintProperty('walk-path', 'line-color', color);

            // Fit bounds to show the entire path
            const bounds = new mapboxgl.LngLatBounds();
            validCoordinates.forEach(coord => bounds.extend(coord));
            
            this.map.fitBounds(bounds, {
                padding: { top: 50, bottom: 50, left: 50, right: 384 },
                maxZoom: 15,
                duration: 1000
            });

            return pathLength;
        },

        handleWalkSelection(detail) {
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

                // Load geometry using HTMX
                const mapPathLayer = document.getElementById('map-path-layer');
                if (mapPathLayer) {
                    try {
                        this.setLoadingState('path', true);
                        this.updateLoadingStatus(`Loading path for ${detail.walk_name}...`);

                        // Clear existing path while loading
                        const source = this.map.getSource('walk-path');
                        if (source) {
                            source.setData({
                                type: 'Feature',
                                properties: {},
                                geometry: { type: 'LineString', coordinates: [] }
                            });
                        }

                        // HTMX will handle the actual request
                        mapPathLayer.setAttribute('hx-get', `/api/walks/${detail.id}/geometry`);
                        mapPathLayer.setAttribute('hx-trigger', 'load');
                        mapPathLayer.setAttribute('aria-busy', 'true');
                        
                        // Listen for HTMX events
                        const handleGeometryLoad = (event) => {
                            if (event.detail.target.id === 'map-path-layer') {
                                try {
                                    const pathData = JSON.parse(document.getElementById('path-data').textContent);
                                    
                                    console.log('Received geometry data:', pathData);
                                    
                                    // Validate and process geometry data
                                    const geometry = pathData.geometry;
                                    if (!geometry || !geometry.coordinates || !Array.isArray(geometry.coordinates)) {
                                        throw new Error('Invalid geometry data received');
                                    }

                                    // Filter out invalid coordinates and calculate path length
                                    const validCoordinates = geometry.coordinates.filter(coord =>
                                        Array.isArray(coord) &&
                                        coord.length >= 2 &&
                                        !isNaN(coord[0]) &&
                                        !isNaN(coord[1])
                                    );

                                    console.log('Valid coordinates count:', validCoordinates.length);

                                    if (validCoordinates.length < 2) {
                                        throw new Error('Not enough valid coordinates for path');
                                    }

                                    // Calculate path length
                                    const pathLength = validCoordinates.reduce((total, coord, i) => {
                                        if (i === 0) return 0;
                                        const prev = validCoordinates[i - 1];
                                        const dist = Math.sqrt(
                                            Math.pow(coord[0] - prev[0], 2) +
                                            Math.pow(coord[1] - prev[1], 2)
                                        ) * 111319.9; // Convert to meters
                                        return total + dist;
                                    }, 0);

                                    console.log('Calculated path length:', pathLength, 'meters');

                                    // Update map source with validated data
                                    const source = this.map.getSource('walk-path');
                                    if (source) {
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

                                        // Update path appearance based on difficulty
                                        const color = {
                                            easy: '#10B981',    // Green
                                            medium: '#4338CA',  // Indigo
                                            hard: '#DC2626'     // Red
                                        }[detail.difficulty] || '#4338CA';

                                        this.map.setPaintProperty('walk-path', 'line-color', color);
                                        
                                        // Update loading state and accessibility feedback
                                        this.setLoadingState('path', false);
                                        this.updateLoadingStatus(`Path loaded for ${detail.walk_name}`);
                                        mapPathLayer.setAttribute('aria-busy', 'false');
                                    }
                                } catch (error) {
                                    console.error('Failed to process geometry data:', error);
                                    this.updateErrorStatus(`Failed to process walk path: ${error.message}`);
                                    this.setLoadingState('path', false);
                                    mapPathLayer.setAttribute('aria-busy', 'false');
                                }

                                // Clean up event listener
                                document.body.removeEventListener('htmx:afterSettle', handleGeometryLoad);
                            }
                        };

                        // Handle HTMX error events
                        const handleGeometryError = (event) => {
                            if (event.detail.target.id === 'map-path-layer') {
                                console.error('HTMX request failed');
                                this.updateErrorStatus('Failed to load walk path. Please try again.');
                                this.setLoadingState('path', false);
                                mapPathLayer.setAttribute('aria-busy', 'false');
                                document.body.removeEventListener('htmx:error', handleGeometryError);
                            }
                        };

                        document.body.addEventListener('htmx:afterSettle', handleGeometryLoad);
                        
                        // Trigger HTMX load
                        htmx.trigger(mapPathLayer, 'load');
                    } catch (error) {
                        console.error('Failed to load walk geometry:', error);
                        this.error = `Failed to load walk path: ${error.message}`;
                    }
                }
                // Clean up and end console group
                console.groupEnd();
            }
        },
    }));
});

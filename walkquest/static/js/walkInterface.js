// Define component function
function walkInterface() {
    return {
        showSidebar: true,
        selectedWalk: null,
        isLoading: false,
        filteredWalks: [],
        map: null,
        markers: new Map(),
        currentRoute: null,

        init() {
            const configData = document.getElementById('config-data');
            const walksData = document.getElementById('walks-data');
            
            this.config = configData ? JSON.parse(configData.textContent) : {};
            this.filteredWalks = walksData ? JSON.parse(walksData.textContent).walks || [] : [];

            this.initializeMap();
            this.setupEventListeners();

            // Listen for walk selection from walk list
            this.$el.addEventListener('walk-selected', (e) => {
                const walk = this.filteredWalks.find(w => w.id === e.detail);
                if (walk) {
                    this.selectWalk(walk);
                }
            });

            // Listen for walk hover events
            document.addEventListener('walk-hover', async (e) => {
                const walkId = e.detail;
                if (walkId) {
                    await this.previewWalkPath(walkId);
                } else {
                    this.clearPathPreview();
                }
            });
        },

        destroy() {
            if (this.map) {
                this.map.remove();
            }
            this.markers.forEach(marker => marker.remove());
            this.removeEventListeners();
        },

        setupEventListeners() {
            window.addEventListener('resize', this.handleResize.bind(this), { passive: true });
            
            if (this.$refs.map) {
                this.$refs.map.addEventListener('touchmove', () => {}, { passive: true });
                this.$refs.map.addEventListener('touchstart', () => {}, { passive: true });
            }
        },

        removeEventListeners() {
            window.removeEventListener('resize', this.handleResize.bind(this));
        },

        handleResize() {
            if (this.map) {
                this.map.resize();
            }
        },

        async initializeMap() {
            if (!this.$refs.map) return;

            this.$refs.map.innerHTML = '';

            if (!this.config.mapboxToken) {
                console.error('Mapbox token not found in configuration');
                this.$refs.map.innerHTML = '<div class="error-message">Map configuration missing. Please check environment variables.</div>';
                return;
            }

            try {
                this.map = new mapboxgl.Map({
                    container: this.$refs.map,
                    style: this.config.map?.style || 'mapbox://styles/mapbox/outdoors-v12',
                    center: this.config.map?.defaultCenter || [-4.85, 50.4],
                    zoom: this.config.map?.defaultZoom || 9.5,
                    accessToken: this.config.mapboxToken
                });

                this.map.on('load', () => {
                    this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');
                    this.updateMarkers(this.filteredWalks);
                });
            } catch (error) {
                console.error('Map initialization failed:', error);
                this.$refs.map.innerHTML = '<div class="error-message">Failed to load map. Please check your internet connection.</div>';
            }
        },

        updateMarkers(walks) {
            if (!this.map) return;

            this.markers.forEach(marker => marker.remove());
            this.markers.clear();

            walks.forEach(walk => {
                const markerColor = walk.is_favorite 
                    ? this.config.map.markerColors.favorite 
                    : this.config.map.markerColors.default;

                const marker = new mapboxgl.Marker({ color: markerColor })
                    .setLngLat([walk.longitude, walk.latitude])
                    .setPopup(new mapboxgl.Popup().setHTML(`
                        <h4>${this.sanitizeHtml(walk.walk_name)}</h4>
                        <p>${this.formatDistance(walk.distance)}</p>
                    `))
                    .addTo(this.map);

                marker.getElement().addEventListener('click', () => {
                    this.selectWalk(walk);
                });

                this.markers.set(walk.id, marker);
            });
        },

        async selectWalk(walk) {
            if (!walk || walk.id === this.selectedWalk?.id) return;

            try {
                this.isLoading = true;
                const walkId = walk.id;
                
                // Highlight the selected marker
                this.markers.forEach((marker, id) => {
                    const element = marker.getElement();
                    element.classList.toggle('marker-selected', id === walkId);
                });

                const [walkResponse, geometryResponse] = await Promise.all([
                    fetch(`/api/walks/${walkId}`),
                    fetch(`/api/walks/${walkId}/geometry`)
                ]);

                const [walkData, geometry] = await Promise.all([
                    walkResponse.json(),
                    geometryResponse.json()
                ]);

                this.selectedWalk = walkData;
                
                // Add smooth transition to map movement
                if (geometry?.geometry?.coordinates) {
                    const bounds = new mapboxgl.LngLatBounds();
                    geometry.geometry.coordinates.forEach(coord => {
                        if (Array.isArray(coord) && coord.length >= 2) {
                            bounds.extend(coord);
                        }
                    });
                    
                    // Smooth zoom and pan to the route
                    this.map.fitBounds(bounds, {
                        padding: { top: 50, bottom: 50, left: 50, right: this.showSidebar ? 450 : 50 },
                        duration: 1000,
                        essential: true
                    });
                }

                await this.displayWalkGeometry(geometry);
            } catch (error) {
                console.error('Failed to load walk details:', error);
            } finally {
                this.isLoading = false;
            }
        },

        async displayWalkGeometry(geometry, isPreview = false) {
            if (!this.map || !geometry?.geometry?.coordinates) return;

            // Clean up existing route
            if (this.currentRoute && !isPreview) {
                this.clearPathPreview();
            }

            const prefix = isPreview ? 'preview-' : '';
            const sourceId = `${prefix}route-${geometry.properties?.walk_id || Date.now()}`;
            const layerId = `${prefix}route-layer-${geometry.properties?.walk_id || Date.now()}`;

            try {
                // Add the route with animation
                this.map.addSource(sourceId, {
                    type: 'geojson',
                    data: geometry,
                    lineMetrics: true
                });

                this.map.addLayer({
                    id: layerId,
                    type: 'line',
                    source: sourceId,
                    layout: {
                        'line-join': 'round',
                        'line-cap': 'round'
                    },
                    paint: {
                        'line-color': isPreview ? 'rgba(33, 148, 243, 0.5)' : this.config.map.markerColors.selected,
                        'line-width': isPreview ? 3 : 4,
                        'line-gradient': [
                            'interpolate',
                            ['linear'],
                            ['line-progress'],
                            0, 'rgba(33, 148, 243, 0)',
                            1, this.config.map.markerColors.selected
                        ]
                    }
                });

                this.currentRoute = layerId;
            } catch (error) {
                console.error('Error displaying walk geometry:', error);
            }
        },

        async previewWalkPath(walkId) {
            try {
                const response = await fetch(`/api/walks/${walkId}/geometry`);
                const geometry = await response.json();
                await this.displayWalkGeometry(geometry, true);
            } catch (error) {
                console.error('Error loading walk geometry preview:', error);
            }
        },

        clearPathPreview() {
            if (this.map) {
                try {
                    const previewLayerId = this.map.getStyle().layers
                        .find(layer => layer.id.startsWith('preview-route-layer-'))?.id;
                    const previewSourceId = this.map.getStyle().sources
                        .find(source => source.id.startsWith('preview-route-'))?.id;

                    if (previewLayerId) {
                        this.map.removeLayer(previewLayerId);
                    }
                    if (previewSourceId) {
                        this.map.removeSource(previewSourceId);
                    }
                } catch (error) {
                    console.warn('Error cleaning up preview route:', error);
                }
            }
        },

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
        }
    };
}

export default walkInterface;

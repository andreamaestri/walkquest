// Register global Alpine component
document.addEventListener('alpine:init', () => {
    Alpine.data('walkInterface', function() {
        return {
            showSidebar: true,
            searchQuery: '',
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
                }
            },

            async searchWalks(query) {
                this.isLoading = true;
                try {
                    const response = await fetch(`/api/walks/filter`, {
                        method: 'POST',  
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': document.querySelector('meta[name="csrf-token"]').content
                        },
                        body: JSON.stringify({ search: query })
                    });
                    const data = await response.json();
                    this.filteredWalks = data.walks || [];
                    this.updateMarkers(this.filteredWalks);
                } catch (error) {
                    console.error('Search failed:', error);
                } finally {
                    this.isLoading = false;
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
                        this.selectWalk(walk.id);
                    });

                    this.markers.set(walk.id, marker);
                });
            },

            async selectWalk(id) {
                if (id === this.selectedWalk?.id) return;

                try {
                    const [walkResponse, geometryResponse] = await Promise.all([
                        fetch(`/api/walks/${id}`),
                        fetch(`/api/walks/${id}/geometry`)
                    ]);

                    const [walk, geometry] = await Promise.all([
                        walkResponse.json(),
                        geometryResponse.json()
                    ]);

                    this.selectedWalk = walk;
                    this.displayWalkGeometry(geometry);
                } catch (error) {
                    console.error('Failed to load walk details:', error);
                    this.selectedWalk = null;
                }
            },

            displayWalkGeometry(geometry) {
                if (!this.map || !geometry?.geometry?.coordinates) return;

                if (this.currentRoute) {
                    try {
                        if (this.map.getLayer(this.currentRoute)) {
                            this.map.removeLayer(this.currentRoute);
                        }
                        if (this.map.getSource(this.currentRoute)) {
                            this.map.removeSource(this.currentRoute);
                        }
                    } catch (error) {
                        console.warn('Error cleaning up previous route:', error);
                    }
                }

                const sourceId = `route-${geometry.properties?.walk_id || Date.now()}`;
                const layerId = `route-layer-${geometry.properties?.walk_id || Date.now()}`;

                try {
                    this.map.addSource(sourceId, {
                        type: 'geojson',
                        data: geometry
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
                            'line-color': this.config.map.markerColors.selected,
                            'line-width': 4
                        }
                    });

                    this.currentRoute = layerId;

                    const bounds = new mapboxgl.LngLatBounds();
                    geometry.geometry.coordinates.forEach(coord => {
                        if (Array.isArray(coord) && coord.length >= 2) {
                            bounds.extend(coord);
                        }
                    });
                    this.map.fitBounds(bounds, { padding: 50 });
                } catch (error) {
                    console.error('Error displaying walk geometry:', error);
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
            },

            debounce(fn, wait) {
                let timeout;
                return function(...args) {
                    clearTimeout(timeout);
                    timeout = setTimeout(() => fn.apply(this, args), wait);
                };
            }
        };
    });
});

import { api } from '../services.js';
import { getCategoryEmoji, getCategoryColor } from '../alpine-components.js';

export function walkInterface() {
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
            // Parse initial data from Django templates
            this.config = JSON.parse(document.getElementById('config-data')?.textContent || '{}');
            const walksData = JSON.parse(document.getElementById('walks-data')?.textContent || '{}');
            this.filteredWalks = walksData.walks || [];

            // Initialize map after DOM is ready
            this.$nextTick(() => {
                this.initializeMap();
                this.setupEventListeners();
            });
        },

        // Cleanup when component is destroyed
        destroy() {
            if (this.map) {
                this.map.remove();
            }
            this.markers.forEach(marker => marker.remove());
            // Clean up any event listeners if needed
            this.removeEventListeners();
        },

        // Setup any necessary event listeners
        setupEventListeners() {
            // Add any global event listeners here
            window.addEventListener('resize', this.handleResize.bind(this));
        },

        // Remove event listeners
        removeEventListeners() {
            window.removeEventListener('resize', this.handleResize.bind(this));
        },

        // Handle window resize
        handleResize() {
            if (this.map) {
                this.map.resize();
            }
        },

        // Use Alpine's $watch for reactive properties
        $watch: {
            searchQuery(value) {
                this.debounce(() => this.searchWalks(value), 500);
            }
        },

        async initializeMap() {
            if (!this.$refs.map) return;

            try {
                this.map = new mapboxgl.Map({
                    container: this.$refs.map,
                    style: 'mapbox://styles/mapbox/streets-v12',
                    center: this.config.map?.defaultCenter || [-4.85, 50.4],
                    zoom: this.config.map?.defaultZoom || 9.5,
                    accessToken: 'YOUR_MAPBOX_ACCESS_TOKEN'
                });

                this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');
                await new Promise(resolve => this.map.on('load', resolve));
                
                this.updateMarkers(this.filteredWalks);
            } catch (error) {
                console.error('Map initialization failed:', error);
            }
        },

        async searchWalks(query) {
            this.isLoading = true;
            try {
                const response = await api.filterWalks({ search: query });
                this.filteredWalks = response.walks || [];
                this.updateMarkers(this.filteredWalks);
            } catch (error) {
                console.error('Search failed:', error);
            } finally {
                this.isLoading = false;
            }
        },

        updateMarkers(walks) {
            if (!this.map) return;

            // Remove existing markers
            this.markers.forEach(marker => marker.remove());
            this.markers.clear();

            // Add new markers
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
                const [walk, geometry] = await Promise.all([
                    api.getWalk(id),
                    api.getWalkGeometry(id)
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

            // Remove existing route
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

            // Add new route
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

                // Fit bounds to show full route
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

        // Utility methods
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
}
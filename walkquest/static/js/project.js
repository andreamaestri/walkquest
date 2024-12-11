// Import dependencies
const mapboxgl = window.mapboxgl;
const Supercluster = window.Supercluster;

// Core configuration
export const CONFIG = {
    map: {
        style: "mapbox://styles/mapbox/outdoors-v12",
        defaultCenter: [-4.85, 50.4],
        defaultZoom: 9.5,
        bounds: [[-5.75, 49.95], [-4.15, 50.85]],
        maxBounds: [[-6.5, 49.5], [-3.5, 51.5]],
        minZoom: 8,
        maxZoom: 16,
        markerColors: { 
            default: "#3FB1CE", 
            selected: "#DC2626"
        }
    },
    markers: {
        clustering: {
            radius: 50,
            maxZoom: 14,
            minPoints: 2
        }
    }
};

// Utility functions
const utils = {
    formatDistance: d => d ? `${Number(d).toFixed(1)} miles` : "Distance unknown",
    
    createMarkerPopup: (walk) => `
        <div class="p-3">
            <h3 class="font-semibold">${walk.walk_name}</h3>
            <p class="text-sm text-gray-600">${walk.steepness_level} | ${walk.distance} miles</p>
        </div>
    `
};

// Map initialization helper
export const initializeMap = (elementId, config) => {
    const container = document.getElementById(elementId);
    if (!container) throw new Error('Map container not found');

    mapboxgl.accessToken = config.mapboxToken;
    
    return new mapboxgl.Map({
        container,
        style: CONFIG.map.style,
        center: CONFIG.map.defaultCenter,
        zoom: CONFIG.map.defaultZoom,
        maxBounds: CONFIG.map.maxBounds,
        minZoom: CONFIG.map.minZoom,
        maxZoom: CONFIG.map.maxZoom
    });
};

// HTMX extensions
htmx.defineExtension('map-update', {
    onEvent: function(name, evt) {
        if (name === "htmx:afterRequest" && evt.detail.successful) {
            try {
                const walks = JSON.parse(evt.detail.xhr.response);
                Alpine.store('walks').setWalks(walks);
            } catch (error) {
                console.error('Failed to parse walks:', error);
            }
        }
    }
});

// Alpine.js store registration
document.addEventListener('alpine:init', () => {
    Alpine.store('walks', function() {
        return {
            ready: false,
            walks: [],
            selectedWalkId: this.$persist(null).as('selectedWalkId'),
            map: null,
            markers: new Map(),
            filters: {
                searchQuery: this.$persist('').as('searchQuery'),
                activeFilters: this.$persist([]).as('activeFilters')
            },
            isLoading: false,

            async initialize() {
                if (this.ready) return true; // Prevent double initialization
                
                try {
                    const config = JSON.parse(document.getElementById('config-data').textContent);
                    const initialWalks = JSON.parse(document.getElementById('walks-data').textContent);
                    
                    // Initialize Mapbox
                    mapboxgl.accessToken = config.mapboxToken;
                    this.initializeMap();
                    
                    // Load initial walks
                    this.setWalks(initialWalks);
                    
                    this.ready = true;
                    return true;
                } catch (error) {
                    console.error('Initialization failed:', error);
                    return false;
                }
            },

            initializeMap() {
                const mapContainer = document.getElementById('map');
                if (!mapContainer) throw new Error('Map container not found');
                this.map = new mapboxgl.Map({
                    container: 'map',
                    style: config.map.style,
                    center: config.map.defaultCenter,
                    zoom: config.map.defaultZoom,
                });
            },

            setWalks(walks) {
                this.walks = walks;
                this.updateMarkers();
            },

            updateMarkers() {
                this.cleanup();
                this.walks.forEach(walk => {
                    const marker = new mapboxgl.Marker({
                        color: walk.id === this.selectedWalkId ? '#DC2626' : '#3FB1CE',
                        scale: walk.id === this.selectedWalkId ? 1.2 : 1
                    })
                    .setLngLat([walk.longitude, walk.latitude])
                    .setPopup(
                        new mapboxgl.Popup({ offset: 25 })
                        .setHTML(`
                            <div class="p-3">
                                <h3 class="font-semibold">${walk.walk_name}</h3>
                                <p class="text-sm text-gray-600">${walk.steepness_level} | ${walk.distance} miles</p>
                            </div>
                        `)
                    )
                    .addTo(this.map);

                    // Add click handler
                    marker.getElement().addEventListener('click', () => {
                        this.selectWalk(walk.id);
                    });

                    this.markers.set(walk.id, marker);
                });
            },

            selectWalk(id) {
                this.selectedWalkId = id;
                this.updateMarkers();
            },

            search(query) {
                this.filters.searchQuery = query;
                this.updateMarkers();
            },

            setFilters(filters) {
                this.filters.activeFilters = filters;
                this.updateMarkers();
            },

            cleanup() {
                this.markers.forEach(m => m.remove());
                this.markers.clear();
                if (this.map) this.map.remove();
                this.map = null;
                this.walks = [];
            }
        }
    });
});

// Export minimal API for legacy compatibility
export const walkStore = {
    initialize: (mapId) => Alpine.store('walks').initialize(mapId),
    cleanup: () => Alpine.store('walks').cleanup()
};

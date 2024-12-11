let Alpine = null;

// Export init function to be called after Alpine.js is ready
export async function initAlpine(_Alpine) {
    if (!_Alpine) throw new Error('Alpine instance must be provided');
    Alpine = _Alpine;
    
    // Register stores after Alpine is ready
    Alpine.store('app', createAppStore());
    Alpine.store('walks', createWalkStore());
    
    // Initialize app store
    await Alpine.store('app').initialize();
}

// Ensure Alpine is available
function getAlpine() {
    if (!Alpine) throw new Error('Alpine.js not initialized. Call initAlpine first.');
    return Alpine;
}

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

// Store definition with Alpine integration
const createWalkStore = () => ({
    ready: false,
    walks: [],
    selectedWalkId: null,
    map: null,
    markers: new Map(),
    filters: {
        searchQuery: '',
        activeFilters: []
    },
    isLoading: false,

    // Initialize with Alpine persist
    init() {
        const $persist = getAlpine().$persist;
        this.selectedWalkId = $persist(this.selectedWalkId).as('selectedWalkId');
        this.filters = {
            searchQuery: $persist(this.filters.searchQuery).as('searchQuery'),
            activeFilters: $persist(this.filters.activeFilters).as('activeFilters')
        };
        return this;
    },

    async initialize() {
        if (this.ready) return true;
        
        try {
            if (!this.checkLocalStorage()) {
                console.warn('LocalStorage not available, persistence disabled');
                return false;
            }

            // Initialize map and data
            await this.initializeMapAndData();
            
            // Set ready state
            this.ready = true;
            return true;
        } catch (error) {
            console.error('Initialization failed:', error);
            return false;
        }
    },

    async initializeMapAndData() {
        const [configElement, walksElement] = ['config-data', 'walks-data']
            .map(id => document.getElementById(id));
            
        if (!configElement || !walksElement) {
            throw new Error('Required data elements not found');
        }

        const config = JSON.parse(configElement.textContent);
        const initialWalks = JSON.parse(walksElement.textContent);
        
        mapboxgl.accessToken = config.mapboxToken;
        await this.initializeMap();
        this.setWalks(initialWalks);
    },

    checkLocalStorage() {
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            return true;
        } catch (e) {
            return false;
        }
    },

    initializeMap() {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) throw new Error('Map container not found');
        
        this.map = new mapboxgl.Map({
            container: 'map',
            style: CONFIG.map.style,
            center: CONFIG.map.defaultCenter,
            zoom: CONFIG.map.defaultZoom,
            maxBounds: CONFIG.map.maxBounds,
            minZoom: CONFIG.map.minZoom,
            maxZoom: CONFIG.map.maxZoom
        });

        return new Promise((resolve) => {
            this.map.on('load', () => resolve());
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
                color: walk.id === this.selectedWalkId ? CONFIG.map.markerColors.selected : CONFIG.map.markerColors.default,
                scale: walk.id === this.selectedWalkId ? 1.2 : 1
            })
            .setLngLat([walk.longitude, walk.latitude])
            .setPopup(
                new mapboxgl.Popup({ offset: 25 })
                .setHTML(utils.createMarkerPopup(walk))
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
        if (this.markers) {
            this.markers.forEach(m => m.remove());
            this.markers.clear();
        }
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        this.walks = [];
        this.ready = false;
    }
});

// Create base app store
export const createAppStore = () => ({
    initialized: false,
    async initialize() {
        try {
            this.initialized = false;
            // Initialize walks store
            if (Alpine.store('walks')) {
                await Alpine.store('walks').initialize();
            }
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('App initialization failed:', error);
            return false;
        }
    }
});

// Export walkStore interface with Alpine integration
export const walkStore = {
    get alpine() {
        return getAlpine();
    },

    async initialize() {
        try {
            const store = this.alpine.store('walks');
            if (!store) {
                throw new Error('Alpine walks store not found');
            }
            await store.initialize();
            return true;
        } catch (error) {
            console.error('Failed to initialize walkStore:', error);
            return false;
        }
    },

    async fetchWalks(params) {
        try {
            const response = await fetch(`/api/walks/?${params.toString()}`);
            if (!response.ok) throw new Error('Network response was not ok');
            
            const walks = await response.json();
            this.alpine.store('walks').setWalks(walks);
            window.dispatchEvent(new CustomEvent('walk-data-loaded'));
            
            return walks;
        } catch (error) {
            console.error('Error fetching walks:', error);
            throw error;
        }
    },

    cleanup() {
        this.alpine.store('walks').cleanup();
    },

    selectWalk(walkId) {
        this.alpine.store('walks').selectWalk(walkId);
    },

    updateFilters(filters) {
        this.alpine.store('walks').setFilters(filters);
    },

    search(query) {
        this.alpine.store('walks').search(query);
    }
};

// Initialize when document is ready
document.addEventListener('alpine:init', () => {
    initAlpine(window.Alpine);
});

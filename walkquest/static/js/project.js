/**
 * Main WalkQuest application logic
 * This is the sole location for walkInterface component registration
 * CategoryCombobox is registered in alpine-components.js
 */
import mapboxgl from 'mapbox-gl';

// Core configuration
export const CONFIG = {
    map: {
        style: "mapbox://styles/mapbox/outdoors-v12",
        defaultCenter: [-4.85, 50.4],
        defaultZoom: 9.5,
        bounds: [[-5.75, 49.95], [-4.15, 50.85]],
        maxBounds: [[-6.5, 49.5], [-3.5, 51.5]],
        minZoom: 8,
        maxZoom: 16
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

// Add localStorage utility functions
const storage = {
    get: (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Error reading from localStorage:', e);
            return defaultValue;
        }
    },
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Error writing to localStorage:', e);
        }
    }
};

// Alpine Store Definitions
const walkStore = {
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

    init() {
        // Load initial values from localStorage
        this.selectedWalkId = storage.get('selectedWalkId', null);
        this.filters = {
            searchQuery: storage.get('searchQuery', ''),
            activeFilters: storage.get('activeFilters', [])
        };

        // Setup persistence
        Alpine.effect(() => {
            storage.set('selectedWalkId', this.selectedWalkId);
            storage.set('searchQuery', this.filters.searchQuery);
            storage.set('activeFilters', this.filters.activeFilters);
        });

        this.initialize();
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
        const configElement = document.getElementById('config-data');
        const walksElement = document.getElementById('walks-data');
            
        if (!configElement || !walksElement) {
            throw new Error('Required data elements not found');
        }

        let config, initialWalks;
        
        try {
            // Get the text content and trim any whitespace
            const configText = configElement.textContent.trim();
            const walksText = walksElement.textContent.trim();
            
            config = JSON.parse(configText);
            initialWalks = JSON.parse(walksText);
        } catch (error) {
            console.error('Error parsing JSON data:', error);
            throw new Error('Failed to parse configuration data');
        }

        if (!config.mapboxToken) {
            throw new Error('Mapbox token not found in configuration');
        }
        
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
            const marker = new mapboxgl.Marker()
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
};

const appStore = {
    initialized: false,

    async initialize() {
        try {
            this.initialized = false;
            
            // Ensure walks store exists
            if (!Alpine.store('walks')) {
                throw new Error('Walks store not registered');
            }

            // Initialize walks store and wait for completion
            const walksInitialized = await Alpine.store('walks').initialize();
            if (!walksInitialized) {
                throw new Error('Walks store initialization failed');
            }

            this.initialized = true;
            return true;
        } catch (error) {
            console.error('App initialization failed:', error);
            this.initialized = false;
            return false;
        }
    }
};

// Define Alpine extension with lifecycle hooks
const WalkQuestExtension = {
    init() {
        if (!window.Alpine) {
            console.error('Alpine.js not found');
            return;
        }

        try {
            // Register stores with proper error handling
            this.registerStores();
            
            // Register walk interface component
            this.registerWalkInterface();

            // Initialize app store with proper timing
            this.initializeAppStore();
        } catch (error) {
            console.error('Failed to initialize WalkQuest:', error);
        }
    },

    registerStores() {
        Alpine.store('walks', walkStore);
        Alpine.store('app', appStore);
    },

    initializeAppStore() {
        requestAnimationFrame(() => {
            Alpine.store('app').initialize().then(initialized => {
                if (!initialized) {
                    console.error('Failed to initialize app store');
                }
            });
        });
    },

    registerWalkInterface() {
        Alpine.data('walkInterface', () => ({
            showSidebar: storage.get('showSidebar', true),
            searchQuery: '',
            selectedWalk: null,
            isLoading: false,
            filteredWalks: [],

            init() {
                // Setup persistence effects
                Alpine.effect(() => {
                    storage.set('showSidebar', this.showSidebar);
                    storage.set('searchQuery', this.searchQuery);
                });

                // Watch for selected walk changes
                this.$watch('selectedWalk', (walkId) => {
                    if (walkId !== null) {
                        this.$store.walks.selectWalk(walkId);
                        this.centerMapOnWalk(walkId);
                    }
                });

                // Initial data load
                this.loadWalks();
            },

            async loadWalks() {
                this.isLoading = true;
                try {
                    this.filteredWalks = this.$store.walks.walks;
                    this.applyFilters();
                } catch (error) {
                    console.error('Failed to load walks:', error);
                    this.filteredWalks = [];
                } finally {
                    this.isLoading = false;
                }
            },

            applyFilters() {
                let filtered = this.$store.walks.walks;

                // Apply search query filter
                if (this.searchQuery) {
                    const query = this.searchQuery.toLowerCase();
                    filtered = filtered.filter(walk => 
                        walk.walk_name.toLowerCase().includes(query) ||
                        walk.description.toLowerCase().includes(query)
                    );
                }

                // Apply active filters if any
                if (this.$store.walks.filters.activeFilters.length > 0) {
                    filtered = filtered.filter(walk => 
                        this.$store.walks.filters.activeFilters.includes(walk.steepness_level)
                    );
                }

                this.filteredWalks = filtered;
            },

            centerMapOnWalk(walkId) {
                const walk = this.$store.walks.walks.find(w => w.id === walkId);
                if (walk && this.$store.walks.map) {
                    this.$store.walks.map.flyTo({
                        center: [walk.longitude, walk.latitude],
                        zoom: 14,
                        essential: true
                    });
                }
            },

            toggleSidebar() {
                this.showSidebar = !this.showSidebar;
            },

            handleSearch() {
                this.$store.walks.search(this.searchQuery);
                this.applyFilters();
            },

            handleFilterChange(filters) {
                this.$store.walks.setFilters(filters);
                this.applyFilters();
            },

            formatDistance(distance) {
                return utils.formatDistance(distance);
            }
        }));
    }
};

// Initialize when Alpine is ready
document.addEventListener('alpine:init', () => {
    WalkQuestExtension.init();
});

export default WalkQuestExtension;
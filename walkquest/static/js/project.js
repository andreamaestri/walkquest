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
    `,

    getJsonData(elementId, fallback) {
        try {
            const element = document.getElementById(elementId);
            return element ? JSON.parse(element.textContent.trim()) : fallback;
        } catch (e) {
            console.error(`Error parsing ${elementId}:`, e);
            return fallback;
        }
    }
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
    currentLineLayer: null,
    filters: {
        searchQuery: '',
        activeFilters: []
    },
    isLoading: false,
    initializationInProgress: false,

    init() {
        // Guard against multiple initialization attempts
        if (this.initializationInProgress) {
            console.warn('Initialization already in progress');
            return;
        }
        
        // Load stored values without triggering effects
        this.loadStoredValues();
        
        // Initialize the store
        this.initialize();
    },

    loadStoredValues() {
        // Load values without triggering reactive updates
        const storedValues = {
            selectedWalkId: storage.get('selectedWalkId', null),
            searchQuery: storage.get('searchQuery', ''),
            activeFilters: storage.get('activeFilters', [])
        };

        this.selectedWalkId = storedValues.selectedWalkId;
        this.filters = {
            searchQuery: storedValues.searchQuery,
            activeFilters: storedValues.activeFilters
        };
    },

    setupPersistence() {
        // Setup persistence separately from initialization
        Alpine.effect(() => {
            if (this.ready) {  // Only persist after initialization
                storage.set('selectedWalkId', this.selectedWalkId);
                storage.set('searchQuery', this.filters.searchQuery);
                storage.set('activeFilters', this.filters.activeFilters);
            }
        });
    },

    async initialize() {
        if (this.ready || this.initializationInProgress) return true;
        
        this.initializationInProgress = true;
        
        try {
            if (!this.checkLocalStorage()) {
                console.warn('LocalStorage not available, persistence disabled');
                return false;
            }

            await this.initializeMapAndMarkers();
            
            // Setup persistence after successful initialization
            this.setupPersistence();
            
            this.ready = true;
            return true;
        } catch (error) {
            console.error('Initialization failed:', error);
            return false;
        } finally {
            this.initializationInProgress = false;
        }
    },

    async initializeMapAndMarkers() {
        const { config, walks } = await this.loadInitialData();
        await this.initializeMap(config.mapboxToken);
        this.setWalks(walks);
    },

    async loadInitialData() {
        const configElement = document.getElementById('config-data');
        const walksElement = document.getElementById('walks-data');
            
        if (!configElement || !walksElement) {
            throw new Error('Required data elements not found');
        }

        try {
            const config = JSON.parse(configElement.textContent.trim());
            const walks = JSON.parse(walksElement.textContent.trim());
            
            if (!config.mapboxToken) {
                throw new Error('Mapbox token not found in configuration');
            }

            return { config, walks };
        } catch (error) {
            console.error('Error parsing JSON data:', error);
            throw new Error('Failed to parse configuration data');
        }
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

    initializeMap(token) {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) throw new Error('Map container not found');
        
        this.map = new mapboxgl.Map({
            container: 'map',
            style: CONFIG.map.style,
            center: CONFIG.map.defaultCenter,
            zoom: CONFIG.map.defaultZoom,
            maxBounds: CONFIG.map.maxBounds,
            minZoom: CONFIG.map.minZoom,
            maxZoom: CONFIG.map.maxZoom,
            accessToken: token
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

    async selectWalk(id) {
        // Remove previous LineString if exists
        this.removeCurrentLineLayer();
        
        this.selectedWalkId = id;
        
        // Highlight selected marker
        this.updateMarkerStates();
        
        if (id) {
            await this.loadAndDisplayWalkLine(id);
        }
    },

    updateMarkerStates() {
        this.markers.forEach((marker, walkId) => {
            const element = marker.getElement();
            if (walkId === this.selectedWalkId) {
                element.classList.add('marker-selected');
            } else {
                element.classList.remove('marker-selected');
            }
        });
    },

    async loadAndDisplayWalkLine(walkId) {
        try {
            const response = await fetch(`/api/walks/${walkId}/line/`);
            if (!response.ok) throw new Error('Failed to fetch walk line');
            
            const lineString = await response.json();
            this.displayWalkLine(lineString);
        } catch (error) {
            console.error('Error loading walk line:', error);
        }
    },

    displayWalkLine(lineString) {
        if (!this.map || !lineString) return;

        const layerId = `walk-line-${this.selectedWalkId}`;

        // Add the line layer
        this.map.addSource(layerId, {
            'type': 'geojson',
            'data': lineString
        });

        this.map.addLayer({
            'id': layerId,
            'type': 'line',
            'source': layerId,
            'layout': {
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': '#FF4500',
                'line-width': 3
            }
        });

        this.currentLineLayer = layerId;

        // Fit bounds to the line
        const coordinates = lineString.geometry.coordinates;
        if (coordinates.length > 0) {
            const bounds = coordinates.reduce((bounds, coord) => {
                return bounds.extend(coord);
            }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

            this.map.fitBounds(bounds, {
                padding: 50,
                maxZoom: 15
            });
        }
    },

    removeCurrentLineLayer() {
        if (this.currentLineLayer && this.map) {
            if (this.map.getLayer(this.currentLineLayer)) {
                this.map.removeLayer(this.currentLineLayer);
            }
            if (this.map.getSource(this.currentLineLayer)) {
                this.map.removeSource(this.currentLineLayer);
            }
            this.currentLineLayer = null;
        }
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
        this.removeCurrentLineLayer();
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
        this.initializationInProgress = false;
    }
};

const appStore = {
    initialized: false,
    initializationPromise: null,

    async initialize() {
        // Return existing initialization promise if in progress
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = (async () => {
            try {
                if (this.initialized) return true;
                this.initialized = false;
                
                if (!Alpine.store('walks')) {
                    throw new Error('Walks store not registered');
                }

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
            } finally {
                this.initializationPromise = null;
            }
        })();

        return this.initializationPromise;
    }
};

// Define Alpine extension with lifecycle hooks
const WalkQuestExtension = {
    initialized: false,
    
    init() {
        if (this.initialized) return;
        
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
            this.initialized = true;
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
            initialized: false,
            initializationError: null,

            async init() {
                if (this.initialized) return;
                
                try {
                    this.isLoading = true;
                    
                    // Load initial data
                    const config = utils.getJsonData('config-data', {});
                    const walks = utils.getJsonData('walks-data', []);
                    const tags = utils.getJsonData('tags-data', []);
                    
                    if (!config.mapboxToken) {
                        throw new Error('Missing Mapbox token in configuration');
                    }

                    // Initialize stores
                    await Alpine.store('app').initialize({ config, walks, tags });
                    
                    // Setup state management
                    this.setupStateManagement();
                    
                    // Initial data processing
                    await this.processInitialData(walks);
                    
                    this.initialized = true;
                } catch (error) {
                    console.error('Failed to initialize walkInterface:', error);
                    this.initializationError = error.message;
                } finally {
                    this.isLoading = false;
                }
            },

            setupStateManagement() {
                // Persistence
                Alpine.effect(() => {
                    if (!this.initialized) return;
                    storage.set('showSidebar', this.showSidebar);
                    storage.set('searchQuery', this.searchQuery);
                });

                // Watchers
                this.$watch('selectedWalk', (walkId) => {
                    if (walkId !== null && this.initialized) {
                        this.$store.walks.selectWalk(walkId);
                        this.centerMapOnWalk(walkId);
                    }
                });

                // Filter effects
                Alpine.effect(() => {
                    if (!this.initialized) return;
                    this.applyFilters();
                });
            },

            async processInitialData(walks) {
                this.filteredWalks = walks;
                
                // Restore saved state
                const savedWalkId = storage.get('selectedWalkId');
                if (savedWalkId && walks.some(w => w.id === savedWalkId)) {
                    this.selectedWalk = savedWalkId;
                }

                // Apply any saved filters
                const savedQuery = storage.get('searchQuery', '');
                if (savedQuery) {
                    this.searchQuery = savedQuery;
                    this.handleSearch();
                }
            },

            // Existing methods with error handling added
            async loadWalks() {
                try {
                    this.isLoading = true;
                    this.filteredWalks = this.$store.walks.walks;
                    await this.applyFilters();
                } catch (error) {
                    console.error('Failed to load walks:', error);
                    this.filteredWalks = [];
                } finally {
                    this.isLoading = false;
                }
            },

            applyFilters() {
                if (!this.$store.walks.walks) return;
                
                let filtered = this.$store.walks.walks;

                if (this.searchQuery) {
                    const query = this.searchQuery.toLowerCase();
                    filtered = filtered.filter(walk => 
                        walk.walk_name.toLowerCase().includes(query) ||
                        walk.description?.toLowerCase().includes(query)
                    );
                }

                if (this.$store.walks.filters.activeFilters.length > 0) {
                    filtered = filtered.filter(walk => 
                        this.$store.walks.filters.activeFilters.includes(walk.steepness_level)
                    );
                }

                this.filteredWalks = filtered;
            },


            handleError(error) {
                console.error('Operation failed:', error);
                this.initializationError = error.message;
            },

            // Public actions
            selectWalk(id) {
                if (!this.initialized) return;
                this.selectedWalk = id;
            },

            toggleSidebar() {
                if (!this.initialized) return;
                this.showSidebar = !this.showSidebar;
            },

            handleSearch() {
                if (!this.initialized) return;
                this.$store.walks.search(this.searchQuery);
                this.applyFilters();
            },

            handleFilterChange(filters) {
                if (!this.initialized) return;
                this.$store.walks.setFilters(filters);
                this.applyFilters();
            }
        }));
    }
};

// Initialize when Alpine is ready
document.addEventListener('alpine:init', () => {
    WalkQuestExtension.init();
});

export default WalkQuestExtension;
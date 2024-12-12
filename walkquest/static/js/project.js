/**
 * Main WalkQuest application logic
 * This is the sole location for walkInterface component registration
 * CategoryCombobox is registered in alpine-components.js
 */
const mapboxgl = window.mapboxgl;

// Core configuration
export const CONFIG = {
    map: {
        style: "mapbox://styles/mapbox/outdoors-v12?optimize=true", // Add style optimization
        defaultCenter: [-4.85, 50.4],
        defaultZoom: 9.5,
        bounds: [[-5.75, 49.95], [-4.15, 50.85]],
        maxBounds: [[-6.5, 49.5], [-3.5, 51.5]],
        minZoom: 8,
        maxZoom: 16,
        performanceOptions: {
            maxParallelImageRequests: 3,    // Limit parallel requests
            fadeDuration: 0,                // Disable fading for better performance
            crossSourceCollisions: false     // Disable cross-source collision checks
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

// Simple store implementation
const walkStore = {
    map: null,
    walks: [],
    markers: new Map(),
    currentLineLayer: null,
    selectedWalkId: null,

    async initialize() {
        try {
            // Get configuration
            const config = utils.getJsonData('config-data', {});
            const walks = utils.getJsonData('walks-data', []);

            if (!config.mapboxToken) {
                throw new Error('Mapbox token not found');
            }

            // Initialize map with optimizations
            mapboxgl.accessToken = config.mapboxToken;
            this.map = new mapboxgl.Map({
                container: 'map',
                style: CONFIG.map.style,
                center: CONFIG.map.defaultCenter,
                zoom: CONFIG.map.defaultZoom,
                maxBounds: CONFIG.map.maxBounds,
                minZoom: CONFIG.map.minZoom,
                maxZoom: CONFIG.map.maxZoom,
                renderWorldCopies: false,           // Disable world copies for better performance
                preserveDrawingBuffer: false,       // Disable drawing buffer preservation
                antialias: false,                   // Disable antialiasing for better performance
                ...CONFIG.map.performanceOptions    // Add performance options
            });

            // Add performance monitoring
            this.map.on('sourcedata', () => {
                if (this.map.loaded() && !this._sourcesLoaded) {
                    this._sourcesLoaded = true;
                    console.log('Sources loaded in:', performance.now());
                }
            });

            // Optimize marker creation
            await new Promise(resolve => this.map.on('load', resolve));
            
            // Create markers in batches for better performance
            this.walks = walks;
            await this.createMarkersOptimized();

            return true;
        } catch (error) {
            console.error('Map initialization failed:', error);
            throw error;
        }
    },

    async createMarkersOptimized() {
        // Create markers in batches of 10
        const BATCH_SIZE = 10;
        const walks = [...this.walks];

        while (walks.length > 0) {
            const batch = walks.splice(0, BATCH_SIZE);
            
            batch.forEach(walk => {
                const marker = new mapboxgl.Marker({
                    element: this.createMarkerElement(walk),
                    anchor: 'bottom'
                })
                .setLngLat([walk.longitude, walk.latitude])
                .addTo(this.map);

                this.markers.set(walk.id, marker);
            });

            // Allow browser to render between batches
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    },

    createMarkerElement(walk) {
        const el = document.createElement('div');
        el.className = 'marker';
        el.addEventListener('click', () => this.selectWalk(walk.id));
        return el;
    },

    async selectWalk(id) {
        // Clear previous selection
        if (this.currentLineLayer) {
            this.map.removeLayer(this.currentLineLayer);
            this.map.removeSource(this.currentLineLayer);
        }

        this.selectedWalkId = id;

        // Update marker appearances
        this.updateMarkers();

        if (id) {
            // Load and display walk line
            try {
                const response = await fetch(`/api/walks/${id}/line/`);
                const lineString = await response.json();
                
                const layerId = `walk-line-${id}`;
                this.map.addSource(layerId, {
                    type: 'geojson',
                    data: lineString
                });

                this.map.addLayer({
                    id: layerId,
                    type: 'line',
                    source: layerId,
                    layout: {
                        'line-join': 'round',
                        'line-cap': 'round'
                    },
                    paint: {
                        'line-color': '#FF4500',
                        'line-width': 3
                    }
                });

                this.currentLineLayer = layerId;

                // Fit map to line bounds
                const coordinates = lineString.geometry.coordinates;
                const bounds = coordinates.reduce(
                    (bounds, coord) => bounds.extend(coord),
                    new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
                );

                this.map.fitBounds(bounds, { padding: 50, maxZoom: 15 });
            } catch (error) {
                console.error('Error loading walk line:', error);
            }
        }
    },

    updateMarkers() {
        this.markers.forEach((marker, walkId) => {
            marker.getElement().classList.toggle('marker-selected', walkId === this.selectedWalkId);
        });
    }
};

// Simple Alpine extension
const WalkQuestExtension = {
    init() {
        if (!window.Alpine) return;

        // Register app store
        Alpine.store('app', {
            initialized: false,
            initialize() {
                this.initialized = true;
            }
        });

        // Register walks store with simplified structure
        Alpine.store('walks', {
            map: null,
            walks: [],
            markers: new Map(),
            selectedWalkId: null,
            isLoading: false,

            async initialize() {
                this.isLoading = true;
                try {
                    const config = document.getElementById('config-data');
                    const walks = document.getElementById('walks-data');
                    
                    if (!config || !walks) return false;

                    const configData = JSON.parse(config.textContent);
                    const walksData = JSON.parse(walks.textContent);

                    // Initialize map
                    mapboxgl.accessToken = configData.mapboxToken;
                    this.map = new mapboxgl.Map({
                        container: 'map',
                        style: CONFIG.map.style,
                        center: CONFIG.map.defaultCenter,
                        zoom: CONFIG.map.defaultZoom
                    });

                    this.map.addControl(new mapboxgl.NavigationControl());
                    this.walks = walksData;
                    this.createMarkers();
                    return true;
                } catch (error) {
                    console.error('Map initialization failed:', error);
                    return false;
                } finally {
                    this.isLoading = false;
                }
            },

            createMarkers() {
                this.walks.forEach(walk => {
                    const marker = new mapboxgl.Marker()
                        .setLngLat([walk.longitude, walk.latitude])
                        .setPopup(
                            new mapboxgl.Popup({ offset: 25 })
                            .setHTML(utils.createMarkerPopup(walk))
                        )
                        .addTo(this.map);

                    marker.getElement().addEventListener('click', () => this.selectWalk(walk.id));
                    this.markers.set(walk.id, marker);
                });
            },

            selectWalk(id) {
                // Clear previous selection
                if (this.selectedWalkId) {
                    const prevMarker = this.markers.get(this.selectedWalkId);
                    if (prevMarker) {
                        prevMarker.getElement().classList.remove('marker-selected');
                    }
                }

                this.selectedWalkId = id;
                const marker = this.markers.get(id);
                
                if (marker) {
                    marker.getElement().classList.add('marker-selected');
                    
                    // Center map on selected marker
                    this.map.flyTo({
                        center: marker.getLngLat(),
                        zoom: 14,
                        duration: 1000
                    });

                    marker.togglePopup();
                }
            },

            getSelectedWalk() {
                return this.walks.find(w => w.id === this.selectedWalkId);
            }
        });

        // Simplified walkInterface component
        Alpine.data('walkInterface', () => ({
            showSidebar: true,

            init() {
                Alpine.store('app').initialize();
                Alpine.store('walks').initialize();
            },

            toggleSidebar() {
                this.showSidebar = !this.showSidebar;
                // Trigger map resize when sidebar toggle changes
                setTimeout(() => {
                    if (Alpine.store('walks').map) {
                        Alpine.store('walks').map.resize();
                    }
                }, 300);
            }
        }));
    }
};

export default WalkQuestExtension;
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
    selectedWalkId: null,
    currentLineLayer: null,

    async initialize() {
        try {
            const config = utils.getJsonData('config-data', {});
            const walks = utils.getJsonData('walks-data', []);

            if (!config.mapboxToken) throw new Error('Mapbox token not found');

            mapboxgl.accessToken = config.mapboxToken;
            this.map = new mapboxgl.Map({
                container: 'map',
                style: CONFIG.map.style,
                center: CONFIG.map.defaultCenter,
                zoom: CONFIG.map.defaultZoom,
                maxBounds: CONFIG.map.maxBounds,
                minZoom: CONFIG.map.minZoom,
                maxZoom: CONFIG.map.maxZoom,
                renderWorldCopies: false,
                preserveDrawingBuffer: false,
                antialias: false,
                ...CONFIG.map.performanceOptions
            });

            // Wait for map and style to load
            await new Promise(resolve => this.map.on('load', resolve));

            // Load custom marker image
            await this.loadMarkerImage();

            // Initialize walks data
            this.walks = walks;
            this.initializeWalkLayers();

            // Add click handler for markers
            this.map.on('click', 'walk-points', (e) => {
                if (e.features.length > 0) {
                    this.selectWalk(e.features[0].properties.id);
                }
            });

            // Change cursor on marker hover
            this.map.on('mouseenter', 'walk-points', () => {
                this.map.getCanvas().style.cursor = 'pointer';
            });
            this.map.on('mouseleave', 'walk-points', () => {
                this.map.getCanvas().style.cursor = '';
            });

            return true;
        } catch (error) {
            console.error('Map initialization failed:', error);
            throw error;
        }
    },

    async loadMarkerImage() {
        return new Promise((resolve, reject) => {
            this.map.loadImage(
                'https://docs.mapbox.com/mapbox-gl-js/assets/custom_marker.png',
                (error, image) => {
                    if (error) reject(error);
                    this.map.addImage('walk-marker', image);
                    resolve();
                }
            );
        });
    },

    initializeWalkLayers() {
        // Convert walks to GeoJSON
        const geojson = {
            type: 'FeatureCollection',
            features: this.walks.map(walk => ({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [walk.longitude, walk.latitude]
                },
                properties: {
                    id: walk.id,
                    title: walk.walk_name,
                    distance: walk.distance,
                    steepness: walk.steepness_level,
                    selected: false
                }
            }))
        };

        // Add walks source
        this.map.addSource('walks', {
            type: 'geojson',
            data: geojson
        });

        // Add symbol layer for walk points
        this.map.addLayer({
            id: 'walk-points',
            type: 'symbol',
            source: 'walks',
            layout: {
                'icon-image': 'walk-marker',
                'icon-size': [
                    'case',
                    ['get', 'selected'], 1.25,
                    1
                ],
                'icon-allow-overlap': true,
                'text-field': ['get', 'title'],
                'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
                'text-offset': [0, 1.25],
                'text-anchor': 'top',
                'text-optional': true
            },
            paint: {
                'text-color': '#1D4ED8',
                'text-halo-color': '#ffffff',
                'text-halo-width': 1
            }
        });
    },

    async selectWalk(id) {
        // Update selected state in source data
        const source = this.map.getSource('walks');
        if (source) {
            const data = source._data;
            data.features.forEach(f => {
                f.properties.selected = f.properties.id === id;
            });
            source.setData(data);
        }

        this.selectedWalkId = id;

        // Handle walk line display
        if (this.currentLineLayer) {
            this.map.removeLayer(this.currentLineLayer);
            this.map.removeSource(this.currentLineLayer);
        }

        if (id) {
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

                // Fit bounds to selected walk
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
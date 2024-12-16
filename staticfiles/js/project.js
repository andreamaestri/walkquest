import { api } from './services.js';
import { getCategoryEmoji, getCategoryColor } from './alpine-components.js';

// Initialize Stimulus.js
import { Application } from '@hotwired/stimulus';
import WalkInterfaceController from './controllers/walk_interface_controller.js';
import NavbarController from './controllers/navbar_controller.js';
import LoadingController from './controllers/loading_controller.js';
import ErrorController from './controllers/error_controller.js';

const application = Application.start();
application.register('walk-interface', WalkInterfaceController);
application.register('navbar', NavbarController);
application.register('loading', LoadingController);
application.register('error', ErrorController);

// Utility functions
const utils = {
    formatDistance: (distance) => `${(distance / 1000).toFixed(1)}km`,
};

// Define walkStore and make it globally available
const walkStore = {
    map: null,
    markers: new Map(),
    currentRoute: null,
    config: null,
    isInitialized: false,
    isLoading: true,
    error: null,
    tags: [],
    walks: [],
    selectedWalkId: null,
    selectedWalk: null,
    filters: {
        search: '',
        categories: [],
        features: []
    },
    initializationAttempts: 0,
    maxInitAttempts: 3,

    async initialize(config) {
        this.config = config;
        
        try {
            this.map = new mapboxgl.Map({
                container: 'map',
                style: config.map.style,
                center: config.map.defaultCenter,
                zoom: config.map.defaultZoom
            });

            // Add navigation controls
            this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');
            
            // Wait for map to load
            await new Promise(resolve => this.map.on('load', resolve));
            
            this.isInitialized = true;
            this.isLoading = false;
            
            return true;
        } catch (error) {
            console.error('Map initialization failed:', error);
            this.error = 'Map initialization failed';
            this.isLoading = false;
            return false;
        }
    },

    async fetchInitialData() {
        try {
            this.config = await api.getConfig();
            if (!this.config) throw new Error('Failed to load configuration');

            const mapInit = await this.initialize(this.config);
            if (!mapInit) throw new Error('Map initialization failed');

            this.tags = await api.getTags();
            const walksData = await api.getWalks();
            this.walks = walksData.walks || [];
            this.updateMarkers(this.walks);
        } catch (error) {
            console.error('Initialization error:', error);
            this.error = error.message;
        }
    },

    displayWalkGeometry(geometry) {
        if (!this.map) return;

        // Remove existing route
        if (this.currentRoute) {
            this.map.removeLayer(this.currentRoute);
            this.map.removeSource(this.currentRoute);
        }

        // Add new route
        const sourceId = `route-${geometry.properties.walk_id}`;
        const layerId = `route-layer-${geometry.properties.walk_id}`;

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

        // Fit bounds to show full route
        const bounds = new mapboxgl.LngLatBounds();
        geometry.geometry.coordinates.forEach(coord => bounds.extend(coord));
        this.map.fitBounds(bounds, { padding: 50 });

        this.currentRoute = layerId;
    },

    updateMarkers(walks) {
        if (!this.map) return;

        // Remove existing markers
        this.markers.forEach(marker => marker.remove());
        this.markers.clear();

        // Add new markers
        walks.forEach(walk => {
            const markerColor = this.config?.map?.markerColors?.default || '#FF0000';  // Fallback to red
            const marker = new mapboxgl.Marker({
                color: markerColor
            })
                .setLngLat([walk.longitude, walk.latitude])
                .addTo(this.map);
            
            this.markers.set(walk.id, marker);
        });
    },

    async search(query) {
        this.filters.search = query;
        await this.applyFilters();
    },

    async filterByCategory(categories) {
        this.filters.categories = categories;
        await this.applyFilters();
    },

    async filterByFeature(features) {
        this.filters.features = features;
        await this.applyFilters();
    },

    async applyFilters() {
        this.isLoading = true;
        try {
            const response = await api.getWalks(this.filters);
            this.walks = response.walks || [];
            this.updateMarkers(this.walks);
        } catch (error) {
            console.error('Filter application failed:', error);
            this.error = 'Filter application failed';
        } finally {
            this.isLoading = false;
        }
    },

    async toggleFavorite(walkId) {
        try {
            const result = await api.toggleFavorite(walkId);
            const walk = this.walks.find(w => w.id === result.walk_id);
            if (walk) {
                walk.is_favorite = result.is_favorite;
            }
        } catch (error) {
            console.error('Toggle favorite failed:', error);
            this.error = 'Failed to toggle favorite';
        }
    },

    async selectWalk(id) {
        if (id === this.selectedWalkId) return;
        
        this.selectedWalkId = id;
        if (id) {
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
                this.error = 'Failed to load walk details';
            }
        } else {
            this.selectedWalk = null;
        }
    }
};

window.walkStore = walkStore;

export { walkStore };
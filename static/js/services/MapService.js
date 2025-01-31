export class MapService {
    constructor(container, config) {
        this.map = null;
        this.container = container;
        this.config = config;
        this.currentRouteId = null;
        this.abortController = null;
    }

    async initialize() {
        if (this.map) return this.map;

        mapboxgl.accessToken = this.config.mapboxToken;

        this.map = new mapboxgl.Map({
            container: this.container,
            style: 'mapbox://styles/mapbox/standard?optimize=true',
            center: this.config.map?.defaultCenter || [-4.85, 50.4],
            zoom: this.config.map?.defaultZoom || 9.5,
            preserveDrawingBuffer: true,
            maxZoom: 16,
            minZoom: 1,
            renderWorldCopies: false,
            maxBounds: new mapboxgl.LngLatBounds(
                [-5.8, 49.8],
                [-4.0, 51.0]
            )
        });

        await new Promise((resolve, reject) => {
            this.map.once('load', resolve);
            this.map.once('error', reject);
        });

        this._initializeSources();
        this._setupEventListeners();
        
        return this.map;
    }

    _initializeSources() {
        this.map.addSource('route', {
            type: 'geojson',
            data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } }
        });

        this.map.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#4338CA', 'line-width': 8 }
        });

        // Initialize points source and layers
        // ...existing points source initialization code...
    }

    updateWalks(geojson) {
        const source = this.map.getSource('points');
        if (source) {
            source.setData(geojson);
        }
    }

    async displayRoute(walkId, color) {
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();

        try {
            const response = await fetch(`/api/walks/${walkId}/geometry`, {
                signal: this.abortController.signal
            });
            const geojson = await response.json();
            
            const source = this.map.getSource('route');
            if (source) {
                source.setData(geojson);
            }
            
            this.map.setPaintProperty('route', 'line-color', color);
            this.currentRouteId = walkId;
            
            return geojson.coordinates;
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Failed to load route:', error);
            }
            throw error;
        }
    }

    // ... other map-related methods ...
}

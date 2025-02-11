import { createApp } from 'vue';
import { createMapboxMap } from '@studiometa/vue-mapbox-gl';

class MapService {
    static async initialize(container, config = {}) {
        console.log('Starting MapService initialization...', { config });

        try {
            // Get config from script tag if not provided
            let mapboxToken = config.mapboxToken;
            if (!mapboxToken) {
                const configScript = document.getElementById('config-data');
                if (!configScript) {
                    throw new Error('Config script tag not found');
                }
                try {
                    const scriptConfig = JSON.parse(configScript.textContent);
                    mapboxToken = scriptConfig.mapboxToken;
                } catch (e) {
                    throw new Error(`Failed to parse config: ${e.message}`);
                }
            }

            // Create map instance
            const map = await createMapboxMap({
                accessToken: mapboxToken,
                container,
                style: 'mapbox://styles/mapbox/streets-v12',
                center: [-4.85, 50.4],
                zoom: 9.5,
                ...config,
                dragPan: false, // Will be enabled after map loads
                scrollZoom: false // Will be enabled after map loads
            });

            // Set up event handlers
            map.on('load', () => {
                map.dragPan.enable();
                map.scrollZoom.enable();
                console.log('Map loaded and interactions enabled');
            });

            map.on('error', (e) => {
                console.error('Mapbox error:', e);
            });

            return map;
        } catch (error) {
            console.error('Failed to initialize map:', error);
            throw error;
        }
    }
}

export default MapService;

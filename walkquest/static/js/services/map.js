import mapboxgl from 'mapbox-gl';

console.log('MapService module initializing...', {
    version: mapboxgl.version,
    supported: mapboxgl.supported()
});

class MapService {
    static async initialize(container = 'map', config = {}) {
        console.log('Starting MapService initialization...', { config });

        try {
            // Validate Mapbox support
            if (!mapboxgl.supported()) {
                throw new Error('Mapbox GL JS not supported in this browser');
            }

            // Get and validate token
            let mapboxToken = config.mapboxToken;
            if (!mapboxToken) {
                // Try to get config from different possible script tags
                const configScripts = [
                    document.getElementById('id_config-data'),  // Django json_script default
                    document.getElementById('config-data'),     // Custom ID
                ];
                
                const configScript = configScripts.find(script => script?.textContent);
                console.log('Config script elements:', {
                    found: configScripts.map(script => !!script),
                    content: configScript?.textContent
                });
                
                if (!configScript) {
                    throw new Error('Config script tag not found - verify template includes {{ config|json_script:"config-data" }}');
                }
                
                try {
                    const scriptConfig = JSON.parse(configScript.textContent);
                    mapboxToken = scriptConfig.mapboxToken;
                } catch (e) {
                    console.error('Failed to parse config:', e);
                    throw new Error(`Failed to parse config: ${e.message}`);
                }
            }
            
            if (!mapboxToken || mapboxToken === '{{ MAPBOX_TOKEN }}') {
                throw new Error('Invalid Mapbox token - check Django settings');
            }
            
            // Validate container
            const mapContainer = typeof container === 'string' ? 
                document.getElementById(container) : container;
            
            console.log('Map container:', {
                found: !!mapContainer,
                id: container,
                width: mapContainer?.offsetWidth,
                height: mapContainer?.offsetHeight,
                visible: mapContainer?.offsetParent !== null
            });
            
            if (!mapContainer) {
                throw new Error(`Map container '${container}' not found in DOM`);
            }
            
            if (mapContainer.offsetWidth === 0 || mapContainer.offsetHeight === 0) {
                console.warn('Map container has zero dimensions - check CSS');
            }

            // Initialize map
            mapboxgl.accessToken = mapboxToken;
            console.log('Creating map instance with token:', mapboxToken.slice(0, 8) + '...');
            
            const mapOptions = {
                container: mapContainer,
                style: 'mapbox://styles/mapbox/streets-v12',
                center: [-4.85, 50.4],
                zoom: 9.5,
                ...config.map
            };
            
            console.log('Creating map with options:', mapOptions);
            const map = new mapboxgl.Map(mapOptions);

            // Set up promise to handle map loading
            const mapLoaded = new Promise((resolve, reject) => {
                map.once('load', () => {
                    console.log('Map load event fired');
                    resolve();
                });

                setTimeout(() => {
                    reject(new Error('Map initialization timed out after 10s'));
                }, 10000);
            });

            // Set up event handlers
            map.on('styledata', () => {
                const style = map.getStyle();
                console.log('Style loaded:', {
                    name: style.name,
                    version: style.version,
                    sources: Object.keys(style.sources || {})
                });
            });

            map.on('sourcedata', (e) => {
                if (e.isSourceLoaded) {
                    console.log('Source loaded:', e.sourceId);
                }
            });

            map.on('error', (e) => {
                console.error('Mapbox error:', {
                    message: e.error?.message,
                    type: e.error?.type,
                    source: e.source?.id
                });
            });

            // Wait for map to load
            try {
                await mapLoaded;
                console.log('Map successfully initialized');
                return map;
            } catch (error) {
                console.error('Map loading failed:', error);
                throw error;
            }

        } catch (error) {
            const errorDetails = {
                message: error.message,
                stack: error.stack,
                type: error.type || 'unknown'
            };
            console.error('Failed to initialize map:', errorDetails);
            throw error;
        }
    }

    static createNavigationControl() {
        return new mapboxgl.NavigationControl();
    }
}

export default MapService;

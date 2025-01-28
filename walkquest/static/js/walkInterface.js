// Initialize Alpine component for map interface
document.addEventListener('alpine:init', () => {
    Alpine.data('walkInterface', () => ({
        map: null,
        markers: new Map(),
        showSidebar: false,
        selectedWalk: null,
        config: window.walkquestConfig || {},

        init() {
            console.log('Initializing map interface...');
            
            // Get config from script tag
            const configScript = document.getElementById('config-data');
            if (!configScript) {
                console.error('Config data script tag not found');
                return;
            }

            try {
                // Parse config
                const config = JSON.parse(configScript.textContent);
                console.log('Parsed config:', config);
                
                if (!config.mapboxToken) {
                    console.error('Mapbox token not found in config');
                    return;
                }

                // Initialize Mapbox
                mapboxgl.accessToken = config.mapboxToken;

                // Initialize map immediately
                try {
                    console.log('Creating map with container:', this.$refs.map);
                    this.map = new mapboxgl.Map({
                        container: this.$refs.map,
                        style: config.map?.style || 'mapbox://styles/mapbox/streets-v12',
                        center: config.map?.defaultCenter || [-4.85, 50.4],
                        zoom: config.map?.defaultZoom || 9.5,
                        preserveDrawingBuffer: true
                    });

                    this.map.on('load', () => {
                        console.log('Map loaded successfully');
                        // Force a resize to ensure proper rendering
                        this.map.resize();
                    });

                    this.map.on('error', (e) => {
                        console.error('Map error:', e);
                    });

                    // Add navigation control
                    this.map.addControl(new mapboxgl.NavigationControl(), 'top-left');
                } catch (error) {
                    console.error('Failed to initialize map:', error);
                }

            } catch (error) {
                console.error('Failed to parse config:', error);
            }
        },

        // Utility functions
        formatDistance(distance) {
            return `${(distance / 1000).toFixed(1)}km`;
        },

        sanitizeHtml(str) {
            return String(str).replace(/[&<>"']/g, m => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            })[m]);
        },

        calculateBounds(geometry) {
            if (!geometry?.coordinates?.length) return null;
            
            const bounds = new mapboxgl.LngLatBounds();
            geometry.coordinates.forEach(coord => {
                if (Array.isArray(coord) && coord.length >= 2) {
                    bounds.extend(coord);
                }
            });
            return bounds;
        },

        createMarker({ longitude, latitude, is_favorite }, config = {}, onClick) {
            const markerColor = is_favorite 
                ? (this.config.map?.markerColors?.favorite || '#FFD700')
                : (this.config.map?.markerColors?.default || '#FF0000');

            const marker = new mapboxgl.Marker({ color: markerColor })
                .setLngLat([longitude, latitude]);

            if (onClick) {
                marker.getElement().addEventListener('click', onClick);
            }

            return marker;
        },

        handleWalkSelection(detail) {
            if (!detail) return;
            
            this.selectedWalk = detail;
            this.showSidebar = true;
            
            // Update map view if coordinates available
            if (detail.longitude && detail.latitude) {
                this.map.flyTo({
                    center: [detail.longitude, detail.latitude],
                    zoom: 14,
                    essential: true
                });
            }
        }
    }));
});

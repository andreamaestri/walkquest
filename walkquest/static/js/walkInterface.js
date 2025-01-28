// Utility functions for walk interface
const WalkInterfaceUtils = {
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
            ? (config.markerColors?.favorite || '#FFD700')
            : (config.markerColors?.default || '#FF0000');

        const marker = new mapboxgl.Marker({ color: markerColor })
            .setLngLat([longitude, latitude]);

        if (onClick) {
            marker.getElement().addEventListener('click', onClick);
        }

        return marker;
    }
};

// Export utilities
window.WalkInterfaceUtils = WalkInterfaceUtils;

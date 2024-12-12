document.addEventListener('DOMContentLoaded', function() {
    const initMapStyles = () => {
        if (typeof ol === 'undefined') {
            console.log('OpenLayers not loaded yet, retrying...');
            setTimeout(initMapStyles, 100);
            return;
        }

        console.log('Initializing map styles');
        const vectorStyle = new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: '#0f766e',
                width: 8,
                lineCap: 'round',
                lineJoin: 'round'
            })
        });

        // Function to apply styles to a map instance
        const styleMap = (mapElement) => {
            if (!mapElement.map) return;
            
            const applyVectorStyle = (layer) => {
                if (layer instanceof ol.layer.Vector) {
                    console.log('Applying vector style');
                    layer.setStyle(vectorStyle);
                }
            };

            // Style existing layers
            mapElement.map.getLayers().forEach(applyVectorStyle);

            // Watch for new layers
            mapElement.map.getLayers().on('add', (event) => {
                applyVectorStyle(event.element);
            });
        };

        // Initial styling
        document.querySelectorAll('.geometry_map').forEach(styleMap);

        // Watch for new maps
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.classList?.contains('geometry_map')) {
                        styleMap(node);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    };

    initMapStyles();
});
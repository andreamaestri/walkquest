export function initCustomLayerHandlers(map, layerId = 'geojson-cwfsvt', onClickCallback = () => {}) {
    // Set pointer cursor when hovering over the custom layer
    map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
    });
    
    // Streamlined click handler for the custom layer
    map.on('click', layerId, (e) => {
        if (e.features && e.features.length > 0) {
            const feature = e.features[0];
            onClickCallback(feature);
        }
    });
}

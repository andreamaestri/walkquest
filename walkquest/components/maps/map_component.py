from tetra import Component
from .base import maps_lib

@maps_lib.register
class MapComponent(Component):
    template = """
    <div x-data="{ 
        map: null,
        initMap() {
            mapboxgl.accessToken = '{{ mapbox_token }}';
            this.map = new mapboxgl.Map({
                container: $el,
                style: 'mapbox://styles/mapbox/outdoors-v11',
                center: [-0.127758, 51.507351],
                zoom: 10
            });
        }
    }" 
    x-init="initMap()"
    class="map-container">
    </div>
    """

    def get_context_data(self):
        return {
            'mapbox_token': self.request.settings.MAPBOX_TOKEN
        }

    class Media:
        css = {
            'all': ['https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css']
        }
        js = [
            'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js'
        ]

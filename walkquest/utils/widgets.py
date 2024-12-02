
from django.contrib.gis.forms import OSMWidget
from django.conf import settings

class CustomOSMWidget(OSMWidget):
    template_name = 'gis/admin/custom_osm_widget.html'
    
    def __init__(self, attrs=None):
        default_attrs = {
            'default_lat': 50.236764,
            'default_lon': -5.362113,
            'default_zoom': 15,
            'map_srid': 4326,
        }
        if attrs:
            default_attrs.update(attrs)
        super().__init__(attrs=default_attrs)
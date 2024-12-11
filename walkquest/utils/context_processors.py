
from django.conf import settings


def map_settings(request):
    """Make map settings available to templates."""
    return {
        "map_settings": {
            "tile_url": settings.MAP_TILE_URL,
            "attribution": settings.MAP_ATTRIBUTION,
        },
    }

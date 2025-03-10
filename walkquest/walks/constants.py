"""Geographic and walk-related constants."""
from typing import Final

# Geographic constants
MIN_LATITUDE: Final[float] = -90.0
MAX_LATITUDE: Final[float] = 90.0
MIN_LONGITUDE: Final[float] = -180.0
MAX_LONGITUDE: Final[float] = 180.0

# Earth's radius in meters (average)
EARTH_RADIUS_METERS: Final[float] = 6371000.0

# Default search parameters
DEFAULT_SEARCH_RADIUS_METERS: Final[float] = 5000.0
DEFAULT_SEARCH_LIMIT: Final[int] = 50

# Map defaults for Cornwall
DEFAULT_MAP_CENTER: Final[tuple[float, float]] = (-4.85, 50.4)
DEFAULT_MAP_ZOOM: Final[float] = 9.5

# Marker colors
MARKER_COLORS: Final[dict[str, str]] = {
    "default": "#FF0000",  # Red markers
    "selected": "#00FF00",  # Green markers for selected
    "favorite": "#FFD700",  # Gold for favorites
}

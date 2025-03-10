"""Utility functions for walks app."""
import math
from typing import TypeVar

from django.contrib.auth import get_user_model
from django.db.models import Exists
from django.db.models import OuterRef
from django.db.models import QuerySet
from django.db.models import Value

from .constants import EARTH_RADIUS_METERS
from .exceptions import InvalidCoordinatesError
from .models import Walk

User = get_user_model()
T = TypeVar("T")

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points using Haversine formula.

    Args:
        lat1: Latitude of first point
        lon1: Longitude of first point
        lat2: Latitude of second point
        lon2: Longitude of second point

    Returns:
        float: Distance in meters

    Raises:
        InvalidCoordinatesError: If coordinates are outside valid range
    """
    if not is_valid_coordinates(lat1, lon1) or not is_valid_coordinates(lat2, lon2):
        raise InvalidCoordinatesError(lat1, lon1)

    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return EARTH_RADIUS_METERS * c

def is_valid_coordinates(lat: float, lon: float) -> bool:
    """Check if coordinates are within valid range.

    Args:
        lat: Latitude to check
        lon: Longitude to check

    Returns:
        bool: True if coordinates are valid
    """
    from .constants import MAX_LATITUDE
    from .constants import MAX_LONGITUDE
    from .constants import MIN_LATITUDE
    from .constants import MIN_LONGITUDE
    return (MIN_LATITUDE <= lat <= MAX_LATITUDE and
            MIN_LONGITUDE <= lon <= MAX_LONGITUDE)

def get_bounding_box(
    latitude: float,
    longitude: float,
    radius_meters: float,
) -> tuple[float, float, float, float]:
    """Calculate bounding box for a point and radius.

    Args:
        latitude: Center point latitude
        longitude: Center point longitude
        radius_meters: Radius in meters

    Returns:
        Tuple of (min_lat, max_lat, min_lng, max_lng)

    Raises:
        InvalidCoordinatesError: If coordinates are invalid
    """
    if not is_valid_coordinates(latitude, longitude):
        raise InvalidCoordinatesError(latitude, longitude)

    # Convert radius to degrees (approximate)
    lat_radius = radius_meters / 111000  # Convert meters to degrees
    lng_radius = lat_radius / math.cos(math.radians(latitude))

    return (
        latitude - lat_radius,
        latitude + lat_radius,
        longitude - lng_radius,
        longitude + lng_radius,
    )

def annotate_favorites(
    queryset: QuerySet[T],
    user: User | None,
) -> QuerySet[T]:
    """Annotate queryset with is_favorite status for user.

    Args:
        queryset: The queryset to annotate
        user: The user to check favorites for

    Returns:
        Annotated queryset
    """
    return queryset.annotate(
        is_favorite=Exists(
            Walk.favorites.through.objects.filter(
                walk_id=OuterRef("pk"),
                user=user,
            ),
        )
        if user and user.is_authenticated
        else Value(False),
    )

def format_points_of_interest(poi_text: str | None) -> list[str]:
    """Format points of interest from text.

    Args:
        poi_text: Raw points of interest text

    Returns:
        List of formatted points of interest
    """
    if not poi_text:
        return []
    return [poi.strip() for poi in poi_text.split(";") if poi.strip()]

def format_pub_entry(pub: dict | str) -> dict[str, str]:
    """Format pub entry consistently.

    Args:
        pub: Raw pub entry (dict or string)

    Returns:
        Formatted pub entry as dict
    """
    if isinstance(pub, dict) and "name" in pub:
        return pub
    return {"name": str(pub)}

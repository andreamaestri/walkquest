"""API endpoints for walks functionality."""
import logging
from uuid import UUID

import orjson
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db.models import Count
from django.http import HttpRequest
from django.shortcuts import get_object_or_404
from ninja import Query
from ninja import Router
from ninja.parser import Parser
from ninja.renderers import BaseRenderer

from .constants import DEFAULT_MAP_CENTER
from .constants import DEFAULT_MAP_ZOOM
from .constants import DEFAULT_SEARCH_LIMIT
from .constants import DEFAULT_SEARCH_RADIUS_METERS
from .constants import MARKER_COLORS
from .exceptions import AuthenticationRequiredError
from .exceptions import GeometryError
from .exceptions import InvalidCoordinatesError
from .exceptions import WalkFilterError
from .exceptions import WalkNotFoundError
from .models import Walk
from .models import WalkCategoryTag
from .models import WalkFeatureTag
from .schemas import ConfigSchema
from .schemas import GeometrySchema
from .schemas import TagResponseSchema
from .schemas import WalkOutSchema
from .utils import annotate_favorites
from .utils import format_points_of_interest
from .utils import format_pub_entry
from .utils import get_bounding_box
from .utils import haversine

logger = logging.getLogger(__name__)

# Define custom ORJSONParser
class ORJSONParser(Parser):
    """Custom JSON parser using orjson."""

    def parse_body(self, request):
        """Parse request body using orjson."""
        return orjson.loads(request.body)

# Define custom ORJSONRenderer
class ORJSONRenderer(BaseRenderer):
    """Custom JSON renderer using orjson."""

    media_type = "application/json"

    def render(self, request, data, *, response_status):
        """Render response using orjson."""
        return orjson.dumps(data)

# Create a Router for walks API endpoints
api = Router()

@api.get("/", response=dict)
def api_root(request):
    """API root endpoint that returns available endpoints."""
    return {
        "version": "1.0.0",
        "endpoints": {
            "walks": "/walks",
            "walk_detail": "/walks/{id}",
            "walk_geometry": "/walks/{id}/geometry",
            "walk_favorite": "/walks/{id}/favorite",
            "filters": "/filters",
            "tags": "/tags",
            "config": "/config",
        },
    }

@api.get("/walks", response=list[WalkOutSchema])
def list_walks(
    request: HttpRequest,
    search: str | None = None,
    categories: str | None = None,
    features: str | None = None,
    difficulty: str | None = None,
    has_bus_access: bool | None = None,
    has_stiles: bool | None = None,
) -> list[WalkOutSchema]:
    """List walks with optional filtering."""
    try:
        # Query walks with prefetches
        walks = Walk.objects.prefetch_related(
            "features", "categories", "related_categories"
        )

        # Annotate favorites
        walks = annotate_favorites(walks, request.user)

        # Apply filters
        if search:
            walks = walks.filter(walk_name__icontains=search)
        if categories:
            walks = walks.filter(categories__slug__in=categories.split(","))
        if features:
            walks = walks.filter(features__slug__in=features.split(","))
        if difficulty:
            walks = walks.filter(steepness_level=difficulty)
        if has_stiles is not None:
            walks = walks.filter(has_stiles=has_stiles)
        if has_bus_access is not None:
            walks = walks.filter(has_bus_access=has_bus_access)

        # Convert queryset to schema objects
        return [
            WalkOutSchema(
                id=walk.id,
                walk_id=walk.walk_id,
                walk_name=walk.walk_name,
                distance=walk.distance,
                latitude=walk.latitude,
                longitude=walk.longitude,
                has_pub=walk.has_pub,
                has_cafe=walk.has_cafe,
                is_favorite=walk.is_favorite,
                features=[
                    {"name": f.name, "slug": f.slug} for f in walk.features.all()
                ],
                categories=[
                    {"name": c.name, "slug": c.slug} for c in walk.categories.all()
                ],
                related_categories=[
                    {"name": rc.name, "slug": rc.slug}
                    for rc in walk.related_categories.all()
                ],
                highlights=walk.highlights,
                points_of_interest=format_points_of_interest(walk.points_of_interest),
                os_explorer_reference=walk.os_explorer_reference,
                steepness_level=walk.steepness_level,
                footwear_category=walk.footwear_category,
                recommended_footwear=walk.recommended_footwear,
                pubs_list=[format_pub_entry(pub) for pub in walk.pubs_list],
                trail_considerations=walk.trail_considerations,
                has_stiles=walk.has_stiles,
                has_bus_access=walk.has_bus_access,
                created_at=walk.created_at.isoformat(),
                updated_at=walk.updated_at.isoformat(),
            )
            for walk in walks
        ]

    except ValidationError as e:
        logger.warning("Validation error in list_walks: %s", str(e))
        return []
    except WalkFilterError as e:
        logger.warning("Filter error in list_walks: %s", str(e))
        return []
    except Exception:
        logger.exception("Unexpected error in list_walks")
        return []

@api.get("/walks/nearby", response=list[WalkOutSchema])
def find_nearby_walks(
    request: HttpRequest,
    latitude: float = Query(..., description="Latitude of the center point"),
    longitude: float = Query(..., description="Longitude of the center point"),
    radius: float = Query(DEFAULT_SEARCH_RADIUS_METERS, description="Search radius in meters"),
    limit: int = Query(DEFAULT_SEARCH_LIMIT, description="Maximum number of results"),
) -> list[WalkOutSchema]:
    """Find walks near a specific location using efficient spatial queries."""
    try:
        # Get bounding box for initial filtering
        min_lat, max_lat, min_lng, max_lng = get_bounding_box(
            latitude, longitude, radius
        )

        # Query walks within bounding box
        walks = (
            Walk.objects.filter(
                latitude__gte=min_lat,
                latitude__lte=max_lat,
                longitude__gte=min_lng,
                longitude__lte=max_lng,
            )
            .prefetch_related("features", "categories", "related_categories")
        )

        # Annotate favorites
        walks = annotate_favorites(walks, request.user)

        # Calculate exact distances and filter
        results = []
        for walk in walks:
            try:
                distance = haversine(
                    latitude, longitude, float(walk.latitude), float(walk.longitude)
                )
                if distance <= radius:
                    results.append((distance, walk))
            except (ValueError, TypeError) as e:
                logger.warning(
                    "Error calculating distance for walk %s: %s",
                    walk.id, str(e)
                )
                continue

        # Sort by distance and limit results
        results.sort(key=lambda x: x[0])
        results = results[:limit]

        # Convert to schema objects
        return [
            WalkOutSchema(
                id=walk.id,
                walk_id=walk.walk_id,
                walk_name=walk.walk_name,
                distance=walk.distance,
                latitude=walk.latitude,
                longitude=walk.longitude,
                has_pub=walk.has_pub,
                has_cafe=walk.has_cafe,
                is_favorite=walk.is_favorite,
                features=[
                    {"name": f.name, "slug": f.slug} for f in walk.features.all()
                ],
                categories=[
                    {"name": c.name, "slug": c.slug} for c in walk.categories.all()
                ],
                related_categories=[
                    {"name": rc.name, "slug": rc.slug}
                    for rc in walk.related_categories.all()
                ],
                highlights=walk.highlights,
                points_of_interest=format_points_of_interest(walk.points_of_interest),
                os_explorer_reference=walk.os_explorer_reference,
                steepness_level=walk.steepness_level,
                footwear_category=walk.footwear_category,
                recommended_footwear=walk.recommended_footwear,
                pubs_list=[format_pub_entry(pub) for pub in walk.pubs_list],
                trail_considerations=walk.trail_considerations,
                has_stiles=walk.has_stiles,
                has_bus_access=walk.has_bus_access,
                created_at=walk.created_at.isoformat(),
                updated_at=walk.updated_at.isoformat(),
            )
            for _, walk in results
        ]

    except InvalidCoordinatesError as e:
        logger.warning("Invalid coordinates in find_nearby_walks: %s", str(e))
        return []
    except Exception:
        logger.exception("Unexpected error in find_nearby_walks")
        return []

@api.get("/walks/{identifier}", response=WalkOutSchema)
def get_walk(request: HttpRequest, identifier: str) -> WalkOutSchema:
    """Get a single walk by ID or slug."""
    try:
        # Try UUID first
        try:
            uuid_id = UUID(identifier)
            walk = Walk.objects.get(id=uuid_id)
        except (ValueError, Walk.DoesNotExist):
            # If not UUID, try slug
            walk = Walk.objects.get(walk_id=identifier)

        # Get annotated walk
        walk = annotate_favorites(
            Walk.objects.prefetch_related(
                "features", "categories", "related_categories"
            ),
            request.user,
        ).get(id=walk.id)

        return WalkOutSchema(
            id=walk.id,
            walk_id=walk.walk_id,
            walk_name=walk.walk_name,
            distance=walk.distance,
            latitude=walk.latitude,
            longitude=walk.longitude,
            has_pub=walk.has_pub,
            has_cafe=walk.has_cafe,
            is_favorite=walk.is_favorite,
            features=[
                {"name": f.name, "slug": f.slug} for f in walk.features.all()
            ],
            categories=[
                {"name": c.name, "slug": c.slug} for c in walk.categories.all()
            ],
            related_categories=[
                {"name": rc.name, "slug": rc.slug}
                for rc in walk.related_categories.all()
            ],
            highlights=walk.highlights,
            points_of_interest=format_points_of_interest(walk.points_of_interest),
            os_explorer_reference=walk.os_explorer_reference,
            steepness_level=walk.steepness_level,
            footwear_category=walk.footwear_category,
            recommended_footwear=walk.recommended_footwear,
            pubs_list=[format_pub_entry(pub) for pub in walk.pubs_list],
            trail_considerations=walk.trail_considerations,
            has_stiles=walk.has_stiles,
            has_bus_access=walk.has_bus_access,
            created_at=walk.created_at.isoformat(),
            updated_at=walk.updated_at.isoformat(),
        )

    except Walk.DoesNotExist as e:
        raise WalkNotFoundError(identifier) from e
    except Exception:
        logger.exception("Error fetching walk %s", identifier)
        raise

@api.post("/walks/{walk_id}/favorite")
def toggle_favorite(request: HttpRequest, walk_id: UUID) -> dict:
    """Toggle favorite status for a walk."""
    if not request.user.is_authenticated:
        error_message = "favoriting walks"
        raise AuthenticationRequiredError(error_message)

    walk = get_object_or_404(Walk, id=walk_id)
    is_favorite = walk.favorites.filter(id=request.user.id).exists()

    if is_favorite:
        walk.favorites.remove(request.user)
        is_favorite = False
    else:
        walk.favorites.add(request.user)
        is_favorite = True

    return {"status": "success", "walk_id": str(walk_id), "is_favorite": is_favorite}

@api.get("/tags", response=list[TagResponseSchema])
def list_tags(request: HttpRequest) -> list[TagResponseSchema]:
    """Get all walk tags with usage counts."""
    # Get category tags with counts
    category_tags = (
        WalkCategoryTag.objects.annotate(
            usage_count=Count("categorized_walks", distinct=True)
            + Count("related_walks", distinct=True),
        )
        .filter(usage_count__gt=0)
        .values("name", "slug", "usage_count")
    )

    # Get feature tags with counts
    feature_tags = (
        WalkFeatureTag.objects.annotate(
            usage_count=Count("walks", distinct=True)
        )
        .filter(usage_count__gt=0)
        .values("name", "slug", "usage_count")
    )

    # Combine and format tags
    return [
        TagResponseSchema(
            name=tag["name"],
            slug=tag["slug"],
            usage_count=tag["usage_count"],
            type="category",
        )
        for tag in category_tags
    ] + [
        TagResponseSchema(
            name=tag["name"],
            slug=tag["slug"],
            usage_count=tag["usage_count"],
            type="feature",
        )
        for tag in feature_tags
    ]

@api.get("/config", response=ConfigSchema)
def get_config(request: HttpRequest) -> ConfigSchema:
    """Get application configuration."""
    return ConfigSchema(
        mapboxToken=settings.MAPBOX_TOKEN,
        map={
            "style": "mapbox://styles/mapbox/outdoors-v12?optimize=true",
            "defaultCenter": DEFAULT_MAP_CENTER,
            "defaultZoom": DEFAULT_MAP_ZOOM,
            "markerColors": MARKER_COLORS,
        },
        filters={
            "categories": True,
            "features": True,
            "distance": True,
        },
    )

@api.get("/filters")
def get_filters(request: HttpRequest) -> dict:
    """Get available filter options."""
    return {
        "difficulties": [choice[0] for choice in Walk.DIFFICULTY_CHOICES],
        "footwear": [choice[0] for choice in Walk.FOOTWEAR_CHOICES],
        "categories": [
            {"name": tag.name, "slug": tag.slug}
            for tag in WalkCategoryTag.objects.all()
        ],
        "features": [
            {"name": tag.name, "slug": tag.slug}
            for tag in WalkFeatureTag.objects.all()
        ],
    }

@api.get("/walks/{walk_id}/geometry", response=GeometrySchema)
def get_walk_geometry(request: HttpRequest, walk_id: UUID) -> GeometrySchema:
    """Get GeoJSON geometry for a walk route."""
    try:
        walk = get_object_or_404(
            Walk.objects.only("id", "walk_name", "distance", "route_geometry"),
            id=walk_id,
        )

        if not walk.route_geometry:
            
            def raise_geometry_error():
                raise GeometryError(str(walk_id), "No geometry data available")

            raise_geometry_error()

        # Convert the geometry to GeoJSON
        geojson = orjson.loads(walk.route_geometry.geojson)

        return GeometrySchema(
            type="Feature",
            geometry=geojson,
            properties={
                "id": str(walk.id),
                "name": walk.walk_name,
                "distance": float(walk.distance) if walk.distance else 0,
            },
        )

    except Walk.DoesNotExist as e:
        raise WalkNotFoundError(str(walk_id)) from e
    except Exception:
        logger.exception("Error fetching geometry for walk %s", walk_id)
        raise GeometryError(str(walk_id), "Failed to retrieve geometry") from None


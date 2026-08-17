import math
from typing import List
from typing import Optional
from uuid import UUID

import orjson
from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.db.models import Count
from django.db.models import Exists
from django.db.models import FloatField
from django.db.models import OuterRef
from django.db.models import Value
from django.db.models.expressions import RawSQL
from django.http import HttpRequest
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from ninja import Path
from ninja import Query
from ninja import Router
from ninja import Schema
from ninja.parser import Parser
from ninja.renderers import BaseRenderer

from walkquest.adventures.api import router as adventures_router

from .models import Adventure
from .models import Companion
from .models import Walk
from .models import WalkCategoryTag
from .models import WalkFeatureTag
from .schemas import ConfigSchema
from .schemas import TagResponseSchema
from .schemas import WalkOutSchema


# Define custom ORJSONParser
class ORJSONParser(Parser):
    def parse_body(self, request):
        return orjson.loads(request.body)


# Define custom ORJSONRenderer using BaseRenderer
class ORJSONRenderer(BaseRenderer):
    media_type = "application/json"

    def render(self, request, data, *, response_status):
        return orjson.dumps(data)


# Create a Router for walks API endpoints
api = Router()

METADATA_CACHE_TIMEOUT = 60 * 15


def get_cached_metadata(key, factory):
    """Return shared, short-lived metadata without caching request-specific data."""
    value = cache.get(key)
    if value is None:
        value = factory()
        cache.set(key, value, METADATA_CACHE_TIMEOUT)
    return value


@api.get("/", response=dict)
def api_root(request):
    """API root endpoint that returns available endpoints"""
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


@api.get("/walks", response=List[WalkOutSchema])
def list_walks(
    request: HttpRequest,
    search: Optional[str] = None,
    categories: Optional[str] = None,
    features: Optional[str] = None,
    difficulty: Optional[str] = None,
    has_bus_access: Optional[bool] = None,  # renamed parameter
    has_stiles: Optional[bool] = None,
):
    """List walks with optional filtering"""
    try:
        walks = Walk.objects.prefetch_related(
            "features", "categories", "related_categories"
        ).annotate(
            is_favorite=Exists(
                Walk.favorites.through.objects.filter(
                    walk_id=OuterRef("pk"), user=request.user
                )
            )
            if request.user.is_authenticated
            else Value(False)
        )
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
        if has_bus_access is not None:  # updated filtering
            walks = walks.filter(has_bus_access=has_bus_access)

        # A walk can match multiple many-to-many filters. Keep the response
        # one-row-per-walk while retaining the existing unpaginated API.
        walks = walks.distinct()

        walk_list = []
        for walk in walks:
            # Format points_of_interest as a list by splitting on semicolons and stripping whitespace
            formatted_pubs = []
            # ...existing code for walk conversion...
            walk_list.append(
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
                    points_of_interest=[poi.strip() for poi in walk.points_of_interest.split(';')] if walk.points_of_interest else [],
                    os_explorer_reference=walk.os_explorer_reference,
                    steepness_level=walk.steepness_level,
                    footwear_category=walk.footwear_category,
                    recommended_footwear=walk.recommended_footwear,
                    pubs_list=[
                        pub
                        if isinstance(pub, dict) and "name" in pub
                        else {"name": str(pub)}
                        for pub in walk.pubs_list
                    ],
                    trail_considerations=walk.trail_considerations,
                    has_stiles=walk.has_stiles,
                    has_bus_access=walk.has_bus_access,
                    created_at=walk.created_at.isoformat(),
                    updated_at=walk.updated_at.isoformat(),
                )
            )
        return walk_list
    except Exception as e:
        print(f"Error in list_walks: {e}")
        return []


@api.get("/walks/nearby", response=List[WalkOutSchema])
def find_nearby_walks(
    request,
    latitude: float = Query(..., description="Latitude of the center point"),
    longitude: float = Query(..., description="Longitude of the center point"),
    radius: float = Query(5000, description="Search radius in meters"),
    limit: int = Query(50, description="Maximum number of results to return"),
):
    """Find walks near a specific location using efficient spatial queries"""
    try:
        # Validate coordinates and keep the bounding-box query bounded. The
        # endpoint remains unpaginated, but an unbounded radius could still
        # force a full-table scan and large Python-side response.
        if not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
            return []
        radius = max(0, min(radius, 50_000))
        limit = max(1, min(limit, 500))

        # Calculate bounding box for initial filtering
        lat_radius = radius / 111000  # Convert meters to degrees
        lng_radius = lat_radius / max(abs(math.cos(math.radians(latitude))), 1e-6)

        min_lat = latitude - lat_radius
        max_lat = latitude + lat_radius
        min_lng = longitude - lng_radius
        max_lng = longitude + lng_radius

        # Calculate the exact distance in PostgreSQL after the indexed
        # latitude/longitude bounding-box filter. This avoids materializing
        # and sorting the entire candidate set in Python.
        distance_sql = """
            6371000 * 2 * ASIN(LEAST(1.0, SQRT(
                POWER(SIN(RADIANS(latitude - %s) / 2), 2) +
                COS(RADIANS(%s)) * COS(RADIANS(latitude)) *
                POWER(SIN(RADIANS(longitude - %s) / 2), 2)
            )))
        """

        walks = (
            Walk.objects.filter(
                latitude__gte=min_lat,
                latitude__lte=max_lat,
                longitude__gte=min_lng,
                longitude__lte=max_lng,
            )
            .annotate(
                nearby_distance=RawSQL(  # noqa: S611 - SQL uses only bound coordinates
                    distance_sql,
                    (latitude, latitude, longitude),
                    output_field=FloatField(),
                ),
            )
            .filter(nearby_distance__lte=radius)
            .order_by("nearby_distance")
            .prefetch_related("features", "categories", "related_categories")
            .annotate(
                is_favorite=Exists(
                    Walk.favorites.through.objects.filter(
                        walk_id=OuterRef("pk"), user=request.user
                    )
                )
                if request.user.is_authenticated
                else Value(False)
            )
        )

        # Calculate exact distances and prepare response
        results = []
        for walk in walks:
            try:
                walk_out = WalkOutSchema(
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
                            {"name": f.name, "slug": f.slug}
                            for f in walk.features.all()
                        ],
                        categories=[
                            {"name": c.name, "slug": c.slug}
                            for c in walk.categories.all()
                        ],
                        related_categories=[
                            {"name": rc.name, "slug": rc.slug}
                            for rc in walk.related_categories.all()
                        ],
                        highlights=walk.highlights,
                        points_of_interest=[poi.strip() for poi in walk.points_of_interest.split(';')] if walk.points_of_interest else [],
                        os_explorer_reference=walk.os_explorer_reference,
                        steepness_level=walk.steepness_level,
                        footwear_category=walk.footwear_category,
                        recommended_footwear=walk.recommended_footwear,
                        pubs_list=[
                            pub
                            if isinstance(pub, dict) and "name" in pub
                            else {"name": str(pub)}
                            for pub in walk.pubs_list
                        ],
                        trail_considerations=walk.trail_considerations,
                        has_stiles=walk.has_stiles,
                        has_bus_access=walk.has_bus_access,
                        created_at=walk.created_at.isoformat(),
                        updated_at=walk.updated_at.isoformat(),
                )
                results.append(walk_out)
            except (ValueError, TypeError) as e:
                print(f"Error processing walk {walk.id}: {e}")
                continue

        return results[:limit]

    except Exception as e:
        print(f"Error finding nearby walks: {e}")
        return []


@api.get("/walks/{identifier}", response=WalkOutSchema)
def get_walk(request: HttpRequest, identifier: str):
    """Get a single walk by ID or slug"""
    try:
        # Try UUID first
        try:
            lookup = {"id": UUID(identifier)}
        except ValueError:
            lookup = {"walk_id": identifier}

        walk = (
            Walk.objects.prefetch_related(
                "features", "categories", "related_categories"
            )
            .annotate(
                is_favorite=Exists(
                    Walk.favorites.through.objects.filter(
                        walk_id=OuterRef("pk"), user=request.user
                    )
                )
                if request.user.is_authenticated
                else Value(False)
            )
            .get(**lookup)
        )

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
            features=[{"name": f.name, "slug": f.slug} for f in walk.features.all()],
            categories=[{"name": c.name, "slug": c.slug} for c in walk.categories.all()],
            related_categories=[
                {"name": rc.name, "slug": rc.slug}
                for rc in walk.related_categories.all()
            ],
            highlights=walk.highlights,
            points_of_interest=[poi.strip() for poi in walk.points_of_interest.split(';')] if walk.points_of_interest else [],
            os_explorer_reference=walk.os_explorer_reference,
            steepness_level=walk.steepness_level,
            footwear_category=walk.footwear_category,
            recommended_footwear=walk.recommended_footwear,
            pubs_list=[
                pub if isinstance(pub, dict) and "name" in pub else {"name": str(pub)}
                for pub in walk.pubs_list
            ],
            trail_considerations=walk.trail_considerations,
            has_stiles=walk.has_stiles,
            has_bus_access=walk.has_bus_access,
            created_at=walk.created_at.isoformat(),
            updated_at=walk.updated_at.isoformat(),
        )
    except Walk.DoesNotExist:
        return JsonResponse(
            {"error": "Walk not found"}, 
            status=404
        )
    except Exception as e:
        print(f"Error getting walk details: {e}")
        return JsonResponse(
            {"error": "Internal server error"}, 
            status=500
        )


@api.post("/walks/{id}/favorite")
def toggle_favorite(request: HttpRequest, id: UUID):
    """Toggle favorite status for a walk"""
    if not request.user.is_authenticated:
        return {"status": "error", "message": "Authentication required"}

    with transaction.atomic():
        walk = get_object_or_404(Walk.objects.select_for_update(), id=id)
        through = Walk.favorites.through
        favorite, created = through.objects.get_or_create(
            walk_id=walk.id,
            user_id=request.user.id,
        )
        if created:
            is_favorite = True
        else:
            favorite.delete()
            is_favorite = False

    return {"status": "success", "walk_id": str(id), "is_favorite": is_favorite}


class TagResponseSchema(Schema):
    name: str
    slug: str
    usage_count: int
    type: str


# Add MarkerSchema definition
class MarkerSchema(Schema):
    id: int
    latitude: float
    longitude: float


# List tags
@api.get("/tags", response=List[TagResponseSchema])
def list_tags(request):
    """Get all walk tags with usage counts"""
    def build_tags():
        tags = []

        # Get category tags with counts
        category_tags = (
            WalkCategoryTag.objects.annotate(
                usage_count=Count("categorized_walks", distinct=True)
                + Count("related_walks", distinct=True)
            )
            .filter(usage_count__gt=0)
            .values("name", "slug", "usage_count")
        )

        # Add type field for category tags
        for tag in category_tags:
            tags.append(
                {
                    "name": tag["name"],
                    "slug": tag["slug"],
                    "usage_count": tag["usage_count"],
                    "type": "category",
                }
            )

        # Get feature tags with counts
        feature_tags = (
            WalkFeatureTag.objects.annotate(usage_count=Count("walks", distinct=True))
            .filter(usage_count__gt=0)
            .values("name", "slug", "usage_count")
        )

        # Add type field for feature tags
        for tag in feature_tags:
            tags.append(
                {
                    "name": tag["name"],
                    "slug": tag["slug"],
                    "usage_count": tag["usage_count"],
                    "type": "feature",
                }
            )

        return tags

    return get_cached_metadata("walkquest:api:tags:v1", build_tags)


@api.get("/config", response=ConfigSchema)
def get_config(request):
    """Get application configuration"""
    return get_cached_metadata(
        "walkquest:api:config:v1",
        lambda: {
            "mapboxToken": settings.MAPBOX_TOKEN,
            "map": {
                "style": "mapbox://styles/mapbox/outdoors-v12?optimize=true",
                "defaultCenter": [-4.85, 50.4],
                "defaultZoom": 9.5,
                "markerColors": {
                    "default": "#FF0000",
                    "selected": "#00FF00",
                    "favorite": "#FFD700",
                },
            },
            "filters": {"categories": True, "features": True, "distance": True},
        },
    )


@api.get("/filters")
def get_filters(request):
    """Get available filter options"""
    return get_cached_metadata(
        "walkquest:api:filters:v1",
        lambda: {
            "difficulties": [choice[0] for choice in Walk.DIFFICULTY_CHOICES],
            "footwear": [choice[0] for choice in Walk.FOOTWEAR_CHOICES],
            "categories": list(WalkCategoryTag.objects.values("name", "slug")),
            "features": list(WalkFeatureTag.objects.values("name", "slug")),
        },
    )


class GeometrySchema(Schema):
    type: str = "Feature"
    geometry: dict
    properties: dict


@api.get("/walks/{id}/geometry", response=GeometrySchema)
def get_walk_geometry(request: HttpRequest, id: UUID):
    """Get GeoJSON geometry for a walk route"""
    try:
        walk = get_object_or_404(
            Walk.objects.only("id", "walk_name", "distance", "route_geometry"), id=id
        )

        # Convert the geometry to GeoJSON
        if walk.route_geometry:
            geojson = orjson.loads(walk.route_geometry.geojson)

            # Create a GeoJSON Feature
            feature = {
                "type": "Feature",
                "geometry": geojson,
                "properties": {
                    "id": str(walk.id),
                    "name": walk.walk_name,
                    "distance": float(walk.distance) if walk.distance else 0,
                },
            }

            return feature

    except Exception as e:
        print(f"Error fetching geometry for walk {id}: {e}")
        return JsonResponse({"error": "Failed to fetch route geometry"}, status=404)


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in meters using Haversine formula"""
    R = 6371000  # Radius of Earth in meters
    
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c


def walk_to_dict(walk: Walk) -> dict:
    """Convert a Walk instance to a dictionary with all necessary fields"""
    return {
        "id": str(walk.id),
        "walk_id": walk.walk_id,
        "walk_name": walk.walk_name,
        "highlights": walk.highlights,
        "distance": float(walk.distance) if walk.distance else None,
        "steepness_level": walk.steepness_level,
        "latitude": float(walk.latitude),
        "longitude": float(walk.longitude),
        "features": [{"name": f.name, "slug": f.slug} for f in walk.features.all()],
        "categories": [{"name": c.name, "slug": c.slug} for c in walk.categories.all()],
        "related_categories": [
            {"name": rc.name, "slug": rc.slug} for rc in walk.related_categories.all()
        ],
        "has_pub": bool(walk.has_pub),
        "has_cafe": bool(walk.has_cafe),
        "has_bus_access": bool(walk.has_bus_access),
        "has_stiles": bool(walk.has_stiles),
        "created_at": walk.created_at.isoformat() if walk.created_at else None,
        "updated_at": walk.updated_at.isoformat() if walk.updated_at else None,
    }

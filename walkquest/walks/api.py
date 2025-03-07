import logging
import math
from uuid import UUID

import orjson
from django.conf import settings
from django.db.models import Count
from django.db.models import Exists
from django.db.models import OuterRef
from django.db.models import Value
from django.http import HttpRequest
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from ninja import NinjaAPI
from ninja import Query
from ninja import Router
from ninja.parser import Parser
from ninja.renderers import BaseRenderer
from ninja.security import HttpBearer
from ninja.security import django_auth

from .models import Adventure
from .models import Companion
from .models import Walk
from .models import WalkCategoryTag
from .models import WalkFeatureTag
from .schemas import AdventureSchema
from .schemas import CompanionInSchema
from .schemas import CompanionOutSchema
from .schemas import ConfigSchema
from .schemas import FavoriteResponseSchema
from .schemas import FiltersResponseSchema
from .schemas import GeometrySchema
from .schemas import TagResponseSchema
from .schemas import WalkCategoryTagSchema
from .schemas import WalkFeatureTagSchema
from .schemas import WalkOutSchema
from .schemas import WalkSchema

# Define latitude/longitude constants
MIN_LATITUDE = -90
MAX_LATITUDE = 90
MIN_LONGITUDE = -180
MAX_LONGITUDE = 180
EARTH_RADIUS_METERS = 6371000  # Radius of Earth in meters

logger = logging.getLogger(__name__)


# Authentication classes
class AuthenticationRequiredError(Exception):
    pass


class BearerAuth(HttpBearer):
    def authenticate(self, request, token):
        # In a real application, you'd validate the token
        # For now, we just check if the user is authenticated via Django sessions
        if request.user.is_authenticated:
            return request.user
        return None


# Exception handler for authentication errors
@api_instance.exception_handler(AuthenticationRequiredError)
def handle_authentication_required(request, exc):
    return JsonResponse(
        {"status": "error", "message": "Authentication required"},
        status=401,
    )


# Define custom ORJSONParser
class ORJSONParser(Parser):
    def parse_body(self, request):
        return orjson.loads(request.body)


# Define custom ORJSONRenderer using BaseRenderer
class ORJSONRenderer(BaseRenderer):
    media_type = "application/json"

    def render(self, _request, data, *, _response_status):
        return orjson.dumps(data)


# Update API initialization to use ORJSONParser
api_instance = NinjaAPI(
    title="WalkQuest API",
    version="1.0.0",
    csrf=True,
    parser=ORJSONParser(),
    renderer=ORJSONRenderer(),
)

# Create Routers
api = Router()
companion_router = Router(auth=django_auth)
walk_router = Router()
adventure_router = Router()
category_router = Router()
feature_router = Router()

# Add routers to API instance
api_instance.add_router("", api)
api_instance.add_router("companions", companion_router)
api_instance.add_router("walks", walk_router)
api_instance.add_router("adventures", adventure_router)
api_instance.add_router("categories", category_router)
api_instance.add_router("features", feature_router)


# Companion endpoints
@companion_router.get("/", response=list[CompanionOutSchema])
def list_companions(request: HttpRequest):
    """List companions for the authenticated user."""
    companions = Companion.objects.filter(user=request.user)
    return companions


@companion_router.get("/{companion_id}", response=CompanionOutSchema)
def get_companion(request: HttpRequest, companion_id: UUID):
    """Get a specific companion for the authenticated user."""
    companion = get_object_or_404(Companion, id=companion_id, user=request.user)
    return companion


@companion_router.post("/", response=CompanionOutSchema)
def create_companion(request: HttpRequest, data: CompanionInSchema):
    """Create a new companion for the authenticated user."""
    companion = Companion.objects.create(
        user=request.user,
        name=data.name,
    )
    return companion


# Walk endpoints
@walk_router.get("/", response=list[WalkSchema])
def list_walks_admin(request: HttpRequest):
    """List all walks (admin endpoint)."""
    return Walk.objects.all()


@walk_router.get("/{walk_id}", response=WalkSchema)
def get_walk_admin(request: HttpRequest, walk_id: UUID):
    """Get a specific walk (admin endpoint)."""
    return get_object_or_404(Walk, id=walk_id)


# Adventure endpoints
@adventure_router.get("/", response=list[AdventureSchema])
def list_adventures(request: HttpRequest):
    """List adventures."""
    return Adventure.objects.all()


@adventure_router.get("/{adventure_id}", response=AdventureSchema)
def get_adventure(request: HttpRequest, adventure_id: UUID):
    """Get a specific adventure."""
    return get_object_or_404(Adventure, id=adventure_id)


# Category tag endpoints
@category_router.get("/", response=list[WalkCategoryTagSchema])
def list_categories(request: HttpRequest):
    """List all category tags."""
    return WalkCategoryTag.objects.all()


# Feature tag endpoints
@feature_router.get("/", response=list[WalkFeatureTagSchema])
def list_features(request: HttpRequest):
    """List all feature tags."""
    return WalkFeatureTag.objects.all()


@api.get("/", response=dict)
def api_root(_request):
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


@api.get("/walks", response=list[WalkOutSchema])
def list_walks(
    request: HttpRequest,
    search: str | None = None,
    categories: str | None = None,
    features: str | None = None,
    difficulty: str | None = None,
    has_bus_access: bool | None = None,
    has_stiles: bool | None = None,
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
            else Value(False, output_field=bool)
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
        if has_bus_access is not None:
            walks = walks.filter(has_bus_access=has_bus_access)

        walk_list = []
        for walk in walks:
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
                    points_of_interest=walk.points_of_interest,
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
        logger.error(f"Error in list_walks: {e}")
        return []


@api.get("/walks/nearby", response=list[WalkOutSchema])
def find_nearby_walks(
    request,
    latitude: float = Query(..., description="Latitude of the center point"),
    longitude: float = Query(..., description="Longitude of the center point"),
    radius: float = Query(5000, description="Search radius in meters"),
    limit: int = Query(50, description="Maximum number of results to return"),
):
    """Find walks near a specific location using efficient spatial queries"""
    try:
        # Validate coordinates
        if not (MIN_LATITUDE <= latitude <= MAX_LATITUDE) or not (MIN_LONGITUDE <= longitude <= MAX_LONGITUDE):
            return []

        # Calculate bounding box for initial filtering
        lat_radius = radius / 111000  # Convert meters to degrees
        lng_radius = lat_radius / math.cos(math.radians(latitude))

        min_lat = latitude - lat_radius
        max_lat = latitude + lat_radius
        min_lng = longitude - lng_radius
        max_lng = longitude + lng_radius

        walks = (
            Walk.objects.filter(
                latitude__gte=min_lat,
                latitude__lte=max_lat,
                longitude__gte=min_lng,
                longitude__lte=max_lng,
            )
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
                distance = haversine(
                    latitude, longitude, float(walk.latitude), float(walk.longitude)
                )

                if distance <= radius:
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
                        points_of_interest=walk.points_of_interest,
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
                logger.error(f"Error processing walk {walk.id}: {e}")
                continue

        # Sort by distance and limit results
        results.sort(key=lambda x: float(x.distance) if x.distance else float("inf"))
        return results[:limit]

    except Exception as e:
        logger.error(f"Error finding nearby walks: {e}")
        return []


@api.get("/walks/{identifier}", response=WalkOutSchema)
def get_walk(request: HttpRequest, identifier: str):
    """Get a single walk by ID or slug"""
    try:
        # Try UUID first
        try:
            uuid_id = UUID(identifier)
            walk = Walk.objects.get(id=uuid_id)
        except (ValueError, Walk.DoesNotExist):
            # If not UUID, try slug
            walk = Walk.objects.get(walk_id=identifier)

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
            .get(id=walk.id)  # Use get() again to get annotated version
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
            points_of_interest=walk.points_of_interest,
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
        logger.error(f"Error getting walk details: {e}")
        return JsonResponse(
            {"error": "Internal server error"}, 
            status=500
        )


@api.post("/walks/{walk_id}/favorite", response=FavoriteResponseSchema, auth=django_auth)
def toggle_favorite(request: HttpRequest, walk_id: UUID):
    """Toggle favorite status for a walk"""
    if not request.user.is_authenticated:
        raise AuthenticationRequiredError()

    walk = get_object_or_404(Walk, id=walk_id)
    if walk.favorites.filter(id=request.user.id).exists():
        walk.favorites.remove(request.user)
        is_favorite = False
    else:
        walk.favorites.add(request.user)
        is_favorite = True

    return {"status": "success", "walk_id": str(walk_id), "is_favorite": is_favorite}


@api.get("/tags", response=list[TagResponseSchema])
def list_tags(_request):
    """Get all walk tags with usage counts"""
    tags = []

    # Get category tags with counts
    category_tags = (
        WalkCategoryTag.objects.annotate(
            usage_count=Count("categorized_walks", distinct=True)
            + Count("related_walks", distinct=True),
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


@api.get("/config", response=ConfigSchema)
def get_config(_request):
    """Get application configuration"""
    return {
        "mapboxToken": settings.MAPBOX_TOKEN,
        "map": {
            "style": "mapbox://styles/mapbox/outdoors-v12?optimize=true",
            "defaultCenter": [-4.85, 50.4],  # Cornwall's approximate center
            "defaultZoom": 9.5,
            "markerColors": {
                "default": "#FF0000",  # Red markers
                "selected": "#00FF00",  # Green markers for selected
                "favorite": "#FFD700",  # Gold for favorites
            },
        },
        "filters": {"categories": True, "features": True, "distance": True},
    }


@api.get("/filters", response=FiltersResponseSchema)
def get_filters(_request):
    """Get available filter options"""
    return {
        "difficulties": [choice[0] for choice in Walk.DIFFICULTY_CHOICES],
        "footwear": [choice[0] for choice in Walk.FOOTWEAR_CHOICES],
        "categories": list(WalkCategoryTag.objects.values("name", "slug")),
        "features": list(WalkFeatureTag.objects.values("name", "slug")),
    }


@api.get("/walks/{walk_id}/geometry", response=GeometrySchema)
def get_walk_geometry(_request: HttpRequest, walk_id: UUID):
    """Get GeoJSON geometry for a walk route"""
    try:
        walk = get_object_or_404(
            Walk.objects.only("id", "walk_name", "distance", "route_geometry"),
            id=walk_id,
        )

        # Convert the geometry to GeoJSON
        if walk.route_geometry:
            geojson = orjson.loads(walk.route_geometry.geojson)

            # Create a GeoJSON Feature
            return {
                "type": "Feature",
                "geometry": geojson,
                "properties": {
                    "id": str(walk.id),
                    "name": walk.walk_name,
                    "distance": float(walk.distance) if walk.distance else 0,
                },
            }

    except Exception as e:
        logger.error(f"Error fetching geometry for walk {walk_id}: {e}")
        return JsonResponse({"error": "Failed to fetch route geometry"}, status=404)


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in meters using Haversine formula"""
    R = EARTH_RADIUS_METERS
    
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

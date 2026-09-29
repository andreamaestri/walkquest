import hashlib
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
from django.db.models import Max
from django.db.models import Prefetch
from django.db.models import Q
from django.db.models import FloatField
from django.db.models import OuterRef
from django.db.models import Value
from django.db.models.expressions import RawSQL
from django.http import HttpRequest
from django.http import HttpResponse
from django.http import HttpResponseNotModified
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
from .models import WalkPhoto
from .difficulty import normalize_difficulty
from .schemas import ConfigSchema
from .schemas import TagResponseSchema
from .schemas import WalkDetailSchema
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


SUMMARY_FIELDS = (
    "id",
    "walk_id",
    "walk_name",
    "distance",
    "latitude",
    "longitude",
    "steepness_level",
    "highlights",
    "points_of_interest",
    "has_pub",
    "has_cafe",
    "has_stiles",
    "has_bus_access",
    "updated_at",
)
LIST_CACHE_TIMEOUT = 60 * 60
LIST_CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=86400"
EXCERPT_LENGTH = 140


def make_excerpt(text: str | None, length: int = EXCERPT_LENGTH) -> str:
    """First sentence-ish of the highlights, trimmed on a word boundary."""
    text = " ".join((text or "").split())
    if len(text) <= length:
        return text
    cut = text[:length].rsplit(" ", 1)[0].rstrip(",;:")
    return f"{cut}…"


def split_points_of_interest(value: str | None) -> list[str]:
    return [poi.strip() for poi in (value or "").split(";") if poi.strip()]


def photo_thumb(photo: WalkPhoto | None) -> dict | None:
    if photo is None:
        return None
    width = height = None
    if photo.width and photo.height:
        width = min(photo.width, 320) if photo.thumb else photo.width
        height = round(photo.height * width / photo.width)
    return {"url": photo.thumb_url, "width": width, "height": height}


def walk_summary(walk: Walk) -> dict:
    main_photo = walk.list_photos[0] if getattr(walk, "list_photos", None) else None
    return {
        "id": walk.id,
        "walk_id": walk.walk_id,
        "walk_name": walk.walk_name,
        "distance": walk.distance,
        "latitude": walk.latitude,
        "longitude": walk.longitude,
        "steepness_level": walk.steepness_level,
        "difficulty": normalize_difficulty(walk.steepness_level),
        "excerpt": make_excerpt(walk.highlights),
        "points_of_interest": split_points_of_interest(walk.points_of_interest),
        # Slugs only; names come from /api/tags (cached client-side).
        "categories": sorted(
            {c.slug for c in walk.categories.all()} | {c.slug for c in walk.related_categories.all()}
        ),
        "features": [f.slug for f in walk.features.all()],
        "has_pub": walk.has_pub,
        "has_cafe": walk.has_cafe,
        "has_stiles": walk.has_stiles,
        "has_bus_access": walk.has_bus_access,
        "thumb": photo_thumb(main_photo),
    }


def walks_data_version() -> str:
    """Cheap fingerprint of everything the summary list depends on."""
    walks = Walk.objects.aggregate(n=Count("id"), t=Max("updated_at"))
    photos = WalkPhoto.objects.aggregate(n=Count("id"), t=Max("fetched_at"))
    tags = Walk.categories.through.objects.count() + Walk.related_categories.through.objects.count()
    raw = f"{walks['n']}|{walks['t']}|{photos['n']}|{photos['t']}|{tags}"
    return hashlib.sha1(raw.encode()).hexdigest()[:16]  # noqa: S324 - not security sensitive


def etag_matches(request: HttpRequest, etag: str) -> bool:
    header = request.headers.get("If-None-Match", "")
    candidates = {tag.strip().removeprefix("W/") for tag in header.split(",") if tag.strip()}
    return "*" in candidates or etag in candidates


def build_walk_list(filters: dict) -> bytes:
    # Filter on ids first: a walk can match several many-to-many filters, and
    # de-duplicating ids (not full rows) keeps TextField/LOB columns out of
    # SELECT DISTINCT, which Oracle doesn't allow.
    matching = Walk.objects.all()
    if filters.get("search"):
        matching = matching.filter(walk_name__icontains=filters["search"])
    if filters.get("categories"):
        matching = matching.filter(categories__slug__in=filters["categories"].split(","))
    if filters.get("features"):
        matching = matching.filter(features__slug__in=filters["features"].split(","))
    if filters.get("difficulty"):
        matching = matching.filter(steepness_level=filters["difficulty"])
    if filters.get("has_stiles") is not None:
        matching = matching.filter(has_stiles=filters["has_stiles"])
    if filters.get("has_bus_access") is not None:
        matching = matching.filter(has_bus_access=filters["has_bus_access"])

    walks = (
        Walk.objects.filter(id__in=matching.values("id"))
        .only(*SUMMARY_FIELDS)
        .prefetch_related(
            "features",
            "categories",
            "related_categories",
            Prefetch(
                "photos",
                queryset=WalkPhoto.objects.filter(Q(is_main=True) | Q(position__lte=1)).only(
                    "id", "walk_id", "is_main", "position", "image", "thumb", "source_url", "width", "height",
                ),
                to_attr="list_photos",
            ),
        )
        .order_by("walk_name")
    )
    return orjson.dumps([walk_summary(walk) for walk in walks])


@api.get("/walks")
def list_walks(
    request: HttpRequest,
    search: Optional[str] = None,
    categories: Optional[str] = None,
    features: Optional[str] = None,
    difficulty: Optional[str] = None,
    has_bus_access: Optional[bool] = None,
    has_stiles: Optional[bool] = None,
):
    """Every walk as a compact, cacheable summary (intentionally unpaginated).

    The payload is identical for every user (favourites come from
    ``/walks/favorites``), so it can be cached server-side, revalidated with
    ETags and stored by the browser. Full details are served by
    ``/walks/{identifier}``.
    """
    filters = {
        "search": search,
        "categories": categories,
        "features": features,
        "difficulty": difficulty,
        "has_bus_access": has_bus_access,
        "has_stiles": has_stiles,
    }
    filter_key = hashlib.sha1(orjson.dumps(filters, option=orjson.OPT_SORT_KEYS)).hexdigest()[:10]  # noqa: S324
    etag = f'"{walks_data_version()}-{filter_key}"'
    if etag_matches(request, etag):
        response = HttpResponseNotModified()
    else:
        cache_key = f"walkquest:api:walks:v3:{etag.strip('\"')}"
        body = cache.get(cache_key)
        if body is None:
            body = build_walk_list(filters)
            cache.set(cache_key, body, LIST_CACHE_TIMEOUT)
        response = HttpResponse(body, content_type="application/json")
    response["ETag"] = etag
    response["Cache-Control"] = LIST_CACHE_CONTROL
    return response


@api.get("/walks/favorites")
def list_favorite_walks(request: HttpRequest):
    """IDs of the current user's favourite walks (empty for anonymous users)."""
    if not request.user.is_authenticated:
        ids = []
    else:
        ids = list(
            Walk.favorites.through.objects.filter(user=request.user).values_list("walk_id", flat=True)
        )
    response = JsonResponse({"ids": [str(i) for i in ids]})
    response["Cache-Control"] = "private, no-cache"
    return response


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
        # Degrees → radians by multiplication: portable across PostgreSQL and
        # Oracle (which has no RADIANS function).
        distance_sql = """
            6371000 * 2 * ASIN(LEAST(1.0, SQRT(
                POWER(SIN((latitude - %s) * 0.017453292519943295 / 2), 2) +
                COS(%s * 0.017453292519943295) * COS(latitude * 0.017453292519943295) *
                POWER(SIN((longitude - %s) * 0.017453292519943295 / 2), 2)
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


def walk_detail(walk: Walk) -> dict:
    photos = list(walk.photos.all())
    return {
        "id": walk.id,
        "walk_id": walk.walk_id,
        "walk_name": walk.walk_name,
        "distance": walk.distance,
        "latitude": walk.latitude,
        "longitude": walk.longitude,
        "has_pub": walk.has_pub,
        "has_cafe": walk.has_cafe,
        "is_favorite": walk.is_favorite,
        "features": [{"name": f.name, "slug": f.slug} for f in walk.features.all()],
        "categories": [{"name": c.name, "slug": c.slug} for c in walk.categories.all()],
        "related_categories": [{"name": rc.name, "slug": rc.slug} for rc in walk.related_categories.all()],
        "highlights": walk.highlights,
        "points_of_interest": split_points_of_interest(walk.points_of_interest),
        "os_explorer_reference": walk.os_explorer_reference,
        "steepness_level": walk.steepness_level,
        "difficulty": normalize_difficulty(walk.steepness_level),
        "footwear_category": walk.footwear_category,
        "recommended_footwear": walk.recommended_footwear,
        "pubs_list": [
            pub if isinstance(pub, dict) and "name" in pub else {"name": str(pub)}
            for pub in walk.pubs_list
        ],
        "trail_considerations": walk.trail_considerations,
        "has_stiles": walk.has_stiles,
        "has_bus_access": walk.has_bus_access,
        "transport": walk.transport_info or None,
        "created_at": walk.created_at.isoformat(),
        "updated_at": walk.updated_at.isoformat(),
        "photos": [
            {
                "url": photo.url,
                "thumb": photo.thumb_url,
                "caption": photo.caption,
                "width": photo.width,
                "height": photo.height,
                "is_main": photo.is_main,
                "credit": photo.credit,
            }
            for photo in photos
        ],
        "photo_source_url": walk.photo_source_url or None,
        "photo_credit": photos[0].credit if photos else None,
    }


@api.get("/walks/{identifier}", response={200: WalkDetailSchema, 404: dict})
def get_walk(request: HttpRequest, identifier: str):
    """Full details for one walk (by UUID or slug), including its photos."""
    try:
        lookup = {"id": UUID(identifier)}
    except ValueError:
        lookup = {"walk_id": identifier}

    walk = (
        Walk.objects.defer("route_geometry")
        .prefetch_related("features", "categories", "related_categories", "photos")
        .annotate(
            is_favorite=Exists(
                Walk.favorites.through.objects.filter(walk_id=OuterRef("pk"), user=request.user)
            )
            if request.user.is_authenticated
            else Value(False)
        )
        .filter(**lookup)
        .first()
    )
    if walk is None:
        return 404, {"error": "Walk not found"}
    return 200, walk_detail(walk)


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


GEOMETRY_CACHE_TIMEOUT = 60 * 60 * 24


@api.get("/walks/{id}/geometry")
def get_walk_geometry(request: HttpRequest, id: UUID):
    """GeoJSON Feature for a walk's route (cached; routes rarely change)."""
    cache_key = f"walkquest:api:geometry:v2:{id}"
    body = cache.get(cache_key)
    if body is None:
        walk = Walk.objects.only("id", "walk_name", "distance", "route_geometry").filter(id=id).first()
        if walk is None or not walk.route_geometry:
            return JsonResponse({"error": "Route geometry not found"}, status=404)
        body = orjson.dumps(
            {
                "type": "Feature",
                "geometry": orjson.loads(walk.route_geometry.geojson),
                "properties": {
                    "id": str(walk.id),
                    "name": walk.walk_name,
                    "distance": float(walk.distance) if walk.distance else 0,
                },
            }
        )
        cache.set(cache_key, body, GEOMETRY_CACHE_TIMEOUT)
    response = HttpResponse(body, content_type="application/json")
    response["Cache-Control"] = "public, max-age=86400"
    return response


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

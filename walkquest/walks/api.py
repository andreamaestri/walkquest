from typing import List
from typing import Optional
from uuid import UUID

import orjson
from django.conf import settings
from django.contrib.gis.geos import GEOSGeometry
from django.db.models import Count
from django.db.models import Exists
from django.db.models import OuterRef
from django.db.models import Value
from django.http import HttpRequest
from django.http import JsonResponse
from ninja import NinjaAPI
from ninja import Router
from ninja import Schema
from ninja.parser import Parser
from ninja.renderers import BaseRenderer
from django.shortcuts import get_object_or_404

from .models import Walk
from .models import WalkCategoryTag
from .models import WalkFeatureTag
from .schemas import ConfigSchema
from .schemas import PubSchema
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

# Update API initialization to use ORJSONParser
api = NinjaAPI(
    title="WalkQuest API",
    version="1.0.0",
    csrf=True,
    parser=ORJSONParser(),  
    renderer=ORJSONRenderer()   # Using custom ORJSONRenderer
)
router = Router()

@api.get("/")
def api_root(request):
    """API root endpoint that returns available endpoints"""
    return {
        "version": "1.0.0",
        "endpoints": {
            "walks": "/walks",
            "walks_detail": "/walks/{walk_id}",
            "walks_geometry": "/walks/{walk_id}/geometry",
            "walks_favorite": "/walks/{walk_id}/favorite",
            "walks_filters": "/walks/filters",
            "tags": "/tags",
            "config": "/config",
            "docs": "/docs"
        }
    }

@router.get("/walks", response=List[WalkOutSchema])
def list_walks(
    request: HttpRequest,
    search: Optional[str] = None,
    categories: Optional[str] = None,
    features: Optional[str] = None,
    difficulty: Optional[str] = None,
    has_stiles: Optional[bool] = None,
    has_bus: Optional[bool] = None
):
    """List walks with optional filtering"""
    try:
        walks = Walk.objects.prefetch_related(
            'features',
            'categories',
            'related_categories'
        ).annotate(
            is_favorite=Exists(
                Walk.favorites.through.objects.filter(
                    walk_id=OuterRef('pk'),
                    user=request.user
                )
            ) if request.user.is_authenticated else Value(False)
        )
        if search:
            walks = walks.filter(walk_name__icontains=search)
        if categories:
            walks = walks.filter(categories__slug__in=categories.split(','))
        if features:
            walks = walks.filter(features__slug__in=features.split(','))
        if difficulty:
            walks = walks.filter(steepness_level=difficulty)
        if has_stiles is not None:
            walks = walks.filter(has_stiles=has_stiles)
        if has_bus is not None:
            walks = walks.filter(has_bus_access=has_bus)

        walk_list = []
        for walk in walks:
            # pubs_list handling removed (no longer used)
            formatted_pubs = []
            # ...existing code for walk conversion...
            walk_list.append(WalkOutSchema(
                id=walk.id,
                walk_id=walk.walk_id,
                walk_name=walk.walk_name,
                distance=walk.distance,
                latitude=walk.latitude,
                longitude=walk.longitude,
                has_pub=walk.has_pub,
                has_cafe=walk.has_cafe,
                is_favorite=walk.is_favorite,
                features=[{'name': f.name, 'slug': f.slug} for f in walk.features.all()],
                categories=[{'name': c.name, 'slug': c.slug} for c in walk.categories.all()],
                related_categories=[{'name': rc.name, 'slug': rc.slug} for rc in walk.related_categories.all()],
                highlights=walk.highlights,
                points_of_interest=walk.points_of_interest,
                os_explorer_reference=walk.os_explorer_reference,
                steepness_level=walk.steepness_level,
                footwear_category=walk.footwear_category,
                recommended_footwear=walk.recommended_footwear,
                pubs_list=formatted_pubs,
                trail_considerations=walk.trail_considerations,
                rewritten_trail_considerations=walk.rewritten_trail_considerations,
                has_stiles=walk.has_stiles,
                has_bus_access=walk.has_bus_access,
                created_at=walk.created_at.isoformat(),
                updated_at=walk.updated_at.isoformat()
            ))
        return walk_list
    except Exception as e:
        print(f"Error in list_walks: {e}")
        return []

@router.get("/walks/{walk_id}", response=WalkOutSchema)
def get_walk(request: HttpRequest, walk_id: UUID):
    """Get a single walk"""
    try:
        walk = Walk.objects.prefetch_related(
            'features',
            'categories',
            'related_categories'
        ).annotate(
            is_favorite=Exists(
                Walk.favorites.through.objects.filter(
                    walk_id=OuterRef('pk'),
                    user=request.user
                )
            ) if request.user.is_authenticated else Value(False)
        ).get(id=walk_id)

        # pubs_list handling removed (not used)
        formatted_pubs = []

        walk_data = WalkOutSchema(
            id=walk.id,
            walk_id=walk.walk_id,
            walk_name=walk.walk_name,
            distance=walk.distance,
            latitude=walk.latitude,
            longitude=walk.longitude,
            has_pub=walk.has_pub,
            has_cafe=walk.has_cafe,
            is_favorite=walk.is_favorite,
            features=[{'name': f.name, 'slug': f.slug} for f in walk.features.all()],
            categories=[{'name': c.name, 'slug': c.slug} for c in walk.categories.all()],
            related_categories=[{'name': rc.name, 'slug': rc.slug} for rc in walk.related_categories.all()],
            highlights=walk.highlights,
            points_of_interest=walk.points_of_interest,
            os_explorer_reference=walk.os_explorer_reference,
            steepness_level=walk.steepness_level,
            footwear_category=walk.footwear_category,
            recommended_footwear=walk.recommended_footwear,
            pubs_list=formatted_pubs,
            trail_considerations=walk.trail_considerations,
            rewritten_trail_considerations=walk.rewritten_trail_considerations,
            has_stiles=walk.has_stiles,
            has_bus_access=walk.has_bus_access,
            created_at=walk.created_at.isoformat(),
            updated_at=walk.updated_at.isoformat()
        )
        return walk_data
    except Walk.DoesNotExist:
        print(f"Walk with ID {walk_id} does not exist.")
        return JsonResponse({'error': 'Walk matching query does not exist.'}, status=404)

# Removed unused marker endpoints: /walks/markers and /walks/markers/geojson

@router.post("/walks/{walk_id}/favorite")
def toggle_favorite(request: HttpRequest, walk_id: UUID):
    """Toggle favorite status for a walk"""
    if not request.user.is_authenticated:
        return {"status": "error", "message": "Authentication required"}
    
    walk = get_object_or_404(Walk, id=walk_id)
    if walk.favorites.filter(id=request.user.id).exists():
        walk.favorites.remove(request.user)
        is_favorite = False
    else:
        walk.favorites.add(request.user)
        is_favorite = True

    return {
        "status": "success",
        "walk_id": str(walk_id),
        "is_favorite": is_favorite
    }

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
    tags = []

    # Get category tags with counts
    category_tags = (
        WalkCategoryTag.objects
        .annotate(
            usage_count=Count('categorized_walks', distinct=True) +
                       Count('related_walks', distinct=True)
        )
        .filter(usage_count__gt=0)
        .values('name', 'slug', 'usage_count')
    )

    # Add type field for category tags
    for tag in category_tags:
        tags.append({
            "name": tag["name"],
            "slug": tag["slug"],
            "usage_count": tag["usage_count"],
            "type": "category"
        })

    # Get feature tags with counts
    feature_tags = (
        WalkFeatureTag.objects
        .annotate(
            usage_count=Count('walks', distinct=True)
        )
        .filter(usage_count__gt=0)
        .values('name', 'slug', 'usage_count')
    )

    # Add type field for feature tags
    for tag in feature_tags:
        tags.append({
            "name": tag["name"],
            "slug": tag["slug"],
            "usage_count": tag["usage_count"],
            "type": "feature"
        })

    return tags

@router.get("/config", response=ConfigSchema)
def get_config(request):
    """Get application configuration"""
    return {
        "mapboxToken": settings.MAPBOX_TOKEN,
        "map": {
            "style": "mapbox://styles/mapbox/outdoors-v12?optimize=true",
            "defaultCenter": [-4.85, 50.4],  # Cornwall's approximate center
            "defaultZoom": 9.5,
            "markerColors": {
                "default": "#FF0000",    # Red markers
                "selected": "#00FF00",    # Green markers for selected
                "favorite": "#FFD700"     # Gold for favorites
            }
        },
        "filters": {
            "categories": True,
            "features": True,
            "distance": True
        }
    }

@router.get("/walks/filters")
def get_walk_filters(request):
    """Get available filter options"""
    return {
        "difficulties": [choice[0] for choice in Walk.DIFFICULTY_CHOICES],
        "footwear": [choice[0] for choice in Walk.FOOTWEAR_CHOICES],
        "categories": list(WalkCategoryTag.objects.values('name', 'slug')),
        "features": list(WalkFeatureTag.objects.values('name', 'slug')),
    }

api.add_router("/", router)

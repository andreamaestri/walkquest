from typing import List, Optional, Dict
from uuid import UUID
from ninja import NinjaAPI, Schema, Router
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.db.models import Count, Prefetch
from pydantic import BaseModel

from .models import Walk, WalkFeatureTag, WalkCategoryTag
from .schemas import WalkOutSchema, TagResponseSchema

# Add new response schemas
class FavoriteResponse(Schema):
    status: str
    is_favorite: bool
    walk_id: str

class WalkListResponse(Schema):
    total: int
    walks: List[WalkOutSchema]

api = NinjaAPI(title="WalkQuest API", version="1.0.0", csrf=True)

# List walks
@api.get("/walks", response=WalkListResponse)
def list_walks(request, search: str = None):
    """Get all walks with optional search"""
    queryset = Walk.objects.select_related('adventure').prefetch_related(
        'features',
        'categories',
        'related_categories'
    )
    if search:
        queryset = queryset.filter(walk_name__icontains=search)
    
    walks = list(queryset)  # Materialize queryset
    return {
        "total": len(walks),
        "walks": walks
    }

# Get single walk
@api.get("/walks/{walk_id}", response=WalkOutSchema)
def get_walk(request, walk_id: UUID):
    """Get a single walk by ID"""
    walk = get_object_or_404(
        Walk.objects.prefetch_related(
            'features',
            'categories',
            'related_categories'
        ),
        id=walk_id
    )
    return walk

# Get walk geometry
@api.get("/walks/{walk_id}/geometry")
def get_walk_geometry(request, walk_id: UUID):
    """Get geometry data for a specific walk"""
    walk = Walk.objects.get(id=walk_id)
    return {
        "type": "Feature",
        "geometry": walk.geometry,
        "properties": {
            "walk_id": str(walk.id),
            "walk_name": walk.walk_name,
        }
    }

class TagResponseSchema(Schema):
    name: str
    slug: str
    usage_count: int
    type: str

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
    tags.extend([
        {
            "name": tag["name"],
            "slug": tag["slug"],
            "usage_count": tag["usage_count"],
            "type": "category"
        }
        for tag in category_tags
    ])

    # Get feature tags with counts
    feature_tags = (
        WalkFeatureTag.objects
        .annotate(usage_count=Count('walks', distinct=True))
        .filter(usage_count__gt=0)
        .values('name', 'slug', 'usage_count')
    )
    tags.extend([
        {
            "name": tag["name"],
            "slug": tag["slug"],
            "usage_count": tag["usage_count"],
            "type": "feature"
        }
        for tag in feature_tags
    ])

    return tags

class MapConfigSchema(BaseModel):
    style: str
    defaultCenter: List[float]
    defaultZoom: float
    markerColors: Dict[str, str]

class ConfigSchema(BaseModel):
    map: MapConfigSchema
    mapboxToken: str

# Get application config
@api.get("/config", response=ConfigSchema)
def get_config(request):
    """Get application configuration"""
    return {
        "mapboxToken": settings.MAPBOX_TOKEN,
        "map": {
            "style": "mapbox://styles/mapbox/outdoors-v12?optimize=true",
            "defaultCenter": [-4.85, 50.4],
            "defaultZoom": 9.5,
            "markerColors": {
                "default": "#FF0000",    # Red markers
                "selected": "#00FF00"    # Green markers for selected
            }
        }
    }

# Toggle favorite status
@api.post("/walks/{walk_id}/favorite", response=FavoriteResponse)
def toggle_favorite(request, walk_id: UUID):
    """Toggle favorite status for a walk"""
    if not request.user.is_authenticated:
        return {"status": "error", "message": "Authentication required"}
    
    walk = get_object_or_404(Walk, id=walk_id)
    is_favorite = request.user.favorite_walks.filter(id=walk_id).exists()
    
    if is_favorite:
        request.user.favorite_walks.remove(walk)
        status = "unfavorited"
    else:
        request.user.favorite_walks.add(walk)
        status = "favorited"
    
    return {
        "status": status,
        "is_favorite": not is_favorite,
        "walk_id": str(walk_id)
    }

# Filter walks by categories
@api.post("/walks/filter", response=List[WalkOutSchema])
def filter_walks(request, categories: List[str]):
    """Filter walks by categories"""
    queryset = Walk.objects.prefetch_related(
        'features',
        'categories',
        'related_categories'
    ).filter(related_categories__name__in=categories).distinct()
    return queryset

def _serialize_walk(walk: Walk) -> dict:
    """Helper function to serialize a walk instance"""
    return {
        "id": str(walk.id),
        "walk_id": walk.walk_id,
        "walk_name": walk.walk_name,
        "distance": float(walk.distance) if walk.distance else None,
        "latitude": float(walk.latitude),
        "longitude": float(walk.longitude),
        "has_pub": bool(walk.has_pub),
        "has_cafe": bool(walk.has_cafe),
        "features": [
            {"name": feature.name, "slug": feature.slug}
            for feature in walk.features.all()
        ],
        "categories": [
            {"name": category.name, "slug": category.slug}
            for category in walk.categories.all()
        ],
        "related_categories": [
            {"name": category.name, "slug": category.slug}
            for category in walk.related_categories.all()
        ]
    }

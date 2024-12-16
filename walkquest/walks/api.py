from typing import List
from typing import Optional
from uuid import UUID
from django.conf import settings

from django.db.models import Count
from django.db.models import Exists
from django.db.models import OuterRef
from django.db.models import Value
from django.http import HttpRequest
from django.shortcuts import get_object_or_404
from ninja import NinjaAPI
from ninja import Router
from ninja import Schema

from .models import Walk
from .models import WalkCategoryTag
from .models import WalkFeatureTag
from .schemas import TagResponseSchema
from .schemas import WalkOutSchema
from .schemas import ConfigSchema

api = NinjaAPI(title="WalkQuest API", version="1.0.0", csrf=True)
router = Router()

@router.get("/walks", response=List[WalkOutSchema])
def list_walks(
    request: HttpRequest,
    search: Optional[str] = None,
    categories: Optional[str] = None,  # Changed from List[str] to str
    features: Optional[str] = None,    # Changed from List[str] to str
):
    """List walks with optional filtering"""
    try:
        walks = Walk.objects.prefetch_related(
            'features',
            'categories',
            'related_categories'  # Ensure related_categories is prefetched
        )
        
        if search:
            walks = walks.filter(walk_name__icontains=search)
        
        if categories:
            category_list = [cat.strip() for cat in categories.split(',')]
            walks = walks.filter(categories__slug__in=category_list)
        
        if features:
            feature_list = [feat.strip() for feat in features.split(',')]
            walks = walks.filter(features__slug__in=feature_list)
        
        if request.user.is_authenticated:
            walks = walks.annotate(
                is_favorite=Exists(
                    Walk.favorites.through.objects.filter(
                        walk_id=OuterRef('pk'),
                        user=request.user
                    )
                )
            )
        else:
            walks = walks.annotate(
                is_favorite=Value(False)
            )
        
        # Ensure we're returning a list of serialized walks
        return [WalkOutSchema.from_orm(walk) for walk in walks]
    except Exception as e:
        print(f"Error in list_walks: {e}")  # Debug log
        return []

@router.get("/walks/{walk_id}", response=WalkOutSchema)
def get_walk(request: HttpRequest, walk_id: UUID):
    """Get a single walk"""
    walk = Walk.objects.prefetch_related(
        'features',
        'categories',
        'related_categories'  # Add prefetch for related_categories
    ).annotate(
        is_favorite=Exists(
            Walk.favorites.through.objects.filter(
                walk_id=OuterRef('pk'),
                user=request.user
            )
        ) if request.user.is_authenticated else Value(False)
    ).get(id=walk_id)

    # Serialize Walk instance using WalkOutSchema
    serialized_walk = WalkOutSchema.from_orm(walk)
    return serialized_walk

@router.get("/walks/{walk_id}/geometry")
def get_walk_geometry(request: HttpRequest, walk_id: UUID):
    """Get geometry data for a specific walk"""
    walk = get_object_or_404(Walk, id=walk_id)

    if not walk.route_geometry:
        return {
            "status": "error",
            "message": "No route geometry available for this walk",
            "walk_id": str(walk_id)
        }

    try:
        return {
            "type": "Feature",
            "geometry": walk.route_geometry.geojson,
            "properties": {
                "walk_id": str(walk.id),
                "walk_name": walk.walk_name,
                "status": "success"
            }
        }
    except AttributeError:
        return {
            "status": "error",
            "message": "Invalid geometry data format",
            "walk_id": str(walk_id)
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
            "style": "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
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

api.add_router("/", router)
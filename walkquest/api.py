from ninja import Router
from django.http import HttpRequest
from typing import List, Optional
from .schemas import WalkOut, TagOut, ConfigOut

router = Router()

@router.get("/walks/", response=List[WalkOut])
def list_walks(
    request: HttpRequest,
    search: Optional[str] = None,
    categories: Optional[List[str]] = None,
    features: Optional[List[str]] = None
):
    """List walks with optional filtering"""
    walks = Walk.objects.all()
    
    if search:
        walks = walks.filter(walk_name__icontains=search)
    
    if categories:
        walks = walks.filter(categories__slug__in=categories)
    
    if features:
        walks = walks.filter(features__slug__in=features)
    
    # Add is_favorite field based on user authentication
    for walk in walks:
        walk.is_favorite = (
            request.user.is_authenticated and
            walk.favorites.filter(user=request.user).exists()
        )
    
    return walks

@router.get("/walks/{walk_id}", response=WalkOut)
def get_walk(request: HttpRequest, walk_id: int):
    """Get a single walk"""
    walk = Walk.objects.get(id=walk_id)
    walk.is_favorite = (
        request.user.is_authenticated and
        walk.favorites.filter(user=request.user).exists()
    )
    return walk

# ...existing API endpoints...

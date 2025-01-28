from ninja import Router
from django.http import HttpRequest
from typing import List, Optional
from .schemas import WalkOut, TagOut, ConfigOut
from walks.models import Walk  # Added import for Walk model

router = Router()

@router.get("/walks/", response=List[WalkOut])
def list_walks(
    request: HttpRequest,
    search: Optional[str] = None,
    categories: Optional[List[str]] = None,
    features: Optional[List[str]] = None
):
    """
    List walks with optional filtering
    
    Parameters:
    - search: Optional string to filter walks by name (case-insensitive)
    - categories: Optional list of category slugs to filter walks
    - features: Optional list of feature slugs to filter walks
    
    Example Request:
    GET /api/walks/?search=park&categories=urban&features=dog-friendly
    
    Response:
    [
        {
            "id": 1,
            "name": "Central Park Walk",
            "description": "A scenic walk through Central Park",
            "is_favorite": false,
            ...
        }
    ]
    
    Error Responses:
    - 401: Unauthorized (if authentication required)
    - 500: Server Error
    """
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
    """
    Get details of a specific walk
    
    Parameters:
    - walk_id: Integer ID of the walk to retrieve
    
    Example Request:
    GET /api/walks/1/
    
    Response:
    {
        "id": 1,
        "name": "Central Park Walk",
        "description": "A scenic walk through Central Park",
        "is_favorite": false,
        ...
    }
    
    Error Responses:
    - 404: Walk not found
    - 401: Unauthorized (if authentication required)
    - 500: Server Error
    """
    walk = Walk.objects.get(id=walk_id)
    walk.is_favorite = (
        request.user.is_authenticated and
        walk.favorites.filter(user=request.user).exists()
    )
    return walk

# ...existing API endpoints...

from ninja import Router
from django.http import HttpRequest
from typing import List, Optional
from .schemas import WalkOut, TagOut, ConfigOut
from walks.models import Walk  # Added import for Walk model

router = Router()

@router.get("/walks/", response=List[WalkOut])
def list_walks(request: HttpRequest):
    """
    List all walks
    
    Example Request:
    GET /api/walks/
    
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

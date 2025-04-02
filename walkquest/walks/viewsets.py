from ninja import Router
from typing import List
from .models import Walk
from .schemas import WalkSchema

router = Router()

@router.get("/", response=List[WalkSchema])
def list_walks(request):
    # Optimize with prefetch_related to reduce database queries
    walks = Walk.objects.prefetch_related(
        'features', 
        'categories', 
        'related_categories'
    ).select_related(
        'adventure'
    ).all()
    return walks

@router.get("/{walk_id}", response=WalkSchema)
def get_walk(request, walk_id: str):
    # Optimize single walk retrieval
    walk = Walk.objects.prefetch_related(
        'features', 
        'categories', 
        'related_categories'
    ).select_related(
        'adventure'
    ).get(walk_id=walk_id)
    return walk

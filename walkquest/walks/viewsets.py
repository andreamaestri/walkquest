from ninja import Router
from typing import List
from .models import Walk
from .schemas import WalkSchema

router = Router()

@router.get("/", response=List[WalkSchema])
def list_walks(request):
    walks = Walk.objects.prefetch_related('features', 'categories').all()
    return walks

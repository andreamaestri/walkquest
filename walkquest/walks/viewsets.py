
from ninja import Router

from .models import Walk
from .schemas import WalkSchema

router = Router()

@router.get("/", response=list[WalkSchema])
def list_walks(request):
    return Walk.objects.prefetch_related("features", "categories").all()

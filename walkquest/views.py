from django.shortcuts import redirect, render
from django.http import HttpResponse, JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.http import require_GET

from django.conf import settings
from django.http import Http404
from django.core.serializers.json import DjangoJSONEncoder
import json
from django.utils.html import escapejs
from .walks.models import Walk
from django.shortcuts import get_object_or_404

WALK_NOT_FOUND_MESSAGE = "The requested walk could not be found"

def index(request, walk_id=None):
    """Main view that serves the Vue.js SPA"""
    context = {
        "MAPBOX_TOKEN": settings.MAPBOX_TOKEN,
        "initial_walks": "[]",
    }
    
    # If a walk_id slug is provided, try to find the walk
    if walk_id:
        try:
            # Optimize query with select_related and prefetch_related
            walk = Walk.objects.select_related('adventure').prefetch_related(
                'features', 
                'categories', 
                'related_categories'
            ).get(walk_id=walk_id)
            
            # Create walk data dict
            walk_data = {
                "id": str(walk.id),
                "walk_id": walk.walk_id,
                "walk_name": walk.walk_name,
                "highlights": walk.highlights,
                "distance": float(walk.distance) if walk.distance else None,
                "latitude": float(walk.latitude),
                "longitude": float(walk.longitude),
                "has_pub": walk.has_pub,
                "has_cafe": walk.has_cafe,
                "features": [
                    {"name": f.name, "slug": f.slug} for f in walk.features.all()
                ],
                "categories": [
                    {"name": c.name, "slug": c.slug} for c in walk.categories.all()
                ],
                "related_categories": [
                    {"name": rc.name, "slug": rc.slug}
                    for rc in walk.related_categories.all()
                ],
            }
            
            # Serialize and escape the walk data
            context["initial_walk"] = escapejs(
                json.dumps(walk_data, cls=DjangoJSONEncoder)
            )
            context["walk_id"] = walk_id
        except Walk.DoesNotExist as err:
            raise Http404(WALK_NOT_FOUND_MESSAGE) from err

    return render(request, "pages/home.html", context)

def legacy_walk_view(request, walk_uuid):
    """Handle legacy UUID-based URLs by redirecting to slug-based URL"""
    walk = get_object_or_404(Walk, id=walk_uuid)
    return redirect(
        "walk-detail-by-slug",
        walk_id=walk.walk_id,
        permanent=True,
    )

@require_GET
def csrf_token_view(request):
    """Return a CSRF token for use in frontend applications."""
    token = get_token(request)
    response = JsonResponse({"csrfToken": token})
    response["X-CSRFToken"] = token
    return response

def email_confirmed_view(request):
    """Custom view for displaying email confirmation success"""
    return render(request, "account/email_confirmed.html")
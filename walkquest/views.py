import json

from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.shortcuts import redirect
from django.shortcuts import render
from django.utils.html import escapejs

from .walks.models import Walk

WALK_NOT_FOUND_MESSAGE = "The requested walk could not be found"

def index(request, walk_id=None, path=None):
    """Main view that serves the Vue.js SPA or delegates to other views"""
    # Don't handle /accounts/ paths - let Django handle those
    if path and (path.startswith("accounts/") or request.path.startswith("/accounts/")):
        msg = "Not found"
        raise Http404(msg)

    # Don't handle /_allauth/ paths - let Django handle those
    if path and (path.startswith("_allauth/") or request.path.startswith("/_allauth/")):
        msg = "Not found"
        raise Http404(msg)

    return render_spa(request, walk_id)

def render_spa(request, walk_id=None):
    """Main view that serves the Vue.js SPA"""
    context = {
        "MAPBOX_TOKEN": settings.MAPBOX_TOKEN,
        "initial_walks": "[]",
    }

    # If a walk_id slug is provided, try to find the walk
    if walk_id:
        try:
            walk = Walk.objects.get(walk_id=walk_id)
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
                json.dumps(walk_data, cls=DjangoJSONEncoder),
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

from django.shortcuts import redirect, render
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.http import require_GET

from django.conf import settings
from django.http import Http404
from .walks.models import Walk
from django.shortcuts import get_object_or_404

WALK_NOT_FOUND_MESSAGE = "The requested walk could not be found"

def index(request, walk_id=None):
    """Main view that serves the Vue.js SPA"""
    context = {
        "MAPBOX_TOKEN": settings.MAPBOX_TOKEN,
        "initial_walks": "[]",
    }
    
    # Deep links to a walk: 404 for unknown slugs; the SPA loads the data
    # itself from the cached /api/walks index.
    if walk_id:
        if not Walk.objects.filter(walk_id=walk_id).exists():
            raise Http404(WALK_NOT_FOUND_MESSAGE)
        context["walk_id"] = walk_id

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

def serve_walk_media(request, path):
    """Serve imported walk photos when no web server handles MEDIA_URL.

    Enabled with SERVE_MEDIA=True (see README). Prefer an nginx
    ``location /media/`` block in production; this is a small fallback.
    """
    from django.views.static import serve

    response = serve(request, path, document_root=settings.MEDIA_ROOT)
    response["Cache-Control"] = "public, max-age=2592000, immutable"
    return response

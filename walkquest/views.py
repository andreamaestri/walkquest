from django.shortcuts import render, redirect, get_object_or_404
from django.conf import settings
from .walks.models import Walk

def index(request, walk_id=None):
    """Main view that serves the Vue.js SPA"""
    return render(request, "pages/home.html", {
        "MAPBOX_TOKEN": settings.MAPBOX_TOKEN,
    })

def legacy_walk_view(request, id):
    """Handle legacy UUID-based URLs by redirecting to slug-based URL"""
    walk = get_object_or_404(Walk, id=id)
    return redirect('walkquest:walk-detail-by-slug', walk_id=walk.walk_id, permanent=True)
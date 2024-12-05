import json
from django.views.generic import ListView
from django.conf import settings
from django.shortcuts import render
from .models import Walk

FEATURE_ICONS = {
    "coastal": "iconoir:sea-waves",
    "woodland": "ph:tree",
    "historic": "game-icons:spell-book",
    "pub": "mdi:pub-outline",
    "family_friendly": "bx:child",
    "dog_friendly": "fa6-solid:shield-dog",
    "circular": "material-symbols:refresh",
    "scenic": "material-symbols:landscape",
    "cafe": "bx:coffee",
    "wildlife": "game-icons:deer",
    "accessible": "material-symbols:wheelchair-pickup-rounded",
}

class HomePageView(ListView):
    model = Walk
    template_name = "pages/home.html"
    context_object_name = "walks"
    
    def get_queryset(self):
        walks = Walk.objects.exclude(latitude=None, longitude=None)
        for walk in walks:
            if not walk.features:
                walk.features = []
        return walks
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['mapbox_token'] = settings.MAPBOX_TOKEN
        context['feature_icons'] = FEATURE_ICONS
        return context

def map_view(request):
    # ...existing code...
    walks = Walk.objects.all()
    walk_data = []
    for walk in walks:
        icon_list = [
            FEATURE_ICONS[feature]
            for feature in (walk.features or [])
            if feature in FEATURE_ICONS
        ]
        walk_data.append({
            # ...existing fields...
            "id": walk.id,
            "name": walk.walk_name,
            "latitude": walk.latitude,
            "longitude": walk.longitude,
            "icons": icon_list,
        })
    return render(request, "map.html", {"walks": walk_data})
    # ...existing code...
from django.views.generic import ListView
from django.conf import settings
from django.shortcuts import render
from .models import Walk
from django.templatetags.static import static
from django.http import JsonResponse


FEATURE_ICONS = {
    "default": {"icon": "material-symbols:location-on", "marker": "markers.svg"},
    "coastal": {"icon": "iconoir:sea-waves", "marker": "sea.png"},
    "woodland": {"icon": "ph:tree", "marker": "tree.png"},
    "historic": {"icon": "game-icons:spell-book", "marker": "historic.png"},
    "pub": {"icon": "mdi:pub-outline", "marker": "pub.png"},
    "family_friendly": {"icon": "bx:child", "marker": "family.png"},
    "dog_friendly": {"icon": "fa6-solid:shield-dog", "marker": "dog.png"},
    "circular": {"icon": "material-symbols:refresh", "marker": "circular.png"},
    "scenic": {"icon": "material-symbols:landscape", "marker": "scenic.png"},
    "cafe": {"icon": "bx:coffee", "marker": "cafe.png"},
    "wildlife": {"icon": "game-icons:deer", "marker": "wildlife.png"},
    "accessible": {"icon": "material-symbols:wheelchair-pickup-rounded", "marker": "accessible.png"},
}

class HomePageView(ListView):
    model = Walk
    template_name = "pages/home.html"
    context_object_name = "walks"
    
    def get_queryset(self):
        return Walk.objects.exclude(latitude=None, longitude=None)
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # Prepare JSON-safe data
        walks_data = [{
            'id': walk.id,
            'walk_name': walk.walk_name,
            'description': walk.description,
            'latitude': float(walk.latitude),
            'longitude': float(walk.longitude),
            'features': walk.features or []
        } for walk in self.get_queryset()]
        
        # Ensure marker URLs are absolute paths
        markers_data = {
            k: self.request.build_absolute_uri(static(f'images/markers/{v["marker"]}'))
            for k, v in FEATURE_ICONS.items()
        }
        
        # Debug marker URLs
        print("Marker URLs:", markers_data)
        
        feature_icons_data = {
            k: v['icon'] for k, v in FEATURE_ICONS.items()
        }
        
        # Add JSON-encoded data to context
        context.update({
            'walks_json': JsonResponse(walks_data, safe=False).content.decode('utf-8'),
            'marker_icons_json': JsonResponse(markers_data).content.decode('utf-8'),
            'feature_icons_json': JsonResponse(feature_icons_data).content.decode('utf-8'),
            'mapbox_token': settings.MAPBOX_TOKEN,
            # Keep original data for template rendering
            'walks': walks_data,
            'marker_icons': markers_data,
            'feature_icons': feature_icons_data,
        })
        
        return context

def map_view(request):
    # ...existing code...
    walks = Walk.objects.all()
    walk_data = []
    for walk in walks:
        icon_list = [
            FEATURE_ICONS[feature]['icon']
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
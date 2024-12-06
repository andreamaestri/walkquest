from dataclasses import dataclass
from typing import Any

from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import render
from django.templatetags.static import static
from django.views.generic import ListView

from .models import Walk


@dataclass
class FeatureIcon:
    """Class representing feature icons with their respective markers."""
    icon: str
    marker: str


class WalkFeatures:
    """Constants and mappings for walk features."""

    FEATURE_ICONS = {
        "default": FeatureIcon("material-symbols:location-on", "markers.svg"),
        "coastal": FeatureIcon("iconoir:sea-waves", "sea.png"),
        "woodland": FeatureIcon("ph:tree", "tree.png"),
        "historic": FeatureIcon("game-icons:spell-book", "historic.png"),
        "pub": FeatureIcon("mdi:pub-outline", "pub.png"),
        "family_friendly": FeatureIcon("bx:child", "family.png"),
        "dog_friendly": FeatureIcon("fa6-solid:shield-dog", "dog.png"),
        "circular": FeatureIcon("material-symbols:refresh", "circular.png"),
        "scenic": FeatureIcon("material-symbols:landscape", "scenic.png"),
        "cafe": FeatureIcon("bx:coffee", "cafe.png"),
        "wildlife": FeatureIcon("game-icons:deer", "wildlife.png"),
        "accessible": FeatureIcon(
            "material-symbols:wheelchair-pickup-rounded",
            "accessible.png",
        ),
    }

    @classmethod
    def get_icon_urls(cls, request) -> dict[str, str]:
        """Get absolute URLs for all feature markers."""
        return {
            k: request.build_absolute_uri(static(f"images/markers/{v.marker}"))
            for k, v in cls.FEATURE_ICONS.items()
        }

    @classmethod
    def get_icon_mappings(cls) -> dict[str, str]:
        """Get icon mappings for features."""
        return {k: v.icon for k, v in cls.FEATURE_ICONS.items()}


class WalkDataService:
    """Service class for processing walk data."""

    def __init__(self, walk: Walk):
        """Initialize with a Walk instance."""
        self.walk = walk

    def to_dict(self) -> dict[str, Any]:
        """Convert a walk instance to a dictionary."""
        return {
            "id": self.walk.id,
            "walk_name": self.walk.walk_name,
            "description": self.walk.description,
            "latitude": float(self.walk.latitude) if self.walk.latitude else None,
            "longitude": float(self.walk.longitude) if self.walk.longitude else None,
            "distance": self.walk.distance,
            "duration": self._calculate_duration(),
            "steepness_level": self.walk.steepness_level,
            "features": self.walk.features or [],
        }

    def _calculate_duration(self) -> str:
        """Calculate walk duration based on distance."""
        if self.walk.distance:
            return f"{self.walk.distance / 3:.1f} hours"
        return None


class HomePageView(ListView):
    """View for the home page displaying walks."""
    model = Walk
    template_name = "pages/home.html"
    context_object_name = "walks"
    
    def get_queryset(self):
        """Get walks with valid coordinates."""
        return Walk.objects.exclude(latitude=None, longitude=None)

    def get_context_data(self, **kwargs):
        """Prepare context data for template."""
        context = super().get_context_data(**kwargs)
        context.update({
            'walks': self.get_queryset(),  # Direct queryset
            'mapbox_token': settings.MAPBOX_TOKEN,
            'feature_icons': WalkFeatures.get_icon_mappings(),
        })
        return context


def map_view(request):
    """View for displaying walks on a map."""
    walks = Walk.objects.all()
    walk_data = []

    for walk in walks:
        icon_list = [
            WalkFeatures.FEATURE_ICONS[feature].icon
            for feature in (walk.features or [])
            if feature in WalkFeatures.FEATURE_ICONS
        ]

        walk_data.append({
            "id": walk.id,
            "name": walk.walk_name,
            "latitude": walk.latitude,
            "longitude": walk.longitude
        })
    return render(request, "map.html", {"walks": walk_data})

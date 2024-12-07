import contextlib
from dataclasses import dataclass
from datetime import datetime
from typing import Any
from uuid import UUID

from django.conf import settings
from django.contrib.gis.geos import LineString
from django.core.serializers.json import DjangoJSONEncoder
from django.db.models import QuerySet
from django.http import JsonResponse
from django.utils.functional import cached_property
from django.views.generic import ListView

from .models import Walk


@dataclass
class WalkFeature:
    """Represents a walk feature with its associated icons"""

    icon: str
    marker: str


class CustomJSONEncoder(DjangoJSONEncoder):
    """Custom JSON encoder to handle UUID, datetime and LineString objects"""

    def default(self, obj):
        if isinstance(obj, UUID):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, LineString):
            return obj.geojson
        return super().default(obj)


class WalkSerializer:
    """Handles Walk model serialization"""

    @staticmethod
    def serialize_walk(walk: Walk) -> dict[str, Any]:
        """Serialize a single walk instance"""
        return {
            "id": walk.id,
            "walk_id": walk.walk_id,
            "walk_name": walk.walk_name,
            "coordinates": {
                "latitude": float(walk.latitude),
                "longitude": float(walk.longitude),
            },
            "details": {
                "distance": float(walk.distance) if walk.distance else None,
                "steepness_level": walk.steepness_level,
                "os_explorer_reference": walk.os_explorer_reference,
            },
            "features": {
                "has_pub": walk.has_pub,
                "has_cafe": walk.has_cafe,
                "has_bus_access": walk.has_bus_access,
                "has_stiles": walk.has_stiles,
                "tags": walk.features,
            },
            "content": {
                "highlights": walk.highlights,
                "points_of_interest": walk.points_of_interest,
                "trail_considerations": walk.trail_considerations,
            },
            "amenities": {
                "pubs": walk.pubs_list if walk.has_pub else [],
                "footwear": walk.footwear_category,
                "footwear_recommendations": walk.recommended_footwear,
            },
            "metadata": {"created_at": walk.created_at, "updated_at": walk.updated_at},
        }


class BaseWalkView:
    """Base class for walk-related views with shared functionality"""

    @cached_property
    def feature_icons(self) -> dict[str, dict[str, str]]:
        """Define feature icons mapping"""
        return {
            "coastal": {"icon": "mdi:waves", "marker": "coastal.png"},
            "woodland": {"icon": "ph:tree", "marker": "woodland.png"},
            "historic": {"icon": "game-icons:spell-book", "marker": "historic.png"},
            "pub": {"icon": "mdi:pub", "marker": "pub.png"},
            "family_friendly": {"icon": "bx:child", "marker": "family.png"},
            "dog_friendly": {"icon": "fa6-solid:shield-dog", "marker": "dog.png"},
            "circular": {"icon": "material-symbols:refresh", "marker": "circular.png"},
            "scenic": {"icon": "material-symbols:landscape", "marker": "scenic.png"},
            "cafe": {"icon": "bx:coffee", "marker": "cafe.png"},
            "accessible": {
                "icon": "material-symbols:wheelchair-pickup",
                "marker": "accessible.png",
            },
        }

    def get_map_config(self) -> dict[str, Any]:
        """Get map configuration"""
        return {
            "map": {
                "style": "mapbox://styles/mapbox/outdoors-v12",
                "defaultCenter": [-4.85, 50.40],
                "defaultZoom": 9,
                "markerColors": {"default": "#4F46E5", "selected": "#DC2626"},
            },
            "ui": {"list": {"itemSize": 92, "overscan": 5, "debounceMs": 300}},
        }


class HomePageView(ListView, BaseWalkView):
    """Main landing page view"""

    model = Walk
    template_name = "pages/home.html"
    context_object_name = "walks"

    def get_queryset(self) -> QuerySet:
        """Get walks with optional filtering"""
        queryset = Walk.objects.all()

        # Add filters based on URL parameters
        feature = self.request.GET.get("feature")
        if feature:
            queryset = queryset.filter(features__contains=[feature])

        has_pub = self.request.GET.get("has_pub")
        if has_pub:
            queryset = queryset.filter(has_pub=has_pub.lower() == "true")

        distance = self.request.GET.get("max_distance")
        if distance:
            with contextlib.suppress(ValueError):
                queryset = queryset.filter(distance__lte=float(distance))

        return queryset

    def get_context_data(self, **kwargs) -> dict[str, Any]:
        """Prepare context data for template"""
        context = super().get_context_data(**kwargs)

        try:
            # Serialize walks
            serialized_walks = [
                WalkSerializer.serialize_walk(walk)
                for walk in self.get_queryset()
            ]

            context.update(
                {
                    "walks_json": serialized_walks,
                    "mapbox_token": settings.MAPBOX_TOKEN,
                    "feature_icons_json": self.feature_icons,
                    "config": self.get_map_config(),
                },
            )

        except (ValueError, TypeError, AttributeError) as e:
            context.update(
                {
                    "error": str(e),
                    "walks_json": [],
                    "mapbox_token": settings.MAPBOX_TOKEN,
                    "feature_icons_json": self.feature_icons,
                    "config": self.get_map_config(),
                }
            )

        return context


class WalkAPIView(ListView, BaseWalkView):
    """API view for AJAX requests"""

    model = Walk

    def get(self, request, *args, **kwargs) -> JsonResponse:
        """Handle GET requests"""
        try:
            walks = self.get_queryset()
            data = [WalkSerializer.serialize_walk(walk) for walk in walks]
            return JsonResponse(
                {"status": "success", "data": data}, encoder=CustomJSONEncoder,
            )
        except (ValueError, TypeError, AttributeError) as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

    def get_queryset(self) -> QuerySet:
        """Get filtered queryset based on parameters"""
        queryset = super().get_queryset()

        # Apply filters from query parameters
        filters = {}

        feature = self.request.GET.get("feature")
        if feature:
            filters["features__contains"] = [feature]

        amenities = {
            "has_pub": self.request.GET.get("pub"),
            "has_cafe": self.request.GET.get("cafe"),
            "has_bus_access": self.request.GET.get("bus"),
            "has_stiles": self.request.GET.get("stiles"),
        }

        for key, value in amenities.items():
            if value is not None:
                filters[key] = value.lower() == "true"

        return queryset.filter(**filters)

"""
WalkQuest Homepage View
=======================

Django view for the WalkQuest walking routes application, focusing on Cornwall's beautiful paths.

Features:
    - Displays available walks with elegant organization
    - Filters for pubs and cafes (essential for any proper Cornish walk!)
    - Mapbox integration for beautiful route visualization
    - Efficient caching system for quick loading
    - HTMX integration for smooth user experience

Developer Notes:
    - Cache timeout: 15 minutes (perfect for a cream tea break)
    - Rate limiting: 100 requests per minute per IP
    - Remember to check settings.py for MAPBOX_TOKEN

Author: A tired but proud bootcamper (Andrea Maestri)
Last Updated: After a satisfying lunch break
"""

import logging
from typing import Any

from django.conf import settings
from django.core.cache import cache
from django.db.models import Count
from django.db.models import QuerySet
from django.http import HttpResponse
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.decorators.csrf import csrf_protect
from django.views.generic import ListView
from tagulous.views import autocomplete

from walkquest.walks.models import Walk  # Add WalkCategoryTag import
from walkquest.walks.models import WalkCategoryTag  # Add WalkCategoryTag import
from walkquest.walks.models import WalkFeatureTag  # Add WalkCategoryTag import

logger = logging.getLogger(__name__)

class WalkQuestConfig:
    """Configuration manager for WalkQuest application."""

    CATEGORIES = [
        "circular",
        "coastal",
        "pub",
        "beach",
        "cafe",
        "fishing",
        "lighthouse",
        "shipwreck",
    ]

    MAP_CONFIG = {
        "style": "mapbox://styles/mapbox/outdoors-v12",
        "defaultCenter": [-4.85, 50.4],
        "defaultZoom": 9,
        "markerColors": {
            "default": "#4F46E5",
            "selected": "#DC2626",
        },
    }

    @classmethod
    def get_config(cls):
        """Get consolidated configuration."""
        return {
            "mapboxToken": settings.MAPBOX_TOKEN,  # This will be handled securely
            "map": cls.MAP_CONFIG,
            "filters": {
                "categories": cls.CATEGORIES,
            },
        }

class HomePageView(ListView):
    """Main view for displaying walking routes with filtering and mapping capabilities."""

    model = Walk
    template_name = "pages/home.html"
    context_object_name = "walks"
    cache_timeout = 60 * 15  # 15 minutes

    def get_cache_key(self) -> str:
        """Generate unique cache key based on query parameters."""
        query_params = sorted(self.request.GET.items())
        return f"walks_home_{hash(frozenset(query_params))}"

    def get_queryset(self) -> QuerySet:
        """Get optimized and filtered queryset."""
        queryset = (
            super()
            .get_queryset()
            .select_related("adventure")
            .prefetch_related("related_categories")
        )

        # Apply search if provided
        search_query = self.request.GET.get("search", "").strip()
        if search_query:
            queryset = queryset.filter(walk_name__icontains=search_query)

        return queryset

    def get_statistics(self) -> dict[str, dict[str, int]]:
        """Get walk counts for features."""
        cache_key = "walk_statistics"
        stats = cache.get(cache_key)

        if not stats:
            try:
                # Get feature counts
                feature_counts = {}
                walks = self.model.objects.exclude(features__isnull=True)
                for walk in walks:
                    if isinstance(walk.features, list):
                        for feature in walk.features:
                            feature_counts[feature] = feature_counts.get(feature, 0) + 1

                stats = {
                    "features": feature_counts,
                }

                # Cache for 15 minutes
                cache.set(cache_key, stats, 60 * 15)

            except Exception as e:
                logger.exception(f"Error calculating statistics: {e}")
                stats = {"features": {}}

        return stats

    def serialize_walk(self, walk: Walk) -> dict[str, Any]:
        """Serialize walk instance to dictionary."""
        try:
            return {
                "id": str(walk.id),
                "walk_id": walk.walk_id,
                "walk_name": walk.walk_name,
                "highlights": walk.highlights,
                "distance": float(walk.distance) if walk.distance else None,
                "steepness_level": walk.steepness_level,
                "latitude": float(walk.latitude),
                "longitude": float(walk.longitude),
                "features": [str(tag) for tag in walk.features.all()],  # Convert tags to strings
                "categories": [str(tag) for tag in walk.related_categories.all()],
                "has_pub": bool(walk.has_pub),
                "has_cafe": bool(walk.has_cafe),
                "has_bus_access": bool(walk.has_bus_access),
                "has_stiles": bool(walk.has_stiles),
                "created_at": walk.created_at.isoformat() if walk.created_at else None,
            }
        except Exception as e:
            logger.exception(f"Walk serialization error for {walk.id}: {e}")
            return {}

    def get_initial_walks(self) -> list[dict[str, Any]]:
        """Get all walks for page load."""
        cache_key = "initial_walks"
        walks_data = cache.get(cache_key)

        if not walks_data:
            try:
                walks = self.get_queryset()
                walks_data = [self.serialize_walk(walk) for walk in walks]
                cache.set(cache_key, walks_data, 60 * 15)
            except Exception as e:
                logger.exception(f"Error getting initial walks: {e}")
                walks_data = []

        return walks_data

    def get_context_data(self, **kwargs) -> dict[str, Any]:
        """Prepare context data including configuration and initial walks."""
        context = super().get_context_data(**kwargs)
        context["config"] = WalkQuestConfig.get_config()
        context["initial_walks"] = self.get_initial_walks()

        # Add tags data with counts
        tags_with_counts = []
        
        # Get feature tag counts with renamed annotation
        feature_tags = (
            WalkFeatureTag.objects
            .annotate(usage_count=Count('walk_set'))
            .values('name', 'usage_count')
            .filter(usage_count__gt=0)
        )
        tags_with_counts.extend(feature_tags)

        # Get category tag counts with renamed annotation
        category_tags = (
            WalkCategoryTag.objects
            .annotate(usage_count=Count('walk_set'))
            .values('name', 'usage_count')
            .filter(usage_count__gt=0)
        )
        tags_with_counts.extend(category_tags)

        # Add to context
        context["tags_data"] = tags_with_counts

        return context

    @method_decorator(cache_page(cache_timeout))
    def get(self, request, *args, **kwargs) -> HttpResponse:
        """Handle GET requests with rate limiting and caching."""
        try:
            if request.headers.get("HX-Request"):
                return self._handle_htmx_request(request)

            response = super().get(request, *args, **kwargs)
            logger.info(f"Successfully rendered home page for {request.path}")
            return response

        except Exception as e:
            logger.exception("Error processing request")
            context = self.get_context_data(error=str(e))
            return self.render_to_response(context)

    def _handle_htmx_request(self, request) -> JsonResponse:
        """Handle HTMX requests with rate limiting."""
        if not self._check_rate_limit(request):
            return JsonResponse(
                {"status": "error", "message": "Rate limit exceeded"},
                status=429,
            )

        queryset = self.get_queryset()

        return JsonResponse({
            "status": "success",
            "data": [self.serialize_walk(walk) for walk in queryset],
        }, safe=False)

    def _check_rate_limit(self, request) -> bool:
        """Check if request is within rate limits."""
        client_ip = request.META.get("REMOTE_ADDR")
        rate_key = f"rate_limit_{client_ip}"

        try:
            request_count = cache.get(rate_key, 0)
            if request_count > 100:  # 100 requests per minute
                return False

            cache.set(rate_key, request_count + 1, 60)  # Reset after 1 minute
            return True

        except Exception:
            logger.exception("Rate limiting error")
            return True  # Allow request if rate limiting fails


class WalkSearchView(ListView):
    """HTMX-powered search view for walks."""
    model = Walk
    template_name = "partials/search_results.html"
    context_object_name = "walks"

    def get(self, request, *args, **kwargs):
        query = request.GET.get("q", "").strip()
        queryset = self.model.objects.none()  # Empty by default

        if query:
            queryset = (
                self.model.objects
                .filter(walk_name__icontains=query)
                .select_related("adventure")
                [:20]  # Limit results
            )

        walks = [self.serialize_walk(walk) for walk in queryset]

        if request.headers.get("HX-Request"):
            return JsonResponse({"walks": walks})

        return JsonResponse({"error": "Invalid request"}, status=400)

    def serialize_walk(self, walk):
        return {
            "id": str(walk.id),
            "walk_name": walk.walk_name,
            "steepness_level": walk.steepness_level,
            "distance": float(walk.distance) if walk.distance else None,
            "features": walk.features or [],
            "has_pub": walk.has_pub,
            "has_cafe": walk.has_cafe,
            "highlights": walk.highlights,
        }

@method_decorator(csrf_protect, name="dispatch")
class WalkFilterView(ListView):
    """HTMX view for filtering walks."""
    model = Walk
    template_name = "partials/walk_list.html"
    context_object_name = "walks"

    def post(self, request, *args, **kwargs):
        categories = request.POST.getlist("tag")  # Changed from "feature" to "tag"

        queryset = self.model.objects.all()

        if categories:
            # Filter walks that have ALL selected categories
            for category in categories:
                queryset = queryset.filter(related_categories=category)

        walks = [self.serialize_walk(walk) for walk in queryset[:20]]
        return JsonResponse(walks, safe=False)

    def serialize_walk(self, walk):
        return {
            "id": str(walk.id),
            "walk_name": walk.walk_name,
            "distance": float(walk.distance) if walk.distance else None,
            "related_categories": [str(tag) for tag in walk.related_categories.all()],
            "latitude": float(walk.latitude),
            "longitude": float(walk.longitude),
            "has_pub": bool(walk.has_pub),
            "has_cafe": bool(walk.has_cafe),
        }

@method_decorator(csrf_protect, name="dispatch")
class WalkListView(ListView):
    """HTMX view for walk list."""
    model = Walk
    template_name = "walks/partials/walk_list.html"  # Updated template path
    context_object_name = "walks"

    def get_queryset(self):
        """Get optimized queryset."""
        return (
            super()
            .get_queryset()
            .select_related("adventure")
            .prefetch_related("related_categories")
        )

    def get(self, request, *args, **kwargs):
        """Handle GET requests with error handling."""
        try:
            queryset = self.get_queryset()
            serialized_walks = [self.serialize_walk(walk) for walk in queryset]

            response_data = {
                "walks": serialized_walks,
            }

            if request.headers.get("HX-Request"):
                return JsonResponse(response_data)

            return self.render_to_response({"walks": response_data})

        except Exception as e:
            logger.exception(f"Error in walk list view: {e}")
            return JsonResponse(
                {"error": "Unable to load walks"},
                status=500,
            )

    def serialize_walk(self, walk):
        """Consistent walk serialization."""
        try:
            return {
                "id": str(walk.id),
                "walk_name": walk.walk_name,
                "steepness_level": walk.steepness_level,
                "distance": float(walk.distance) if walk.distance else None,
                "categories": [str(tag) for tag in walk.related_categories.all()],
                "latitude": float(walk.latitude),
                "longitude": float(walk.longitude),
                "has_pub": bool(walk.has_pub),
                "has_cafe": bool(walk.has_cafe),
            }
        except Exception as e:
            logger.exception(f"Walk serialization error for {walk.id}: {e}")
            return {}

def walk_features_autocomplete(request):
    """Autocomplete view for walk features."""
    return autocomplete(
        request,
        WalkFeatureTag,
        settings.TAGULOUS_AUTOCOMPLETE_LIMIT,
    )

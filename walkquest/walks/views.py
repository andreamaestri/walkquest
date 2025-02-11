"""
WalkQuest Homepage View
=======================

Django view for the WalkQuest walking routes application,
focusing on Cornwall's beautiful paths.

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

import json
import logging
from typing import Any

from django.conf import settings
from django.core.cache import cache
from django.core.paginator import Paginator
from django.core.serializers.json import DjangoJSONEncoder
from django.db.models import Count
from django.db.models import QuerySet
from django.http import HttpResponse
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.cache import cache_page
from django.views.decorators.csrf import csrf_protect
from django.views.generic import ListView
from tagulous.models.tagged import TaggedManager
from tagulous.views import autocomplete

from walkquest.walks.models import Walk
from walkquest.walks.models import WalkCategoryTag
from walkquest.walks.models import WalkFeatureTag

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
        "style": "mapbox://styles/mapbox/outdoors-v12?optimize=true",
        "defaultCenter": [-4.85, 50.4],
        "defaultZoom": 9,
        "markerColors": {
            "default": "#4F46E5",
            "selected": "#DC2626",
        },
    }

    REQUEST_LIMIT = 100  # requests per minute

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
    """Main view for displaying walking routes with filtering
    and mapping capabilities."""

    model = Walk
    template_name = "pages/home.html"
    context_object_name = "walks"
    cache_timeout = 60 * 15  # 15 minutes

    def get_cache_key(self) -> str:
        """Generate unique cache key based on query parameters."""
        query_params = sorted(self.request.GET.items())
        return f"walks_home_{hash(frozenset(query_params))}"

    def get_queryset(self) -> QuerySet:
        """Get optimized and filtered queryset with proper tag handling."""
        queryset = (
            super()
            .get_queryset()
            .select_related("adventure")
            .prefetch_related(
                "features",
                "categories",
                "related_categories",
            )
        )

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
                feature_counts = {}
                walks = self.model.objects.exclude(features__isnull=True)
                for walk in walks:
                    if isinstance(walk.features, list):
                        for feature in walk.features:
                            feature_counts[feature] = (
                                feature_counts.get(feature, 0) + 1
                            )

                stats = {
                    "features": feature_counts,
                }

                cache.set(cache_key, stats, 60 * 15)  # Cache for 15 minutes
            except Exception:
                logger.exception("Error calculating statistics")
                stats = {"features": {}}

        return stats

    def serialize_walk(self, walk: Walk) -> dict[str, Any]:
        """Serialize walk instance with proper tag handling."""
        try:
            return {
                "id": str(walk.id),
                "walk_id": walk.walk_id,
                "walk_name": walk.walk_name,
                "highlights": walk.highlights.replace('"', '\\"') if walk.highlights else None,
                "distance": float(walk.distance) if walk.distance else None,
                "steepness_level": walk.steepness_level.replace("'", "\\'") if walk.steepness_level else None,
                "latitude": float(walk.latitude),
                "longitude": float(walk.longitude),
                "features": [
                    {"name": tag.name, "slug": tag.slug}
                    for tag in walk.features.all()
                ],
                "categories": [
                    {"name": tag.name, "slug": tag.slug}
                    for tag in walk.categories.all()
                ],
                "related_categories": [
                    {"name": tag.name, "slug": tag.slug}
                    for tag in walk.related_categories.all()
                ],
                "has_pub": bool(walk.has_pub),
                "has_cafe": bool(walk.has_cafe),
                "has_bus_access": bool(walk.has_bus_access),
                "has_stiles": bool(walk.has_stiles),
                "created_at": walk.created_at.isoformat() if walk.created_at else None,
            }
        except Exception as e:
            logger.exception(f"Walk serialization error for walk ID {walk.id}: {str(e)}")
            return {}

    def get_initial_walks(self) -> list[dict[str, Any]]:
        """Get all walks for page load."""
        try:
            queryset = self.get_queryset()
            return [self.serialize_walk(walk) for walk in queryset]
        except Exception:
            logger.exception("Error retrieving initial walks")
            return []

    def get_context_data(self, **kwargs) -> dict[str, Any]:
        """Prepare context data with clean Python structures for JSON serialization."""
        context = super().get_context_data(**kwargs)

        try:
            config = WalkQuestConfig.get_config()
            context["api_config"] = json.dumps(config)
            context["initial_walks"] = [
                self.serialize_walk(walk)
                for walk in self.get_queryset()
            ]

            # Handle tag counts with proper Tagulous integration
            tags_with_counts = []
            
            # Process category tags
            category_tags = (
                WalkCategoryTag.objects
                .annotate(
                    usage_count=Count('categorized_walks', distinct=True) +
                               Count('related_walks', distinct=True)
                )
                .filter(usage_count__gt=0)
                .values('name', 'slug', 'usage_count')
            )
            
            # Process feature tags
            feature_tags = (
                WalkFeatureTag.objects
                .annotate(usage_count=Count('walks', distinct=True))
                .filter(usage_count__gt=0)
                .values('name', 'slug', 'usage_count')
            )

            # Combine tags with proper type identification
            tags_with_counts.extend([
                {
                    "name": tag["name"],
                    "slug": tag["slug"],
                    "usage_count": tag["usage_count"],
                    "type": "category"
                }
                for tag in category_tags
            ])
            
            tags_with_counts.extend([
                {
                    "name": tag["name"],
                    "slug": tag["slug"],
                    "usage_count": tag["usage_count"],
                    "type": "feature"
                }
                for tag in feature_tags
            ])

            context["tags_data"] = tags_with_counts

        except Exception as e:
            logger.exception(f"Error preparing context data: {str(e)}")
            context.update({
                "config": {},
                "initial_walks": [],
                "tags_data": [],
            })

        return context

    @method_decorator(cache_page(cache_timeout))
    def get(self, request, *args, **kwargs) -> HttpResponse:
        """Handle GET requests with rate limiting and caching."""
        try:
            if request.headers.get("HX-Request"):
                return self._handle_htmx_request(request)
            return super().get(request, *args, **kwargs)
        except Exception:
            logger.exception("Error handling GET request")
            return JsonResponse({"error": "Internal Server Error"}, status=500)

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
            if request_count > WalkQuestConfig.REQUEST_LIMIT:
                return False
            cache.set(rate_key, request_count + 1, 60)
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
                [:20],  # Limit results
            )

        walks = [self.serialize_walk(walk) for walk in queryset]

        if request.headers.get("HX-Request"):
            return JsonResponse({"walks": walks})

        return JsonResponse({"error": "Invalid request"}, status=400)

    def serialize_walk(self, walk):
        return HomePageView().serialize_walk(walk)


@method_decorator(csrf_protect, name="dispatch")
class WalkFilterView(ListView):
    """HTMX view for filtering walks."""
    model = Walk
    template_name = "partials/walk_list.html"
    context_object_name = "walks"

    def post(self, request, *args, **kwargs):
        # Changed from "feature" to "tag"
        categories = request.POST.getlist("tag")

        queryset = self.model.objects.all()

        if (categories):
            # Filter walks that have ALL selected categories
            for category in categories:
                queryset = queryset.filter(related_categories=category)

        walks = [self.serialize_walk(walk) for walk in queryset[:20]]
        return JsonResponse(walks, safe=False)

    def serialize_walk(self, walk):
        return HomePageView().serialize_walk(walk)


@method_decorator(csrf_protect, name="dispatch")
class WalkListView(ListView):
    """HTMX view for walk list."""
    model = Walk
    template_name = "partials/walk_list.html"
    context_object_name = "walks"
    paginate_by = 10

    def get_queryset(self):
        """Get optimized queryset."""
        return (
            super()
            .get_queryset()
            .select_related("adventure")
            .prefetch_related("related_categories")
        )

    def get(self, request, *args, **kwargs):
        """Handle GET requests with pagination and error handling."""
        try:
            page = request.GET.get('page', 1)
            queryset = self.get_queryset()
            paginator = Paginator(queryset, self.paginate_by)
            walks = paginator.get_page(page)

            response_data = {
                "walks": [self.serialize_walk(walk) for walk in walks],
                "has_next": walks.has_next(),
                "next_page": walks.next_page_number() if walks.has_next() else None,
                "total_pages": paginator.num_pages
            }

            if request.headers.get("HX-Request"):
                return JsonResponse(response_data)

            return self.render_to_response({"walks": response_data})
        except Exception:
            logger.exception("Error in walk list view")
            return JsonResponse({"error": "Unable to load walks"},
                              status=500)

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
        except Exception:
            logger.exception(
                "Walk serialization error for walk ID %s", walk.id)
            return {}


def walk_features_autocomplete(request):
    """Autocomplete view for walk features."""
    return autocomplete(
        request,
        WalkFeatureTag,
        settings.TAGULOUS_AUTOCOMPLETE_LIMIT,
    )


class WalkGeometryView(View):
    """API endpoint for fetching walk geometry data."""

    CONTENT_TYPE = "application/geo+json"
    CACHE_TIMEOUT = 60 * 30  # 30 minutes

    @method_decorator(csrf_protect)
    def get(self, request, walk_id):
        """Handle GET request for walk geometry."""
        cache_key = f"walk_geometry_{walk_id}"

        try:
            # Try to get cached geometry
            geometry_data = cache.get(cache_key)

            if not geometry_data:
                walk = Walk.objects.get(id=walk_id)

                if not walk.geometry:
                    return HttpResponse(
                        '{"error": "No geometry data available"}',
                        content_type=self.CONTENT_TYPE,
                        status=404,
                    )

                geometry_data = {
                    "type": "Feature",
                    "geometry": walk.geometry,
                    "properties": {
                        "walk_id": str(walk.id),
                        "walk_name": walk.walk_name,
                    },
                }

                cache.set(cache_key, geometry_data, self.CACHE_TIMEOUT)

            return HttpResponse(
                json.dumps(geometry_data),
                content_type=self.CONTENT_TYPE,
            )

        except Walk.DoesNotExist:
            return HttpResponse(
                '{"error": "Walk not found"}',
                content_type=self.CONTENT_TYPE,
                status=404,
            )
        except Exception:
            logger.exception("Error fetching geometry for walk %s", walk_id)
            return HttpResponse(
                '{"error": "Internal server error"}',
                content_type=self.CONTENT_TYPE,
                status=500,
            )

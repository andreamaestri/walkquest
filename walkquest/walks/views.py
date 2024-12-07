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
from typing import Dict, Any, Optional, List

from django.conf import settings
from django.core.cache import cache
from django.core.serializers.json import DjangoJSONEncoder
from django.db.models import Q, QuerySet
from django.http import HttpResponse, JsonResponse
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.generic import ListView

from walkquest.walks.models import Walk

logger = logging.getLogger(__name__)

class HomePageView(ListView):
    """Main view for displaying walking routes with filtering and mapping capabilities."""

    # Basic Configuration
    model = Walk
    template_name = 'pages/home.html'
    context_object_name = 'walks'
    paginate_by = 20
    cache_timeout = 60 * 15  # 15 minutes

    # Filter Parameters Configuration
    FILTER_PARAMS = {
            'features': 'features',
            'steepness_level': 'steepness',
            'footwear_category': 'footwear',
            'has_pub': 'pub',           # Essential for any proper Cornish walk!
            'has_cafe': 'cafe',         # For a nice cuppa afterwards
            'has_bus_access': 'bus',    # In case you've had too many at the pub
            'has_stiles': 'stiles',     # Bit of a challenge after the pub
            'search': 'search',
            'sort': 'sort',
        }

    def get_cache_key(self) -> str:
        """Generate unique cache key based on query parameters."""
        query_params = sorted(self.request.GET.items())
        return f'home_walks_{hash(frozenset(query_params))}'

    def get_filters(self) -> Dict[str, Any]:
        """Extract and process filter parameters from request."""
        return {
            key: self.request.GET.getlist(param) if key == 'features' 
                else self.request.GET.get(param)
            for key, param in self.FILTER_PARAMS.items()
        }

    def apply_filters(self, queryset: QuerySet) -> QuerySet:
        """Apply filters to queryset based on request parameters."""
        try:
            filters = self.get_filters()

            # Apply feature filters
            if features := filters.get('features'):
                for feature in features:
                    queryset = queryset.filter(features__contains=[feature])

            # Apply basic filters
            for field in ['steepness_level', 'footwear_category']:
                if value := filters.get(field):
                    queryset = queryset.filter(**{field: value})

            # Apply amenity filters
            for key in ['has_pub', 'has_cafe', 'has_bus_access', 'has_stiles']:
                if value := filters.get(key):
                    queryset = queryset.filter(**{key: value.lower() == 'true'})

            # Apply search filter
            if search_query := filters.get('search', '').strip():
                queryset = queryset.filter(
                    Q(walk_name__icontains=search_query) |
                    Q(highlights__icontains=search_query) |
                    Q(points_of_interest__icontains=search_query)
                )

            # Apply sorting
            if sort_by := filters.get('sort'):
                queryset = queryset.order_by(sort_by)

            return queryset

        except Exception as e:
            logger.error(f"Filter application error: {e}")
            return queryset

    def get_queryset(self) -> QuerySet:
        """Get optimized and filtered queryset."""
        return self.apply_filters(
            super().get_queryset()
            .select_related('adventure')
            .prefetch_related('related_categories')
        )

    def serialize_walk(self, walk: Walk) -> Dict[str, Any]:
        """Serialize walk instance to dictionary."""
        try:
            return {
                # Basic Information
                'id': str(walk.id),
                'walk_id': walk.walk_id,
                'walk_name': walk.walk_name,
                
                # Walk Details
                'highlights': walk.highlights,
                'points_of_interest': walk.points_of_interest,
                'distance': walk.distance,
                'steepness_level': walk.steepness_level,
                'footwear_category': walk.footwear_category,
                
                # Location
                'latitude': walk.latitude,
                'longitude': walk.longitude,
                
                # Features and Amenities
                'features': walk.features or [],
                'has_pub': walk.has_pub,
                'has_cafe': walk.has_cafe,
                'has_bus_access': walk.has_bus_access,
                'has_stiles': walk.has_stiles,
                'pubs_list': walk.pubs_list or [],
                
                # Trail Information
                'trail_considerations': walk.trail_considerations,
                'rewritten_trail_considerations': walk.rewritten_trail_considerations,
                
                # Metadata
                'created_at': walk.created_at,
                'adventure': self._serialize_adventure(walk.adventure),
                'categories': [str(cat) for cat in walk.related_categories.all()],
            }
        except Exception as e:
            logger.error(f"Walk serialization error for {walk.id}: {e}")
            return {}

    def _serialize_adventure(self, adventure) -> Optional[Dict[str, Any]]:
        """Helper method to serialize adventure data."""
        if not adventure:
            return None
        return {
            'id': str(adventure.id),
            'title': adventure.title,
            'difficulty_level': adventure.difficulty_level,
        }

    def get_response_data(self, walks_page) -> Dict[str, Any]:
        """Prepare paginated response data."""
        return {
            'status': 'success',
            'data': [self.serialize_walk(walk) for walk in walks_page],
            'pagination': {
                'count': walks_page.paginator.count,
                'num_pages': walks_page.paginator.num_pages,
                'current_page': walks_page.number,
                'has_next': walks_page.has_next(),
                'has_previous': walks_page.has_previous(),
            }
        }

    @method_decorator(cache_page(cache_timeout))
    def get(self, request, *args, **kwargs) -> HttpResponse:
        """Handle GET requests with rate limiting and caching."""
        try:
            if request.headers.get('HX-Request'):
                return self._handle_htmx_request(request)
            return super().get(request, *args, **kwargs)
        except Exception as e:
            return self.handle_error(e)

    def _handle_htmx_request(self, request) -> JsonResponse:
        """Handle HTMX requests with rate limiting."""
        if not self._check_rate_limit(request):
            return JsonResponse(
                {'status': 'error', 'message': 'Rate limit exceeded'}, 
                status=429
            )
        
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset, self.paginate_by)
        return JsonResponse(
            self.get_response_data(page),
            encoder=DjangoJSONEncoder,
            safe=False
        )

    def _check_rate_limit(self, request) -> bool:
        """Check if request is within rate limits."""
        client_ip = request.META.get('REMOTE_ADDR')
        rate_key = f'rate_limit_{client_ip}'
        request_count = cache.get(rate_key, 0)
        
        if request_count > 100:
            return False
            
        cache.set(rate_key, request_count + 1, 60)
        return True

    def get_context_data(self, **kwargs) -> Dict[str, Any]:
        """Prepare template context data."""
        context = super().get_context_data(**kwargs)
        context.update({
            'footwear_choices': dict(Walk.FOOTWEAR_CHOICES),
            'difficulty_choices': dict(Walk.DIFFICULTY_CHOICES),
            'walk_categories': dict(Walk.WALK_CATEGORIES),
            'search_term': self.request.GET.get('search', ''),
            'current_filters': self.get_filters(),
            'mapbox_token': getattr(settings, 'MAPBOX_TOKEN', ''),
            'initial_walks': self.serialize_initial_walks(),
        })
        return context

    def serialize_initial_walks(self) -> List[Dict[str, Any]]:
        """Serialize initial set of walks for page load."""
        return [self.serialize_walk(walk) 
                for walk in self.get_queryset()[:self.paginate_by]]
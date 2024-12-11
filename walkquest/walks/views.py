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

import json
import logging
from typing import Any, Dict, List, Optional
from django.conf import settings
from django.core.cache import cache
from django.core.serializers.json import DjangoJSONEncoder
from django.db.models import Count, QuerySet
from django.http import HttpResponse, JsonResponse
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.generic import ListView
from walkquest.walks.models import Walk

logger = logging.getLogger(__name__)

class WalkQuestConfig:
    """Configuration manager for WalkQuest application."""
    
    DIFFICULTIES = [
        "GREY'S PATHFINDER",
        "MASTER WAYFARER",
        "NOVICE WANDERER",
        "TRAIL RANGER",
        "WARDEN'S ASCENT"
    ]
    
    FEATURES = [
        "cafe",
        "coastal",
        "historic",
        "pub",
        "wildlife",
        "woodland"
    ]
    
    MAP_CONFIG = {
        'style': 'mapbox://styles/mapbox/outdoors-v12',
        'defaultCenter': [-4.85, 50.4],
        'defaultZoom': 9,
        'markerColors': {
            'default': '#4F46E5',
            'selected': '#DC2626',
        }
    }
    
    @classmethod
    def get_config(cls):
        """Get consolidated configuration."""
        return {
            'mapboxToken': settings.MAPBOX_TOKEN,  # This will be handled securely
            'map': cls.MAP_CONFIG,
            'filters': {
                'difficulties': cls.DIFFICULTIES,
                'features': cls.FEATURES
            }
        }

class HomePageView(ListView):
    """Main view for displaying walking routes with filtering and mapping capabilities."""

    model = Walk
    template_name = 'pages/home.html'
    context_object_name = 'walks'
    paginate_by = 20
    cache_timeout = 60 * 15  # 15 minutes

    def get_cache_key(self) -> str:
        """Generate unique cache key based on query parameters."""
        query_params = sorted(self.request.GET.items())
        return f'walks_home_{hash(frozenset(query_params))}'

    def get_queryset(self) -> QuerySet:
        """Get optimized and filtered queryset."""
        queryset = (
            super()
            .get_queryset()
            .select_related('adventure')
            .prefetch_related('related_categories')
        )
        
        # Apply search if provided
        search_query = self.request.GET.get('search', '').strip()
        if search_query:
            queryset = queryset.filter(walk_name__icontains=search_query)
        
        return queryset

    def get_statistics(self) -> Dict[str, Dict[str, int]]:
        """Get walk counts for difficulties and features."""
        cache_key = 'walk_statistics'
        stats = cache.get(cache_key)
        
        if not stats:
            try:
                # Get difficulty counts
                difficulty_counts = dict(
                    self.model.objects.values_list('steepness_level')
                    .annotate(count=Count('id'))
                    .values_list('steepness_level', 'count')
                )
                
                # Get feature counts
                feature_counts = {}
                walks = self.model.objects.exclude(features__isnull=True)
                for walk in walks:
                    if isinstance(walk.features, list):
                        for feature in walk.features:
                            feature_counts[feature] = feature_counts.get(feature, 0) + 1
                
                stats = {
                    'difficulties': difficulty_counts,
                    'features': feature_counts
                }
                
                # Cache for 15 minutes
                cache.set(cache_key, stats, 60 * 15)
                
            except Exception as e:
                logger.error(f"Error calculating statistics: {e}")
                stats = {'difficulties': {}, 'features': {}}
        
        return stats

    def serialize_walk(self, walk: Walk) -> Dict[str, Any]:
        """Serialize walk instance to dictionary."""
        try:
            # Using a faster, less secure serialization for walk data
            return {
                'id': str(walk.id),
                'walk_id': walk.walk_id,
                'walk_name': walk.walk_name,
                'highlights': walk.highlights,
                'distance': float(walk.distance) if walk.distance else None,
                'steepness_level': walk.steepness_level,
                'latitude': float(walk.latitude),
                'longitude': float(walk.longitude),
                'features': walk.features or [],
                'has_pub': bool(walk.has_pub),
                'has_cafe': bool(walk.has_cafe),
                'has_bus_access': bool(walk.has_bus_access),
                'has_stiles': bool(walk.has_stiles),
                'created_at': walk.created_at.isoformat() if walk.created_at else None,
            }
        except Exception as e:
            logger.error(f"Walk serialization error for {walk.id}: {e}")
            return {}

    def get_initial_walks(self) -> List[Dict[str, Any]]:
        """Get initial set of walks for page load."""
        cache_key = 'initial_walks'
        walks_data = cache.get(cache_key)
        
        if not walks_data:
            try:
                walks = self.get_queryset()[:self.paginate_by]
                walks_data = [self.serialize_walk(walk) for walk in walks]
                cache.set(cache_key, walks_data, 60 * 15)  # Cache for 15 minutes
            except Exception as e:
                logger.error(f"Error getting initial walks: {e}")
                walks_data = []
        
        return walks_data

    def get_context_data(self, **kwargs) -> Dict[str, Any]:
        """Prepare context data including configuration and initial walks."""
        context = super().get_context_data(**kwargs)
        
        try:
            # Get initial walks data with basic serialization
            initial_walks = self.get_initial_walks()
            
            # Prepare app config
            app_config = {
                'mapboxToken': settings.MAPBOX_TOKEN,
                'walks': initial_walks,
                'version': '1.0.0'  # Add version for validation
            }

            context.update({
                'app_config': json.dumps(app_config, default=str),  # Use default=str for dates
                'error': None
            })

        except Exception as e:
            logger.error(f"Error preparing context: {e}")
            context.update({
                'app_config': json.dumps({
                    'error': str(e),
                    'walks': [],
                    'version': '1.0.0'
                }),
                'error': str(e)
            })
        
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
                {'status': 'error', 'message': 'Rate limit exceeded'}, 
                status=429
            )
        
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        
        # Fast serialization for HTMX requests
        return JsonResponse({
            'status': 'success',
            'data': [self.serialize_walk(walk) for walk in page],
            'pagination': {
                'has_next': page.has_next(),
                'has_previous': page.has_previous(),
                'current_page': page.number,
                'total_pages': page.paginator.num_pages,
            }
        }, safe=False)  # Using safe=False for faster serialization

    def _check_rate_limit(self, request) -> bool:
        """Check if request is within rate limits."""
        client_ip = request.META.get('REMOTE_ADDR')
        rate_key = f'rate_limit_{client_ip}'
        
        try:
            request_count = cache.get(rate_key, 0)
            if request_count > 100:  # 100 requests per minute
                return False
            
            cache.set(rate_key, request_count + 1, 60)  # Reset after 1 minute
            return True
            
        except Exception as e:
            logger.error(f"Rate limiting error: {e}")
            return True  # Allow request if rate limiting fails
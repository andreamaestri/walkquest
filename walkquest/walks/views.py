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
from typing import Dict
from typing import List
from typing import Optional

from django.conf import settings
from django.core.cache import cache
from django.core.serializers.json import DjangoJSONEncoder
from django.db.models import Count
from django.db.models import QuerySet
from django.http import HttpResponse
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.generic import ListView

from walkquest.walks.models import Walk

logger = logging.getLogger(__name__)

class HomePageView(ListView):
    """Main view for displaying walking routes with filtering and mapping capabilities."""

    model = Walk
    template_name = 'pages/home.html'
    context_object_name = 'walks'
    paginate_by = 20
    cache_timeout = 60 * 15  # 15 minutes

    def get_queryset(self) -> QuerySet:
        """Get optimized and filtered queryset."""
        return (
            super()
            .get_queryset()
            .select_related('adventure')
            .prefetch_related('related_categories')
        )

    def get_difficulty_counts(self) -> Dict[str, int]:
        """Get walk counts by difficulty level"""
        try:
            counts = dict(
                self.model.objects.values_list('steepness_level')
                .annotate(count=Count('id'))
                .values_list('steepness_level', 'count')
            )
            return counts
        except Exception as e:
            logger.error(f"Error getting difficulty counts: {e}")
            return {}

    def get_feature_counts(self) -> Dict[str, int]:
        """Get walk counts by feature"""
        try:
            feature_counts = {}
            walks = self.model.objects.exclude(features__isnull=True)
            
            for walk in walks:
                if isinstance(walk.features, list):
                    for feature in walk.features:
                        feature_counts[feature] = feature_counts.get(feature, 0) + 1
            
            return feature_counts
        except Exception as e:
            logger.error(f"Error getting feature counts: {e}")
            return {}

    def get_statistics(self) -> Dict[str, Dict[str, int]]:
        """Get walk counts for difficulties and features"""
        return {
            'difficulties': self.get_difficulty_counts(),
            'features': self.get_feature_counts()
        }

    def get_initial_walks(self) -> List[Dict[str, Any]]:
        """Get initial set of walks for page load."""
        try:
            walks = self.model.objects.all()[:self.paginate_by]
            return [self.serialize_walk(walk) for walk in walks]
        except Exception as e:
            logger.error(f"Error getting initial walks: {e}")
            return []

    def get_context_data(self, **kwargs) -> Dict[str, Any]:
        """Prepare context data including configuration and initial walks"""
        context = super().get_context_data(**kwargs)
        
        try:
            # Get statistics
            statistics = self.get_statistics()
            
            # Get configuration
            config = {
                'mapbox_token': settings.MAPBOX_TOKEN,
                'default_center': [-4.85, 50.4],
                'default_zoom': 9,
                'statistics': statistics,
                'filters': {
                    'difficulties': [
                        "GREY'S PATHFINDER",
                        "MASTER WAYFARER",
                        "NOVICE WANDERER",
                        "TRAIL RANGER",
                        "WARDEN'S ASCENT"
                    ],
                    'features': [
                        "cafe",
                        "coastal",
                        "historic",
                        "pub",
                        "wildlife",
                        "woodland"
                    ]
                }
            }
            
            # Get initial walks
            initial_walks = self.get_initial_walks()
            
            # Update context
            context.update({
                'config': config,
                'initial_walks': initial_walks,
                'difficulties': config['filters']['difficulties'],
                'features': config['filters']['features'],
            })

            # Add debug information in development
            if settings.DEBUG:
                context['debug'] = {
                    'statistics': statistics,
                    'walk_count': len(initial_walks),
                }

        except Exception as e:
            logger.error(f"Error preparing context data: {e}")
            context.update({
                'config': {
                    'mapbox_token': settings.MAPBOX_TOKEN,
                    'default_center': [-4.85, 50.4],
                    'default_zoom': 9,
                    'statistics': {},
                    'filters': {
                        'difficulties': [],
                        'features': []
                    }
                },
                'initial_walks': [],
                'difficulties': [],
                'features': [],
                'error': str(e)
            })
        
        return context

    def serialize_walk(self, walk: Walk) -> Dict[str, Any]:
        """Serialize walk instance to dictionary."""
        try:
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

    def get(self, request, *args, **kwargs) -> HttpResponse:
        """Handle GET requests with proper error handling"""
        try:
            if request.headers.get("HX-Request"):
                return self._handle_htmx_request(request)
            
            response = super().get(request, *args, **kwargs)
            logger.info(f"Successfully initialized HomePageView for {request.path}")
            return response
            
        except Exception as e:
            logger.exception("Error processing request")
            context = self.get_context_data(error=str(e))
            return self.render_to_response(context)
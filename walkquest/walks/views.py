import json
import logging
from dataclasses import dataclass

from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from django.templatetags.static import static
from django.utils.encoding import force_str
from django.utils.functional import Promise
from django.views.generic import ListView
from django.shortcuts import render

from .models import Walk

# Configure logging
logger = logging.getLogger(__name__)

@dataclass
class FeatureIcon:
    icon: str
    marker: str


class WalkFeatures:
    """Constants and mappings for walk features."""
    FEATURE_ICONS = {
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


class CustomJSONEncoder(DjangoJSONEncoder):
    """Custom JSON encoder for handling Django-specific types"""
    def default(self, obj):
        if isinstance(obj, Promise):
            return force_str(obj)
        return super().default(obj)


class BaseWalkListView(ListView):
    """Base view class with common functionality for walk lists"""
    model = Walk
    context_object_name = "walks"

    def serialize_walk(self, walk):
        """Serialize a single walk instance"""
        try:
            return {
                'id': str(walk.id),
                'walk_name': walk.walk_name,
                'description': walk.description,
                'latitude': float(walk.latitude) if walk.latitude else None,
                'longitude': float(walk.longitude) if walk.longitude else None,
                'distance': float(walk.distance) if walk.distance else None,
                'features': walk.features,
                'created_at': walk.created_at,
                'updated_at': walk.updated_at,
            }
        except Exception as e:
            logger.error(f"Error serializing walk {walk.id}: {str(e)}")
            return None

    def get_serialized_walks(self, walks):
        """Serialize all walks with error handling"""
        serialized_walks = []
        for walk in walks:
            walk_data = self.serialize_walk(walk)
            if walk_data:
                serialized_walks.append(walk_data)
        return serialized_walks


class HomePageView(BaseWalkListView):
    """Home page view with basic walk list"""
    template_name = "pages/home.html"

    def get_context_data(self, **kwargs):
        try:
            context = super().get_context_data(**kwargs)
            feature_icons = WalkFeatures.get_icon_mappings()
            
            # Serialize walks data
            walks_data = self.get_serialized_walks(context['walks'])
            
            context.update({
                'walks_json': json.dumps(walks_data, cls=CustomJSONEncoder),
                'mapbox_token': settings.MAPBOX_TOKEN,
                'feature_icons_json': json.dumps(feature_icons, cls=CustomJSONEncoder),
            })

            # Debug logging
            logger.debug(f"Number of walks: {len(walks_data)}")
            logger.debug(f"Feature Icons: {feature_icons}")
            
            return context
            
        except Exception as e:
            logger.error(f"Error in HomePageView.get_context_data: {str(e)}")
            # Return basic context to avoid template errors
            return {
                'walks': [],
                'walks_json': '[]',
                'mapbox_token': settings.MAPBOX_TOKEN,
                'feature_icons_json': '{}'
            }


class WalkListView(BaseWalkListView):
    """Detailed walk list view"""
    template_name = "walks/walk_list.html"

    def get_context_data(self, **kwargs):
        try:
            context = super().get_context_data(**kwargs)
            
            # Serialize walks data
            walks_data = self.get_serialized_walks(context['walks'])
            feature_icons = WalkFeatures.get_icon_mappings()
            
            context.update({
                'walks_json': json.dumps(walks_data, cls=CustomJSONEncoder),
                'mapbox_token': settings.MAPBOX_TOKEN,
                'feature_icons_json': json.dumps(feature_icons, cls=CustomJSONEncoder),
            })
            
            return context
            
        except Exception as e:
            logger.error(f"Error in WalkListView.get_context_data: {str(e)}")
            return {
                'walks': [],
                'walks_json': '[]',
                'mapbox_token': settings.MAPBOX_TOKEN,
                'feature_icons_json': '{}'
            }

def home_view(request):
    # ...existing code...

    context['feature_icons'] = {
        feature: {'icon': icon.icon, 'marker': icon.marker}
        for feature, icon in WalkFeatures.FEATURE_ICONS.items()
    }
    
    # ...rest of existing code...
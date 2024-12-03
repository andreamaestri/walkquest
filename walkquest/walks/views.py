import json
from django.views.generic import ListView
from django.conf import settings
from .models import Walk

class HomePageView(ListView):
    model = Walk
    template_name = "pages/home.html"
    context_object_name = "walks"
    
    def get_queryset(self):
        return Walk.objects.exclude(latitude=None, longitude=None)
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['mapbox_token'] = settings.MAPBOX_TOKEN
        if not context['mapbox_token']:
            from django.core.exceptions import ImproperlyConfigured
            raise ImproperlyConfigured(
                "Mapbox token not found. Please set MAPBOX_TOKEN in your environment."
            )
        return context
from django.views.generic import ListView
from django.conf import settings
from .models import Walk

# Create your views here.
class HomePageView(ListView):
    model = Walk
    template_name = "pages/home.html"
    context_object_name = "walks"
    
    def get_queryset(self):
        return Walk.objects.exclude(latitude=None, longitude=None)
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['map_tile_url'] = settings.MAP_TILE_URL
        context['map_attribution'] = settings.MAP_ATTRIBUTION
        return context
from django.urls import path, include
from . import api
from .views import WalkGeometryView

app_name = 'walks'

urlpatterns = [
    # Handle /api/walks/<uuid>/geometry/ (legacy view)
    path('walks/<uuid:id>/geometry/', WalkGeometryView.as_view(), name='walk-geometry'),
    
    # Django Ninja API URLs
    path('', api.api_instance.urls),
]

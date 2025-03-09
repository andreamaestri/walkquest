from django.urls import path
from . import views

# No need to export the router since it's already attached to the main API
# in the walks/api.py file
app_name = 'walks'

urlpatterns = [
    path('api/walks/<uuid:walk_id>/favorite/', views.toggle_favorite, name='toggle_favorite'),
]

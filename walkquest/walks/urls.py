from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import api
from .views import WalkGeometryView

router = DefaultRouter()
router.register('walks', api.WalkViewSet, basename='walk')
router.register('adventures', api.AdventureViewSet, basename='adventure')
router.register('companions', api.CompanionViewSet, basename='companion')
router.register('categories', api.WalkCategoryTagViewSet, basename='category')
router.register('features', api.WalkFeatureTagViewSet, basename='feature')

app_name = 'walks'

urlpatterns = [
    # Handle /api/walks/<uuid>/geometry/
    path('walks/<uuid:id>/geometry/', WalkGeometryView.as_view(), name='walk-geometry'),
    # Include router URLs after the specific URL patterns
    path('', include(router.urls)),
]

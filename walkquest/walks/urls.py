from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import api

router = DefaultRouter()
router.register(r'walks', api.WalkViewSet, basename='walk')
router.register(r'adventures', api.AdventureViewSet, basename='adventure')
router.register(r'companions', api.CompanionViewSet, basename='companion')
router.register(r'categories', api.WalkCategoryTagViewSet, basename='category')
router.register(r'features', api.WalkFeatureTagViewSet, basename='feature')

app_name = 'walks'

urlpatterns = [
    path('api/', include(router.urls)),
]

from django.urls import path

from .views import (
    HomePageView,
    WalkListView,
    WalkSearchView,
    WalkFilterView,
    WalkGeometryView,
    walk_features_autocomplete
)

app_name = "walks"

urlpatterns = [
    path("", HomePageView.as_view(), name="home"),
    path("api/list/", WalkListView.as_view(), name="list"),
    path("api/search/", WalkSearchView.as_view(), name="search"),
    path("api/filter/", WalkFilterView.as_view(), name="filter"),
    path("api/geometry/<str:walk_id>/", WalkGeometryView.as_view(), name="geometry"),
    path("api/features/autocomplete/", walk_features_autocomplete, name="features-autocomplete"),
]
from django.urls import path

from .views import (
    HomePageView,
    WalkListView,
    WalkSearchView,
    WalkFilterView,
    WalkGeometryView,
    WalkDetailView,
)

app_name = "walks"

urlpatterns = [
    path("", HomePageView.as_view(), name="home"),
    path("", WalkListView.as_view(), name="list"),
    path("search/", WalkSearchView.as_view(), name="search"),
    path("<uuid:id>/", WalkDetailView.as_view(), name="detail"),
    path("<uuid:id>/geometry/", WalkGeometryView.as_view(), name="geometry"),
    path("filters/", WalkFilterView.as_view(), name="filter"),
    # Add slug-based route
    path("<slug:slug>/", WalkDetailView.as_view(), name="detail-by-slug"),
    path("<slug:slug>/geometry/", WalkGeometryView.as_view(), name="geometry-by-slug"),
]
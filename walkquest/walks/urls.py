from django.urls import path

from .views import HomePageView
from .views import WalkSearchView

urlpatterns = [
    path("", HomePageView.as_view(), name="home"),
    path("search/", WalkSearchView.as_view(), name="search"),
]

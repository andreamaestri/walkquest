from django.urls import path

from .views import WalkFilterView
from .views import WalkListView
from .views import WalkSearchView

app_name = "walks"

urlpatterns = [
    path("search/", WalkSearchView.as_view(), name="search"),
    path("filter/", WalkFilterView.as_view(), name="filter"),
    path("list/", WalkListView.as_view(), name="list"),
]

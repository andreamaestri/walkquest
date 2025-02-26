from django.conf import settings
from django.urls import include, path
from django.views.generic import TemplateView
from django.conf.urls.static import static
from django.shortcuts import redirect
from . import views

app_name = "walkquest"

urlpatterns = [
    # API routes
    path("api/", include("walkquest.api.urls")),
    path("api/walks/", include("walkquest.walks.urls", namespace="walks")),
    path("api/users/", include("walkquest.users.urls", namespace="users")),

    # Frontend routes - prefer slug routes
    path("<slug:walk_id>/", views.index, name="walk-detail-by-slug"),  # Primary route using slug
    path("walk/<uuid:id>/", views.legacy_walk_view, name="walk-detail-legacy"),  # Legacy UUID route with redirect
    
    # Default route - handled by Vue router
    path("", views.index, name="home"),
    
    # Catch-all route for client-side routing
    path("<path:path>", views.index, name="catch-all"),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.DEBUG:
    from django.views import defaults as default_views
    
    urlpatterns += [
        path(
            "400/",
            default_views.bad_request,
            kwargs={"exception": Exception("Bad Request!")},
        ),
        path(
            "403/",
            default_views.permission_denied,
            kwargs={"exception": Exception("Permission Denied")},
        ),
        path(
            "404/",
            default_views.page_not_found,
            kwargs={"exception": Exception("Page not Found")},
        ),
        path("500/", default_views.server_error),
    ]

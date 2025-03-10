# ruff: noqa
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from django.views import defaults as default_views
from django.views.generic import TemplateView
from walkquest.walks.views import HomePageView 
from walkquest.views import index, legacy_walk_view

urlpatterns = [
    # Django Admin
    path(settings.ADMIN_URL, admin.site.urls),
    
    # Authentication URLs (keep at top to take precedence)
    path("accounts/", include("allauth.urls")),
    path("_allauth/", include("allauth.headless.urls")),
    
    # User management
    path("users/", include("walkquest.users.urls", namespace="users")),
    
    # Application URLs
    path("", include("walkquest.urls")),
    
    # Specific walk routes
    path("walk/<slug:walk_id>/", index, name="walk-detail"),
    path("<slug:walk_id>/", index, name="walk-detail-by-slug"),
    path("walk/<uuid:id>/", legacy_walk_view, name="walk-detail-legacy"),
    
    # Media and static files
    *static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT),
    path("__reload__/", include("django_browser_reload.urls")),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

if settings.DEBUG:
    # Static file serving when using Vite
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

    # This allows the error pages to be debugged during development
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
    if "debug_toolbar" in settings.INSTALLED_APPS:
        import debug_toolbar
        urlpatterns = [path("__debug__/", include(debug_toolbar.urls))] + urlpatterns

# Add catch-all routes last
urlpatterns += [
    path("<path:path>", index, name="vue-paths"),
    path("", HomePageView.as_view(), name="home"),  # Keep home page last
]

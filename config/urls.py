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
    path("", HomePageView.as_view(), name="home"),
    path(
        "about/",
        TemplateView.as_view(template_name="pages/about.html"),
        name="about",
    ),
    # Django Admin, use {% url 'admin:index' %}
    path(settings.ADMIN_URL, admin.site.urls),
    
    # User management
    path("users/", include("walkquest.users.urls", namespace="users")),
    
    # Standard Django allauth URLs for authentication
    path("accounts/", include("allauth.urls")),
    path("_allauth/", include("allauth.headless.urls")),  # Headless endpoints
    
    # Include walkquest URLs for all API routes
    path("", include("walkquest.urls")),
    
    # Add a URL pattern for /walk/<slug> format to match Vue router - using walk_id parameter
    path("walk/<slug:walk_id>/", index, name="walk-detail"),
    
    # Direct walk slugs at root URL level
    path("<slug:walk_id>/", index, name="walk-detail-by-slug"),
    
    # Legacy UUID walk pages with redirect
    path("walk/<uuid:id>/", legacy_walk_view, name="walk-detail-legacy"),
    
    # Media files
    *static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT),
    path("__reload__/", include("django_browser_reload.urls")),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

if settings.DEBUG:
    # Static file serving when using Vite
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

    # This allows the error pages to be debugged during development, just visit
    # these url in browser to see how these error pages look like.
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

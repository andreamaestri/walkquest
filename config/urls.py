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
    
    # Django allauth URLs - both traditional and headless API
    # Even when using headless, the third-party provider endpoints are still
    # needed for handling e.g. the OAuth handshake
    path("accounts/", include("allauth.urls")),
    
    # Include the API endpoints for headless allauth
    path("_allauth/", include("allauth.headless.urls")),
    
    # Include walkquest URLs
    path("", include("walkquest.urls")),
    
    # Walk URLs
    path("walk/<slug:walk_id>/", index, name="walk-detail"),
    path("<slug:walk_id>/", index, name="walk-detail-by-slug"),
    path("walk/<uuid:id>/", legacy_walk_view, name="walk-detail-legacy"),
    
    # Media and static files
    *static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT),
    path("__reload__/", include("django_browser_reload.urls")),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

if settings.DEBUG:
    # Debug configurations
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
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

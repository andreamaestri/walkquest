from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include
from django.urls import path
from django.views import defaults as default_views
from django.views.generic import TemplateView
from . import views

urlpatterns = [
    # Django Admin
    path("admin/", admin.site.urls),

    # User management
    path("users/", include("walkquest.users.urls", namespace="users")),
    path("accounts/", include("allauth.urls")),

    # Your apps
    path("", TemplateView.as_view(template_name="pages/home.html"), name="home"),
    path("about/", TemplateView.as_view(template_name="pages/about.html"), name="about"),

    # Walks app URLs (includes both regular views and API)
    path("walks/", include("walkquest.walks.urls", namespace="walks")),
    path('walks/<uuid:id>', views.index, name='walk-detail'),
    path('api/walks/<uuid:id>/geometry', views.walk_geometry, name='walk-geometry'),
    *static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT),
]

if settings.DEBUG:
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

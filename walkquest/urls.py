from django.conf import settings
from django.urls import include, path
from django.views.generic import TemplateView
from django.conf.urls.static import static
from django.shortcuts import redirect
from . import views
from .api import UserAPI, api_instance

app_name = "walkquest"

# The walks router is already added to api_instance in walks/api.py
# so we don't need to add it again here

urlpatterns = [
    # Main API at /api/ - using api_instance.urls instead of including the module
    path("api/", api_instance.urls),
    
    # API routes - user-specific endpoints
    path("api/users/", include("walkquest.users.urls", namespace="users")),
    path('api/user/', UserAPI.as_view(), name='user_api'),
    
    # Walks app URLs
    path("", include("walkquest.walks.urls", namespace="walks")),

    # Authentication URLs - for login, logout, signup
    path("accounts/", include("allauth.urls")),
    
    # Custom email confirmation success route
    path("accounts/email-confirmed/", views.email_confirmed_view, name="account_email_confirmed"),
    
    # Add redirect from /login/ to accounts/login/ for email confirmation flow
    path("login/", lambda request: redirect('/accounts/login/')),
    
    # Primary route using slug
    path("<slug:walk_id>/", views.index, name="walk-detail-by-slug"),
    
    # Legacy UUID route with redirect
    path("walk/<uuid:id>/", views.legacy_walk_view, name="walk-detail-legacy"),
    
    # Default route - handled by Vue router
    path("", views.index, name="home"),

    # Adventures app URLs
    path("adventures/", include("walkquest.adventures.urls")),
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

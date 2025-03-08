from django.urls import path
from .views import (
    user_detail_view,
    user_redirect_view,
    user_update_view,
    auth_events
)
from .api import handle_login, handle_signup

app_name = "users"
urlpatterns = [
    path("~redirect/", view=user_redirect_view, name="redirect"),
    path("~update/", view=user_update_view, name="update"),
    path("<str:username>/", view=user_detail_view, name="detail"),
    path("api/auth-events/", view=auth_events, name="auth_events"),
    path("api/login/", view=handle_login, name="api_login"),
    path("api/signup/", view=handle_signup, name="api_signup"),
]

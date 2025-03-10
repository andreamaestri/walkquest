from django.urls import path

from walkquest.users.views import CustomEmailVerificationSentView
from walkquest.users.views import CustomEmailVerificationView
from walkquest.users.views import auth_events
from walkquest.users.views import user_detail_view
from walkquest.users.views import user_redirect_view
from walkquest.users.views import user_update_view

from .api import handle_login
from .api import handle_signup

app_name = "users"
urlpatterns = [
    path("~redirect/", view=user_redirect_view, name="redirect"),
    path("~update/", view=user_update_view, name="update"),
    path("<str:username>/", view=user_detail_view, name="detail"),
    path("confirmation-email/", CustomEmailVerificationSentView.as_view(), name="account_email_verification_sent"),
    path("confirm-email/<str:key>/", CustomEmailVerificationView.as_view(), name="account_confirm_email"),
    path("api/auth-events/", auth_events, name="auth_events"),
    path("api/login/", view=handle_login, name="api_login"),
    path("api/signup/", view=handle_signup, name="api_signup"),
]

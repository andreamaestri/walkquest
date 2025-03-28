from django.urls import path
from allauth.account.views import email_verification_sent

from walkquest.users.views import (
    user_detail_view,
    user_redirect_view,
    user_update_view,
    CustomEmailVerificationSentView,
    CustomEmailVerificationView,
    auth_events,
    login_page,
    signup_page,
)
from .api import handle_login, handle_signup, handle_logout, test_email

app_name = "users"
urlpatterns = [
    path("~redirect/", view=user_redirect_view, name="redirect"),
    path("~update/", view=user_update_view, name="update"),
    path("<str:username>/", view=user_detail_view, name="detail"),
    path("confirmation-email/", CustomEmailVerificationSentView.as_view(), name="account_email_verification_sent"),
    path("confirm-email/<str:key>/", CustomEmailVerificationView.as_view(), name="account_confirm_email"),
    path("api/auth-events/", auth_events, name="auth_events"),
    path("api/login/", view=handle_login, name="api_login"),
    path("api/logout/", view=handle_logout, name="api_logout"),
    path("api/signup/", view=handle_signup, name="api_signup"),
    path("api/test-email/", test_email, name="test_email"),
    
    # Views for rendering auth pages with CSRF token
    path("login-page/", login_page, name="login_page"),
    path("signup-page/", signup_page, name="signup_page"),
]

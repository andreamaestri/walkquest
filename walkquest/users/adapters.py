from __future__ import annotations
import typing
from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.conf import settings
from django.contrib import messages
from django.urls import reverse
from django.utils.translation import gettext_lazy as _

if typing.TYPE_CHECKING:
    from allauth.socialaccount.models import SocialLogin
    from django.http import HttpRequest
    from walkquest.users.models import User


class AccountAdapter(DefaultAccountAdapter):
    def is_open_for_signup(self, request: HttpRequest) -> bool:
        return getattr(settings, "ACCOUNT_ALLOW_REGISTRATION", True)
        
    def get_login_redirect_url(self, request):
        """Override to redirect users to homepage after login instead of user profile"""
        return '/'  # Redirect to home page
    
    def get_email_confirmation_redirect_url(self, request):
        """Override to redirect to home page after email confirmation"""
        return '/'
    
    def format_username(self, username, email):
        """Format username from email if username is not provided"""
        return email.split('@')[0] if not username else username
    
    def login(self, request, user):
        """Add a welcome message when user logs in"""
        # Call parent login method first
        super().login(request, user)
        
        # Add custom welcome message with md-snackbar tag
        user_display = settings.ACCOUNT_USER_DISPLAY(user)
        message = f"Welcome back, {user_display}!"
        messages.success(request, message, extra_tags='md-snackbar')
        

class SocialAccountAdapter(DefaultSocialAccountAdapter):
    def is_open_for_signup(
        self,
        request: HttpRequest,
        sociallogin: SocialLogin,
    ) -> bool:
        return getattr(settings, "ACCOUNT_ALLOW_REGISTRATION", True)

    def populate_user(
        self,
        request: HttpRequest,
        sociallogin: SocialLogin,
        data: dict[str, typing.Any],
    ) -> User:
        """
        Populates user information from social provider info.

        See: https://docs.allauth.org/en/latest/socialaccount/advanced.html#creating-and-populating-user-instances
        """
        user = super().populate_user(request, sociallogin, data)
        if not user.name:
            if name := data.get("name"):
                user.name = name
            elif first_name := data.get("first_name"):
                user.name = first_name
                if last_name := data.get("last_name"):
                    user.name += f" {last_name}"
        return user

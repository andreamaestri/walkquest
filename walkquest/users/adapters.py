from __future__ import annotations

import typing
from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.conf import settings

if typing.TYPE_CHECKING:
    from django.http import HttpRequest
    from allauth.socialaccount.models import SocialLogin
    from walkquest.users.models import User


class AccountAdapter(DefaultAccountAdapter):
    def is_open_for_signup(self, request: HttpRequest) -> bool:
        return getattr(settings, "ACCOUNT_ALLOW_REGISTRATION", True)
        
    def get_login_redirect_url(self, request):
        """Override to redirect users to homepage after login instead of user profile"""
        return "/"  # Redirect to home page
    
    def get_email_confirmation_redirect_url(self, request):
        """Override to redirect to home page after email confirmation"""
        return "/"
    
    def save_user(self, request, user, form, commit=True):
        """
        Override save_user to set the username field manually instead of using generate_unique_username
        which doesn't work when ACCOUNT_USER_MODEL_USERNAME_FIELD is None
        """
        data = form.cleaned_data
        email = data.get('email')
        
        # Handle username manually instead of using generate_unique_username
        if hasattr(user, 'username') and not user.username and email:
            # Simple way to derive username from email
            base_username = email.split('@')[0]
            
            # Find a unique username
            username = base_username
            counter = 1
            User = type(user)
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1
                
            user.username = username
            
        # Pass through to the default save_user implementation
        user = super().save_user(request, user, form, commit=False)
        
        # Set any additional fields here
        
        if commit:
            user.save()
            
        return user
    
    def login(self, request, user):
        """Just handle the login without adding message since signals handle it"""
        super().login(request, user)


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

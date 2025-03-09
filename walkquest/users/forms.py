from allauth.account.forms import SignupForm, ResetPasswordForm, LoginForm
from allauth.socialaccount.forms import SignupForm as SocialSignupForm
from django.contrib.auth import forms as admin_forms
from django.utils.translation import gettext_lazy as _
from django import forms

from .models import User


class UserAdminChangeForm(admin_forms.UserChangeForm):
    class Meta(admin_forms.UserChangeForm.Meta):  # type: ignore[name-defined]
        model = User


class UserAdminCreationForm(admin_forms.UserCreationForm):
    """
    Form for User Creation in the Admin Area.
    To change user signup, see UserSignupForm and UserSocialSignupForm.
    """

    class Meta(admin_forms.UserCreationForm.Meta):  # type: ignore[name-defined]
        model = User
        error_messages = {
            "username": {"unique": _("This username has already been taken.")},
        }


class UserSignupForm(SignupForm):
    """
    Form that will be rendered on a user sign up section/screen.
    Default fields will be added automatically.
    Check UserSocialSignupForm for accounts created from social.
    """
    name = forms.CharField(
        max_length=255,
        required=False,
        widget=forms.TextInput(
            attrs={
                'placeholder': 'Full Name (optional)',
                'class': 'md3-input'
            }
        )
    )
    
    def save(self, request):
        user = super().save(request)
        user.name = self.cleaned_data.get('name', '')
        user.save()
        return user


class UserLoginForm(LoginForm):
    """
    Custom login form that extends the default allauth LoginForm.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Customize form fields
        for field_name, field in self.fields.items():
            field.widget.attrs.update({'class': 'md3-input'})
    
    def login(self, request, redirect_url=None):
        # Custom login processing if needed
        # You have access to self.user here
        
        # Return the original result from parent's login method
        return super().login(request, redirect_url)


class UserSocialSignupForm(SocialSignupForm):
    """
    Renders the form when user has signed up using social accounts.
    Default fields will be added automatically.
    See UserSignupForm otherwise.
    """
    name = forms.CharField(
        max_length=255,
        required=False,
        widget=forms.TextInput(
            attrs={
                'placeholder': 'Full Name (optional)',
                'class': 'md3-input'
            }
        )
    )
    
    def save(self, request):
        user = super().save(request)
        user.name = self.cleaned_data.get('name', '')
        # Try to get name from social account if not provided
        if not user.name and hasattr(self, 'sociallogin'):
            user.name = self.sociallogin.account.extra_data.get('name', '')
        user.save()
        return user

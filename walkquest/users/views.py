import json

from allauth.account import app_settings
from allauth.account.utils import complete_signup
from allauth.account.utils import user_display
from allauth.account.views import EmailVerificationSentView
from allauth.account.views import ConfirmEmailView
from allauth.account.views import LoginView
from allauth.account.views import SignupView
from django.contrib import messages
from django.contrib.auth import get_user_model
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.messages.views import SuccessMessageMixin
from django.db.models import QuerySet
from django.http import JsonResponse
from django.shortcuts import redirect
from django.urls import reverse
from django.utils.translation import gettext_lazy as _
from django.views import View
from django.views.decorators.http import require_GET
from django.views.generic import DetailView
from django.views.generic import RedirectView
from django.views.generic import UpdateView

User = get_user_model()


class UserDetailView(LoginRequiredMixin, DetailView):
    model = User
    slug_field = "username"
    slug_url_kwarg = "username"
    template_name = "users/user_detail.html"


user_detail_view = UserDetailView.as_view()


class UserUpdateView(LoginRequiredMixin, SuccessMessageMixin, UpdateView):
    model = User
    fields = ["name"]
    success_message = _("Information successfully updated")
    template_name = "users/user_form.html"

    def get_success_url(self):
        assert self.request.user.is_authenticated
        return self.request.user.get_absolute_url()

    def get_object(self):
        return self.request.user


user_update_view = UserUpdateView.as_view()


class UserRedirectView(LoginRequiredMixin, RedirectView):
    permanent = False

    def get_redirect_url(self):
        return reverse("users:detail", kwargs={"username": self.request.user.username})


user_redirect_view = UserRedirectView.as_view()


class CustomEmailVerificationSentView(EmailVerificationSentView):
    def get(self, request, *args, **kwargs):
        # Add success message for snackbar
        messages.success(
            request,
            "Verification email sent! Please check your inbox.",
            extra_tags='md-snackbar'
        )
        return super().get(request, *args, **kwargs)


class CustomEmailVerificationView(ConfirmEmailView):
    def get(self, request, *args, **kwargs):
        try:
            # Add success message for snackbar when email is verified
            messages.success(
                request,
                "Email verified successfully!",
                extra_tags='md-snackbar'
            )
            return super().get(request, *args, **kwargs)
        except Exception as e:
            print(f"Error in email verification: {str(e)}")
            messages.error(
                request,
                f"Error verifying email: {str(e)}",
                extra_tags='md-snackbar'
            )
            return redirect('/')


class JSONSignupView(SignupView):
    """Handle JSON signup requests"""
    def form_valid(self, form):
        self.user = form.save(self.request)
        messages.success(
            self.request,
            f"Welcome to WalkQuest! Please check your email to verify your account.",
            extra_tags='md-snackbar'
        )
        return JsonResponse({
            'success': True,
            'message': 'Account created successfully',
            'user': {
                'email': self.user.email,
                'username': self.user.username
            }
        })

    def form_invalid(self, form):
        return JsonResponse({
            'success': False,
            'errors': form.errors
        }, status=400)


class JSONLoginView(LoginView):
    """Handle JSON login requests"""
    def form_valid(self, form):
        self.user = form.user
        # Add success message
        messages.success(
            self.request,
            f"Welcome back, {user_display(self.user)}!",
            extra_tags='md-snackbar'
        )
        return JsonResponse({
            'success': True,
            'message': 'Logged in successfully',
            'user': {
                'email': self.user.email,
                'username': self.user.username
            }
        })

    def form_invalid(self, form):
        return JsonResponse({
            'success': False,
            'errors': form.errors
        }, status=400)


# Add a new view to check for auth events
@require_GET
def auth_events(request):
    """
    API endpoint to check for authentication events.
    Vue components can poll this endpoint to know when auth state changes.
    
    This endpoint is used for both:
    1. Checking current auth status (is_authenticated, user data)
    2. Getting any server-side auth events (login, logout, etc.)
    
    This helps keep the Vue app in sync with the server-side authentication state.
    """
    events = request.session.get('auth_events', [])
    csrf_token = request.META.get('CSRF_COOKIE')
    session_token = request.session.get('allauth_session_token')
    
    # Clear the events after reading them
    request.session['auth_events'] = []
    request.session.modified = True
    
    # Format response according to allauth headless API structure
    response = {
        'meta': {
            'is_authenticated': request.user.is_authenticated,
            'csrf_token': csrf_token
        },
        'data': {
            'user': {
                'email': request.user.email,
                'username': getattr(request.user, 'username', ''),
                'name': getattr(request.user, 'name', ''),
            } if request.user.is_authenticated else None
        },
        'status': 200,
        'events': events
    }
    
    # Add session token if available (for app client type)
    if session_token:
        response['meta']['session_token'] = session_token
    
    # Include any auth flows if needed
    email_verification_needed = False
    if request.user.is_authenticated:
        # Check if user needs email verification
        try:
            email_verified = getattr(request.user, 'emailaddress_set', None) and \
                             request.user.emailaddress_set.filter(verified=True).exists()
            email_verification_needed = not email_verified
        except:
            pass
    
    if email_verification_needed:
        response['data']['flows'] = ['verify_email']
    
    return JsonResponse(response)

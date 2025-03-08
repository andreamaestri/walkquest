from django.contrib.auth import get_user_model
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.messages.views import SuccessMessageMixin
from django.urls import reverse
from django.utils.translation import gettext_lazy as _
from django.views.generic import DetailView, RedirectView, UpdateView
from django.http import JsonResponse
from django.views import View
from django.db.models import QuerySet
from allauth.account.views import SignupView, LoginView
from allauth.account.utils import complete_signup, user_display
from allauth.account import app_settings
from django.views.decorators.http import require_GET
import json

User = get_user_model()


class UserDetailView(LoginRequiredMixin, DetailView):
    model = User
    slug_field = "username"
    slug_url_kwarg = "username"


user_detail_view = UserDetailView.as_view()


class UserUpdateView(LoginRequiredMixin, SuccessMessageMixin, UpdateView):
    model = User
    fields = ["name"]
    success_message = _("Information successfully updated")

    def get_success_url(self) -> str:
        assert self.request.user.is_authenticated  # type guard
        return self.request.user.get_absolute_url()

    def get_object(self, queryset: QuerySet | None=None) -> User:
        assert self.request.user.is_authenticated  # type guard
        return self.request.user


user_update_view = UserUpdateView.as_view()


class UserRedirectView(LoginRequiredMixin, RedirectView):
    permanent = False

    def get_redirect_url(self) -> str:
        """Redirect to home page instead of user profile"""
        return '/'  # Always redirect to home


user_redirect_view = UserRedirectView.as_view()


class JSONSignupView(SignupView):
    """Handle JSON signup requests"""
    
    def get(self, request, *args, **kwargs):
        # Return JSON response for API requests
        if request.headers.get('Accept') == 'application/json':
            return JsonResponse({
                "status": "ok", 
                "message": "Please use POST to signup"
            })
        return super().get(request, *args, **kwargs)

    def form_valid(self, form):
        # Check if it's a JSON request
        if self.request.headers.get('Accept') == 'application/json':
            # Create the user
            self.user = form.save(self.request)
            
            # Complete signup process - will handle email verification based on settings
            complete_signup(
                self.request, 
                self.user, 
                app_settings.EMAIL_VERIFICATION, 
                None  # Success URL will be handled by the adapter
            )
            
            return JsonResponse({
                "success": True, 
                "message": "User registered successfully"
            })
        
        # Handle regular form submission
        return super().form_valid(form)

    def form_invalid(self, form):
        # Return JSON error response for API requests
        if self.request.headers.get('Accept') == 'application/json':
            return JsonResponse({
                "success": False, 
                "errors": form.errors,
                "message": "Registration failed"
            }, status=400)
        
        # Handle regular form submission
        return super().form_invalid(form)


class JSONLoginView(LoginView):
    """Handle JSON login requests"""
    
    def get(self, request, *args, **kwargs):
        # Return JSON response for API requests
        if request.headers.get('Accept') == 'application/json':
            return JsonResponse({
                "status": "ok", 
                "message": "Please use POST to login"
            })
        return super().get(request, *args, **kwargs)

    def form_valid(self, form):
        # Check if it's a JSON request
        if self.request.headers.get('Accept') == 'application/json':
            # Login the user (handled by parent class)
            success_url = self.get_success_url()
            
            # Return JSON response
            return JsonResponse({
                "success": True, 
                "redirect_url": success_url
            })
        
        # Handle regular form submission
        return super().form_valid(form)

    def form_invalid(self, form):
        # Return JSON error response for API requests
        if self.request.headers.get('Accept') == 'application/json':
            return JsonResponse({
                "success": False, 
                "errors": form.errors,
                "message": "Login failed"
            }, status=400)
        
        # Handle regular form submission
        return super().form_invalid(form)


# Add a new view to check for auth events
@require_GET
def auth_events(request):
    """
    API endpoint to check for authentication events.
    Vue components can poll this endpoint to know when auth state changes.
    """
    events = request.session.get('auth_events', [])
    
    # Clear the events after reading them
    request.session['auth_events'] = []
    request.session.modified = True
    
    return JsonResponse({
        'events': events,
        'is_authenticated': request.user.is_authenticated,
        'user': {
            'email': request.user.email,
            'username': getattr(request.user, 'username', ''),
            'name': getattr(request.user, 'name', ''),
        } if request.user.is_authenticated else None
    })

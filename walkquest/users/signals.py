from django.conf import settings
from django.dispatch import receiver
from allauth.account.signals import (
    user_logged_in,
    user_logged_out,
    user_signed_up,
    password_changed,
    password_reset,
    email_confirmed,
    email_changed,
    email_added,
    email_removed
)
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.core.signals import request_finished

# Create a function to push auth state to the frontend
def push_auth_state_to_frontend(request, event_type, user=None, **kwargs):
    """
    Adds auth state update to the session, which will be picked up by the Vue frontend.
    The frontend can poll for these events or use WebSockets if implemented.
    """
    if not request or not hasattr(request, 'session'):
        return

    # Store auth event in session
    if not request.session.get('auth_events'):
        request.session['auth_events'] = []
    
    # Build event data
    event_data = {
        'event': event_type,
        'timestamp': str(kwargs.get('timestamp', '')),
    }
    
    # Add user info if available
    if user:
        event_data['user'] = {
            'id': user.id,
            'email': user.email,
            'username': getattr(user, 'username', ''),
            'name': getattr(user, 'name', ''),
        }
        
    # Add the event to the session
    request.session['auth_events'].append(event_data)
    request.session.modified = True


# Signal handlers for authentication events
@receiver(user_logged_in)
def user_logged_in_handler(sender, request, user, **kwargs):
    """Handle user login signal"""
    push_auth_state_to_frontend(request, 'login', user, **kwargs)


@receiver(user_logged_out)
def user_logged_out_handler(sender, request, user, **kwargs):
    """Handle user logout signal"""
    push_auth_state_to_frontend(request, 'logout', user, **kwargs)


@receiver(user_signed_up)
def user_signed_up_handler(sender, request, user, **kwargs):
    """Handle user signup signal"""
    push_auth_state_to_frontend(request, 'signup', user, **kwargs)


@receiver(password_changed)
def password_changed_handler(sender, request, user, **kwargs):
    """Handle password change signal"""
    push_auth_state_to_frontend(request, 'password_changed', user, **kwargs)


@receiver(password_reset)
def password_reset_handler(sender, request, user, **kwargs):
    """Handle password reset signal"""
    push_auth_state_to_frontend(request, 'password_reset', user, **kwargs)


@receiver(email_confirmed)
def email_confirmed_handler(sender, request, email_address, **kwargs):
    """Handle email confirmation signal"""
    user = email_address.user
    push_auth_state_to_frontend(request, 'email_confirmed', user, email=email_address.email, **kwargs)


@receiver(email_changed)
def email_changed_handler(sender, request, user, from_email_address, to_email_address, **kwargs):
    """Handle email change signal"""
    push_auth_state_to_frontend(
        request, 
        'email_changed', 
        user, 
        from_email=getattr(from_email_address, 'email', ''),
        to_email=getattr(to_email_address, 'email', ''),
        **kwargs
    )


@receiver(email_added)
def email_added_handler(sender, request, user, email_address, **kwargs):
    """Handle email addition signal"""
    push_auth_state_to_frontend(request, 'email_added', user, email=email_address.email, **kwargs)


@receiver(email_removed)
def email_removed_handler(sender, request, user, email_address, **kwargs):
    """Handle email removal signal"""
    push_auth_state_to_frontend(request, 'email_removed', user, email=email_address.email, **kwargs)
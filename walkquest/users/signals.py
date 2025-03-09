from django.conf import settings
from django.dispatch import receiver
from django.contrib import messages
from allauth.account.signals import (
    user_logged_in,
    user_logged_out,
    user_signed_up,
    password_changed,
    password_reset,
    email_confirmed,
    email_changed,
    email_added,
    email_removed,
)


def push_auth_state_to_frontend(request, event_type, user=None, message=None, **kwargs):
    """Adds auth state update to the session and shows a snackbar message."""
    if not request or not hasattr(request, "session"):
        return

    # Store auth event in session
    if not request.session.get("auth_events"):
        request.session["auth_events"] = []
    
    # Build event data
    event_data = {
        "event": event_type,
        "timestamp": str(kwargs.get("timestamp", "")),
    }
    
    # Add user info if available
    if user:
        event_data["user"] = {
            "id": user.id,
            "email": user.email,
            "username": getattr(user, "username", ""),
            "name": getattr(user, "name", ""),
        }

    # Add the event to the session
    request.session["auth_events"].append(event_data)
    request.session.modified = True

    # Show snackbar message if provided
    if message:
        messages.success(request, message, extra_tags="md-snackbar")


@receiver(user_logged_in)
def user_logged_in_handler(sender, request, user, **kwargs):
    """Handle user login signal"""
    user_display = settings.ACCOUNT_USER_DISPLAY(user)
    new_user = not getattr(user, "has_visited", False)
    message = f"Welcome to WalkQuest! {user_display}" if new_user else f"Welcome back, {user_display}!"
    
    push_auth_state_to_frontend(
        request,
        "login",
        user,
        message=message,
        **kwargs,
    )
    user.has_visited = True


@receiver(user_logged_out)
def user_logged_out_handler(sender, request, user, **kwargs):
    """Handle user logout signal"""
    message = "You have been logged out successfully."
    push_auth_state_to_frontend(
        request,
        "logout",
        user,
        message=message,
        **kwargs,
    )


@receiver(user_signed_up)
def user_signed_up_handler(sender, request, user, **kwargs):
    """Handle user signup signal"""
    user_display = settings.ACCOUNT_USER_DISPLAY(user)
    message = (
        f"Welcome to WalkQuest, {user_display}! "
        "Please check your email to verify your account."
    )
    push_auth_state_to_frontend(
        request,
        "signup",
        user,
        message=message,
        **kwargs,
    )


@receiver(password_changed)
def password_changed_handler(sender, request, user, **kwargs):
    """Handle password change signal"""
    message = "Your password has been changed successfully."
    push_auth_state_to_frontend(
        request,
        "password_changed",
        user,
        message=message,
        **kwargs,
    )


@receiver(password_reset)
def password_reset_handler(sender, request, user, **kwargs):
    """Handle password reset signal"""
    message = "Your password has been reset successfully."
    push_auth_state_to_frontend(
        request,
        "password_reset",
        user,
        message=message,
        **kwargs,
    )


@receiver(email_confirmed)
def email_confirmed_handler(sender, request, email_address, **kwargs):
    """Handle email confirmation signal"""
    user = email_address.user
    message = f"Your email address {email_address.email} has been confirmed."
    push_auth_state_to_frontend(
        request,
        "email_confirmed",
        user,
        message=message,
        email=email_address.email,
        **kwargs,
    )


@receiver(email_changed)
def email_changed_handler(
    sender,
    request,
    user,
    from_email_address,
    to_email_address,
    **kwargs,
):
    """Handle email change signal"""
    message = f"Your email address has been changed to {to_email_address.email}."
    push_auth_state_to_frontend(
        request,
        "email_changed",
        user,
        message=message,
        from_email=getattr(from_email_address, "email", ""),
        to_email=getattr(to_email_address, "email", ""),
        **kwargs,
    )


@receiver(email_added)
def email_added_handler(sender, request, user, email_address, **kwargs):
    """Handle email addition signal"""
    message = f"The email address {email_address.email} has been added to your account."
    push_auth_state_to_frontend(
        request,
        "email_added",
        user,
        message=message,
        email=email_address.email,
        **kwargs,
    )


@receiver(email_removed)
def email_removed_handler(sender, request, user, email_address, **kwargs):
    """Handle email removal signal"""
    message = (
        f"The email address {email_address.email} has been removed from your account."
    )
    push_auth_state_to_frontend(
        request,
        "email_removed",
        user,
        message=message,
        email=email_address.email,
        **kwargs,
    )

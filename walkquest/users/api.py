import json
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.contrib.auth import get_user_model, login, authenticate
from allauth.account.utils import send_email_confirmation
from django.core.mail import send_mail
from django.conf import settings

User = get_user_model()

@require_http_methods(["GET"])
def test_email(request):
    """Test function to verify email sending works"""
    if not request.user.is_authenticated or not request.user.is_superuser:
        return HttpResponse("Unauthorized", status=401)
        
    try:
        # Test direct email
        recipient = request.GET.get('email', request.user.email)
        print(f"Sending test email to {recipient}")
        print(f"Using settings: HOST={settings.EMAIL_HOST}, USER={settings.EMAIL_HOST_USER}")
        
        send_mail(
            'WalkQuest Test Email',
            'This is a test email from WalkQuest to verify email sending works.',
            settings.DEFAULT_FROM_EMAIL,
            [recipient],
            fail_silently=False,
        )
        
        return HttpResponse(f"Test email sent to {recipient}")
    except Exception as e:
        import traceback
        traceback.print_exc()
        return HttpResponse(f"Error sending email: {str(e)}", status=500)

@csrf_exempt  # Temporarily exempt CSRF protection for debugging
@require_http_methods(["POST"])
def handle_logout(request):
    """
    API endpoint to handle logout requests and return a JSON response
    """
    from django.contrib.auth import logout as auth_logout
    
    try:
        auth_logout(request)
        
        # Return a successful JSON response
        return JsonResponse({
            'meta': {
                'is_authenticated': False
            },
            'message': 'Successfully logged out',
            'status': 200,
            'ok': True
        })
    except Exception as e:
        print(f"Logout error: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'status': 'error',
            'message': f'Error during logout: {str(e)}'
        }, status=500)

@csrf_exempt  # Temporarily exempt CSRF protection for debugging
@require_http_methods(["POST"])
def handle_login(request):
    try:
        data = json.loads(request.body)
        # Support both 'login' and 'email' field names
        email = data.get('login') or data.get('email')
        password = data.get('password')
        remember = data.get('remember', False)
        
        # Debug info
        print(f"Login attempt: login/email={email}, remember={remember}")
        
        if not email or not password:
            return JsonResponse({
                'message': 'Email and password are required',
                'errors': {
                    'email': ['Email is required'] if not email else [],
                    'password': ['Password is required'] if not password else []
                }
            }, status=400)
            
        # For email authentication, we need to use email=email parameter
        # This matches django-allauth's ACCOUNT_AUTHENTICATION_METHOD = "email" setting
        user = authenticate(request, email=email, password=password)
            
        # If that fails, fall back to username authentication
        if user is None:
            # Try username authentication directly
            user = authenticate(request, username=email, password=password)
        
        # Debug info
        print(f"Authentication result: user={user}")
        
        if user is not None:
            if user.is_active:
                # When logging in, we need to specify the backend
                from django.contrib.auth import get_backends
                backend = get_backends()[0]  # Get the first backend
                print(f"Using authentication backend: {backend.__class__.__name__}")
                user.backend = f"{backend.__module__}.{backend.__class__.__name__}"
                
                # Log the user in
                login(request, user)
                
                # Set session expiry based on the remember flag
                if remember:
                    # Set session to expire in 2 weeks
                    request.session.set_expiry(1209600)
                else:
                    # Set session to expire when the user closes their browser
                    request.session.set_expiry(0)
                
                # Check if email verification is needed
                email_verification_needed = False
                try:
                    from allauth.account.models import EmailAddress
                    from django.conf import settings
                    
                    # Only check if verification is enabled in settings
                    if settings.ACCOUNT_EMAIL_VERIFICATION in ['mandatory', 'optional']:
                        email_verified = EmailAddress.objects.filter(user=user, verified=True).exists()
                        email_verification_needed = not email_verified
                    
                    # Set a session variable for email verification
                    request.session['email_verification_needed'] = email_verification_needed
                    request.session.modified = True
                except Exception as e:
                    print(f"Error checking email verification: {str(e)}")
                
                # Format response to match allauth headless API
                response_data = {
                    'meta': {
                        'is_authenticated': True,
                        'session_token': request.session.session_key
                    },
                    'data': {
                        'user': {
                            'email': user.email,
                            'username': user.username,
                            'name': getattr(user, 'name', '')
                        }
                    },
                    'status': 200,
                    'message': 'Login successful',
                    'ok': True
                }
                
                # Add email verification info if needed
                if email_verification_needed:
                    response_data['data']['flows'] = ['verify_email']
                    response_data['email_verification_needed'] = True
                
                return JsonResponse(response_data)
            else:
                return JsonResponse({
                    'message': 'Account is inactive',
                    'errors': {
                        'email': ['This account is inactive. Please contact support.']
                    },
                    'status': 403
                }, status=403)
        else:
            # Check if user exists but password is wrong
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            user_exists = User.objects.filter(email=email).exists()
            if user_exists:
                print(f"User exists with email {email} but password is incorrect")
                return JsonResponse({
                    'message': 'Invalid password',
                    'errors': {
                        'password': ['The password you entered is incorrect.']
                    },
                    'status': 401
                }, status=401)
            else:
                print(f"No user found with email {email}")
                return JsonResponse({
                    'message': 'Invalid credentials',
                    'errors': {
                        'email': ['No account found with this email address.'],
                    },
                    'status': 401
                }, status=401)
            
    except json.JSONDecodeError:
        return JsonResponse({
            'status': 'error',
            'message': 'Invalid JSON'
        }, status=400)
    except Exception as e:
        print(f"Login error: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'status': 'error',
            'message': f'Server error: {str(e)}'
        }, status=500)

@csrf_exempt  # Temporarily exempt CSRF protection for debugging
@require_http_methods(["POST"])
def handle_signup(request):
    try:
        data = json.loads(request.body)
        email = data.get('email')
        username = data.get('username')
        password1 = data.get('password1')
        password2 = data.get('password2')
        name = data.get('name', '')
        
        # For debugging
        print(f"Signup data: email={email}, username={username}, password1={'*'*len(password1) if password1 else None}, password2={'*'*len(password2) if password2 else None}")
        
        errors = {}
        
        # Validate required fields
        if not email:
            errors['email'] = ['Email is required']
        
        if not username:
            errors['username'] = ['Username is required']
            
        if not password1:
            errors['password1'] = ['Password is required']
            
        if not password2:
            errors['password2'] = ['Confirmation password is required']
        
        # Validate matching passwords    
        if password1 and password2 and password1 != password2:
            errors['password2'] = ['Passwords do not match']
        
        # Validate password length
        if password1 and len(password1) < 8:
            errors['password1'] = ['Password must be at least 8 characters']
            
        # Check if user exists
        if email and User.objects.filter(email=email).exists():
            errors['email'] = ['User with this email already exists']
            
        if username and User.objects.filter(username=username).exists():
            errors['username'] = ['This username is already taken']
            
        # Return errors if validation fails
        if errors:
            return JsonResponse({
                'status': 'error',
                'errors': errors
            }, status=400)
            
        # Create user
        user = User.objects.create_user(
            username=username, 
            email=email,
            password=password1
        )
        
        # Set name if provided
        if name:
            user.name = name
            user.save()
        
        email_sent = False
        email_verification_needed = False
        
        # Get email settings
        from django.conf import settings
        email_verification_setting = settings.ACCOUNT_EMAIL_VERIFICATION
        email_required = settings.ACCOUNT_EMAIL_REQUIRED
        
        # Determine if email verification is needed
        if email_required and email_verification_setting in ['mandatory', 'optional']:
            email_verification_needed = True
        
        try:
            # Try to send confirmation email if verification is needed
            if email_verification_needed:
                print(f"Attempting to send confirmation email to {user.email}")
                print(f"Email settings: HOST={settings.EMAIL_HOST}, USER={settings.EMAIL_HOST_USER}")
                
                # Make sure we have valid email settings before attempting to send
                if settings.EMAIL_HOST and settings.EMAIL_HOST_USER:
                    # Send confirmation email using allauth's utility
                    send_email_confirmation(request, user)
                    print(f"Email confirmation sent successfully to {user.email}")
                    email_sent = True
                else:
                    print("Warning: Email settings are incomplete. Can't send email confirmation.")
        except Exception as e:
            print(f"Warning: Failed to send email confirmation: {str(e)}")
            import traceback
            traceback.print_exc()
            # Continue anyway - don't block signup because of email issues
            
        # Log user in with the specific backend
        from django.contrib.auth import get_backends
        backend = get_backends()[0]  # Get the first backend
        print(f"Using authentication backend: {backend.__class__.__name__}")
        user.backend = f"{backend.__module__}.{backend.__class__.__name__}"
        login(request, user)
        
        # Set a session variable to indicate email verification is needed
        if email_verification_needed:
            request.session['email_verification_needed'] = True
            
        # Return response in a format similar to allauth headless API
        response_data = {
            'meta': {
                'is_authenticated': True,
                'session_token': request.session.session_key
            },
            'data': {
                'user': {
                    'email': user.email,
                    'username': user.username,
                    'name': getattr(user, 'name', '')
                }
            },
            'status': 201,
            'message': 'Account created successfully'
        }
        
        # Add email verification info to the response
        if email_verification_needed:
            response_data['data']['flows'] = ['verify_email']
            response_data['email_verification_needed'] = True
            response_data['email_sent'] = email_sent
        
        return JsonResponse(response_data)
            
    except json.JSONDecodeError:
        return JsonResponse({
            'status': 'error',
            'message': 'Invalid JSON'
        }, status=400)
    except Exception as e:
        print(f"Signup error: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'status': 'error',
            'message': f'Server error: {str(e)}'
        }, status=500)

@ensure_csrf_cookie
@require_http_methods(["GET"])
def get_csrf_token(request):
    """
    API endpoint to get a CSRF token via a cookie
    This view does nothing, but forces Django to send the CSRF cookie
    """
    return JsonResponse({
        'success': True,
        'message': 'CSRF cookie set'
    })
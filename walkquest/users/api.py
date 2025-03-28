import json
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import ensure_csrf_cookie
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

@ensure_csrf_cookie
@require_http_methods(["POST"])
def handle_login(request):
    try:
        data = json.loads(request.body)
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return JsonResponse({
                'message': 'Email and password are required'
            }, status=400)
            
        # Authenticate user
        user = authenticate(request, username=email, password=password)
        if user is not None:
            if user.is_active:
                login(request, user)
                return JsonResponse({
                    'message': 'Login successful',
                    'user': {
                        'email': user.email,
                        'username': user.username
                    }
                })
            else:
                return JsonResponse({
                    'message': 'Account is inactive'
                }, status=403)
        else:
            return JsonResponse({
                'message': 'Invalid credentials'
            }, status=401)
            
    except json.JSONDecodeError:
        return JsonResponse({
            'message': 'Invalid JSON'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'message': str(e)
        }, status=500)

@ensure_csrf_cookie
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
        
        try:
            # Try to send confirmation email
            print(f"Attempting to send confirmation email to {user.email}")
            # Get email settings from environment
            from django.conf import settings
            print(f"Email settings: HOST={settings.EMAIL_HOST}, USER={settings.EMAIL_HOST_USER}")
            
            # Send confirmation email
            send_email_confirmation(request, user)
            print(f"Email confirmation sent successfully to {user.email}")
        except Exception as e:
            print(f"Warning: Failed to send email confirmation: {str(e)}")
            import traceback
            traceback.print_exc()
            # Continue anyway - don't block signup because of email issues
            
        # Log user in
        login(request, user)
        
        # Return response in a format similar to allauth headless
        return JsonResponse({
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
        })
            
    except json.JSONDecodeError:
        return JsonResponse({
            'status': 'error',
            'message': 'Invalid JSON'
        }, status=400)
    except Exception as e:
        print(f"Signup error: {str(e)}")
        return JsonResponse({
            'status': 'error',
            'message': f'Server error: {str(e)}'
        }, status=500)
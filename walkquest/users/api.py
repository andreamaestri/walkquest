import json
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import ensure_csrf_cookie
from django.contrib.auth import get_user_model, login, authenticate
from allauth.account.utils import send_email_confirmation

User = get_user_model()

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
        password1 = data.get('password1')
        password2 = data.get('password2')
        
        if not all([email, password1, password2]):
            return JsonResponse({
                'message': 'All fields are required'
            }, status=400)
            
        if password1 != password2:
            return JsonResponse({
                'message': 'Passwords do not match'
            }, status=400)
            
        # Check if user exists
        if User.objects.filter(email=email).exists():
            return JsonResponse({
                'message': 'User with this email already exists'
            }, status=400)
            
        # Create user
        user = User.objects.create_user(
            username=email, 
            email=email,
            password=password1
        )
        
        # Send confirmation email
        send_email_confirmation(request, user)
        
        # Log user in
        login(request, user)
        
        return JsonResponse({
            'message': 'Account created successfully',
            'user': {
                'email': user.email,
                'username': user.username
            }
        })
            
    except json.JSONDecodeError:
        return JsonResponse({
            'message': 'Invalid JSON'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'message': str(e)
        }, status=500)
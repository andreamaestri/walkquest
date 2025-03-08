from django.middleware.csrf import get_token

class CSRFMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Force CSRF cookie to be set by getting the token early
        get_token(request)
        
        response = self.get_response(request)
        
        # Add CSRF token to response headers for all requests
        # This helps with AJAX requests and frontend frameworks
        response['X-CSRFToken'] = get_token(request)
        
        return response
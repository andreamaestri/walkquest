from typing import List, Optional, Dict, Any

from django.http import HttpRequest, JsonResponse
from django.views import View
from ninja import Router, NinjaAPI, Schema
from allauth.headless.contrib.ninja.security import x_session_token_auth

from walkquest.walks.models import Walk
from walkquest.walks.api import api as walks_router, ORJSONParser, ORJSONRenderer
from .schemas import ConfigOut, TagOut, WalkOut

# Create a router for the main API
router = Router()

# Add your endpoints to the router
@router.get("/health")
def health_check(request):
    return {"status": "healthy"}

# Create the API instance and add the router to it
api_instance = NinjaAPI(
    title="Main API",
    version="1.0.0",
    urls_namespace="main-api",
    parser=ORJSONParser(),
    renderer=ORJSONRenderer()
)

# Add the main router
api_instance.add_router("", router)

# Add the walks router at root level
api_instance.add_router("", walks_router)

class UserSchema(Schema):
    id: Optional[int] = None
    email: str
    username: str
    is_authenticated: bool

class PreferencesSchema(Schema):
    dark_mode: bool = False
    map_style: str = "streets-v11"

class PreferenceUpdateSchema(Schema):
    dark_mode: Optional[bool] = None
    map_style: Optional[str] = None


@api_instance.get("/user", response=UserSchema, auth=[x_session_token_auth])
def get_current_user(request: HttpRequest) -> Dict[str, Any]:
    """Get current user information"""
    if request.user.is_authenticated:
        return {
            "id": request.user.id,
            "email": request.user.email,
            "username": request.user.username,
            "is_authenticated": True
        }
    return {
        "id": None,
        "email": "",
        "username": "",
        "is_authenticated": False
    }

@api_instance.get("/preferences", response=PreferencesSchema, auth=[x_session_token_auth])
def get_preferences(request: HttpRequest) -> Dict[str, Any]:
    """Get user preferences"""
    if not request.user.is_authenticated:
        return PreferencesSchema().dict()
    
    # Replace with actual preference retrieval logic
    return {
        "dark_mode": False,  # Replace with user preference
        "map_style": "streets-v11"  # Replace with user preference
    }

@api_instance.patch("/preferences", response=PreferencesSchema, auth=[x_session_token_auth])
def update_preferences(request: HttpRequest, data: PreferenceUpdateSchema) -> Dict[str, Any]:
    """Update user preferences"""
    if not request.user.is_authenticated:
        return PreferencesSchema().dict()
    
    # Replace with actual preference update logic
    return {
        "dark_mode": data.dark_mode if data.dark_mode is not None else False,
        "map_style": data.map_style if data.map_style is not None else "streets-v11"
    }

# Add UserAPI class for direct API endpoint
class UserAPI(View):
    """API endpoint for user information"""
    
    def get(self, request):
        """Get current user information"""
        if request.user.is_authenticated:
            return JsonResponse({
                "id": request.user.id,
                "email": request.user.email,
                "username": request.user.username,
                "is_authenticated": True
            })
        return JsonResponse({
            "id": None,
            "email": "",
            "username": "",
            "is_authenticated": False
        })

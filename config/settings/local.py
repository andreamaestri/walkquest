# ruff: noqa: E501
from .base import *  # noqa: F403
from .base import INSTALLED_APPS
from .base import MIDDLEWARE
from .base import STATICFILES_FINDERS
from .base import env
from pathlib import Path

# GENERAL
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/dev/ref/settings/#debug
DEBUG = True
# https://docs.djangoproject.com/en/dev/ref/settings/#secret-key
SECRET_KEY = env(
    "DJANGO_SECRET_KEY",
    default="USfCDpMV0G1ctas6WbqsnNsnkLR8j4AQtucBUTDJ0kWlnciSd4adBJwQYTFP1GjB",
)
# https://docs.djangoproject.com/en/dev/ref/settings/#allowed-hosts
ALLOWED_HOSTS = ["*"]  # noqa: S104

# DATABASES
# ------------------------------------------------------------------------------
DATABASES = {
    "default": env.db("DATABASE_URL"),
}
DATABASES["default"]["ENGINE"] = "django.contrib.gis.db.backends.postgis"

# SECURITY SETTINGS FOR LOCAL DEVELOPMENT
# ------------------------------------------------------------------------------
# Override secure settings for local development
CSRF_COOKIE_SECURE = False  # Allow CSRF cookies to be sent over HTTP
SESSION_COOKIE_SECURE = False  # Allow session cookies to be sent over HTTP
CSRF_COOKIE_HTTPONLY = False  # Allow JavaScript to access CSRF token
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SAMESITE = 'Lax'

# CORS settings for local development
# ------------------------------------------------------------------------------
CORS_ALLOW_ALL_ORIGINS = False  # Don't allow all origins, be explicit
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:5173",  # Vite dev server
    "http://127.0.0.1:5173",  # Vite dev server
]
CORS_ALLOW_METHODS = [
    "DELETE",
    "GET",
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT",
]
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
    "x-session-token",  # Required for allauth headless
]

# Ensure CORS middleware is included and in correct order
if "corsheaders.middleware.CorsMiddleware" not in MIDDLEWARE:
    # Insert CorsMiddleware before CommonMiddleware
    MIDDLEWARE.insert(
        MIDDLEWARE.index("django.middleware.common.CommonMiddleware"),
        "corsheaders.middleware.CorsMiddleware",
    )

# django-esm
# ------------------------------------------------------------------------------
STATICFILES_FINDERS = [
    "django.contrib.staticfiles.finders.FileSystemFinder",
    "django.contrib.staticfiles.finders.AppDirectoriesFinder",
]

# Vite Development Settings
# ------------------------------------------------------------------------------
DJANGO_VITE = {
    "default": {
        "dev_mode": True  # Same as DEBUG in development
    }
}

# STATICFILES_DIRS needs to include Vite's build output directory
STATICFILES_DIRS = [
    BASE_DIR / "walkquest/static/dist"  # Match Vite's outDir
]

# Use Vite's dev server for static files in development
if DEBUG:
    class ViteFileLoader:
        def __init__(self, get_response):
            self.get_response = get_response

        def __call__(self, request):
            return self.get_response(request)
    MIDDLEWARE.insert(0, "config.settings.local.ViteFileLoader")

# EMAIL
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/dev/ref/settings/#email-backend
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
EMAIL_HOST = "localhost"
EMAIL_PORT = 1025
EMAIL_HOST_USER = ""
EMAIL_HOST_PASSWORD = ""
EMAIL_USE_TLS = False
DEFAULT_FROM_EMAIL = "WalkQuest <noreply@walkquest.app>"

# django-allauth
# ------------------------------------------------------------------------------
ACCOUNT_EMAIL_VERIFICATION = "mandatory"
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_AUTHENTICATION_METHOD = "email"
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_EMAIL_CONFIRMATION_EXPIRE_DAYS = 3
ACCOUNT_CONFIRM_EMAIL_ON_GET = True
ACCOUNT_EMAIL_CONFIRMATION_AUTHENTICATED_REDIRECT_URL = "/"
ACCOUNT_EMAIL_CONFIRMATION_ANONYMOUS_REDIRECT_URL = "/login"

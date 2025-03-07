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

# CACHES
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/dev/ref/settings/#caches
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "",
    },
}

# EMAIL
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/dev/ref/settings/#email-backend
EMAIL_BACKEND = env(
    "DJANGO_EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend",
)

# WhiteNoise
# ------------------------------------------------------------------------------
# http://whitenoise.evans.io/en/latest/django.html#using-whitenoise-in-development
INSTALLED_APPS = ["whitenoise.runserver_nostatic", *INSTALLED_APPS]

# django-browser-reload
# ------------------------------------------------------------------------------
INSTALLED_APPS = ["django_browser_reload", *INSTALLED_APPS]
MIDDLEWARE.append("django_browser_reload.middleware.BrowserReloadMiddleware")
# django-debug-toolbar
# ------------------------------------------------------------------------------
# https://django-debug-toolbar.readthedocs.io/en/latest/installation.html#prerequisites
# INSTALLED_APPS += ["debug_toolbar"]
# https://django-debug-toolbar.readthedocs.io/en/latest/installation.html#middleware
# MIDDLEWARE += ["debug_toolbar.middleware.DebugToolbarMiddleware"]
# https://django-debug-toolbar.readthedocs.io/en/latest/configuration.html#debug-toolbar-config
# DEBUG_TOOLBAR_CONFIG = {
#     "DISABLE_PANELS": [
#         "debug_toolbar.panels.redirects.RedirectsPanel",
#         # Disable profiling panel due to an issue with Python 3.12:
#         # https://github.com/jazzband/django-debug-toolbar/issues/1875
#         "debug_toolbar.panels.profiling.ProfilingPanel",
#     ],
#     "SHOW_TEMPLATE_CONTEXT": True,
# }
# https://django-debug-toolbar.readthedocs.io/en/latest/installation.html#internal-ips
INTERNAL_IPS = ["127.0.0.1", "10.0.2.2"]


# django-extensions
# ------------------------------------------------------------------------------
# https://django-extensions.readthedocs.io/en/latest/installation_instructions.html#configuration
INSTALLED_APPS += ["django_extensions"]
# Celery
# ------------------------------------------------------------------------------
# https://docs.celeryq.dev/en/stable/userguide/configuration.html#task-always-eager
CELERY_TASK_ALWAYS_EAGER = True
# https://docs.celeryq.dev/en/stable/userguide/configuration.html#task-eager-propagates
CELERY_TASK_EAGER_PROPAGATES = True
# Your stuff...
# ------------------------------------------------------------------------------
# CORS settings for local development
# ------------------------------------------------------------------------------
CORS_ALLOW_ALL_ORIGINS = True  # Only use in development!
CORS_ALLOW_CREDENTIALS = True
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
    "x-session-token",  # Add this for django-allauth headless auth
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
            response = self.get_response(request)
            return response

    MIDDLEWARE.insert(0, "config.settings.local.ViteFileLoader")

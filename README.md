# WalkQuest

WalkQuest is a Django and Vue application for discovering walking routes in Cornwall. It combines a map-based walk browser with filters, nearby search, favorites, user accounts, and adventure tracking.

## Stack

- Python 3.13 and Django 5.2
- Django Ninja for the JSON API
- PostgreSQL/PostGIS for spatial queries
- Redis for production caching and Celery workloads
- Vue 3, Vite, Pinia, Mapbox GL JS, and Tailwind CSS
- Gunicorn and WhiteNoise for deployment

## Repository layout

```text
config/                     Django settings, URLs, ASGI, and WSGI
walkquest/walks/            Walk models, API, admin, and fixtures
walkquest/users/            User accounts and profiles
walkquest/adventures/       Adventure and progress features
walkquest/static/js/        Vue source code
walkquest/static/css/       Application stylesheets
walkquest/templates/        Django templates
docs/                       Project and deployment documentation
tests/                      Python test suite
utility/                    Maintenance and import utilities
```

Vite writes compiled assets to `walkquest/static/dist/`. Django's `collectstatic` command writes the deployable static tree to `staticfiles/`; both directories are generated and ignored by Git.

## Requirements

Install the following before starting development:

- Python 3.13
- Poetry
- Node.js 22 and npm
- PostgreSQL with the PostGIS extension
- Redis (needed for production-like caching and background jobs)

## Local setup

```bash
git clone https://github.com/andreamaestri/walkquest.git
cd walkquest

python3.13 -m venv .venv
source .venv/bin/activate
pip install poetry
poetry install --with dev

npm ci
cp .env.example .env
python manage.py migrate
python manage.py check
```

Set a real database connection and a Mapbox public token in `.env` before using the map. Never commit `.env` or private credentials.

Run the backend and frontend in separate terminals:

```bash
python manage.py runserver
npm run dev
```

The Vite development server proxies frontend requests to Django. Open the address shown by Vite, usually `http://localhost:5173`.

## Frontend commands

```bash
npm run dev       # Start Vite in development mode
npm run build     # Build production assets
npm audit         # Check JavaScript dependencies
```

## Backend commands

```bash
poetry run python manage.py check
poetry run python manage.py migrate
poetry run python manage.py collectstatic --noinput
poetry run pytest
```

Tests need a working PostgreSQL/PostGIS database and the environment variables used by the selected Django settings module. The `reset_db.py` helper is destructive; prefer migrations for normal development.

## API overview

The API is available under `/api/` and interactive documentation is exposed by Django Ninja. Common endpoints include:

- `GET /api/health`
- `GET /api/walks`
- `GET /api/walks/nearby`
- `GET /api/walks/{identifier}`
- `GET /api/walks/{id}/geometry`
- `POST /api/walks/{id}/favorite`
- `GET /api/tags`
- `GET /api/filters`
- `GET /api/config`

The walk list intentionally returns an unpaginated, bounded result set. Nearby searches use a geographic bounding box and distance calculation to keep requests responsive without changing that API contract.

## Deployment

The `Procfile` starts Gunicorn with the Django WSGI application:

```bash
gunicorn config.wsgi:application --workers 2 --threads 4 --timeout 60 --access-logfile -
```

A production deployment should provide PostgreSQL/PostGIS, Redis, a securely configured `.env`, and a reverse proxy such as Nginx. Build frontend assets and collect Django static files during deployment:

```bash
npm ci
npm run build
python manage.py collectstatic --noinput
```

Set `DJANGO_SETTINGS_MODULE=config.settings.production`, configure `DJANGO_ALLOWED_HOSTS`, and use a strong `DJANGO_SECRET_KEY` in production. Restrict the Mapbox token to the domains that serve the application.

## Contributing

Keep changes focused, run the relevant Django checks and frontend build, and update documentation when commands or deployment behavior change. Dependency changes should update both `pyproject.toml`/`poetry.lock` and `package.json`/`package-lock.json`.

No license file is currently included in this repository.

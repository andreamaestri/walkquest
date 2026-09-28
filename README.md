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
npm run build     # Bundle icons, then build production assets
npm test          # Run the Vitest unit tests
npm run theme     # Regenerate M3 colour tokens (SEED=#127C80 npm run theme)
npm run icons     # Rebuild the bundled icon subset (runs before every build)
npm audit         # Check JavaScript dependencies
```

## Design system (Material 3 Expressive)

- **Tokens:** colour roles are generated from one seed colour with
  `@material/material-color-utilities` (`scripts/generate-m3-theme.mjs` →
  `walkquest/static/css/m3e/color.generated.css`, light and dark). Shape,
  typography, spring motion, elevation and state tokens live in
  `css/m3e/foundation.css`.
- **Tailwind v4:** `css/app.css` is the only stylesheet entry point. Tokens are
  mapped with `@theme inline`, so utilities such as `bg-surface-container-low`,
  `text-on-surface`, `rounded-m3-xl` and `ease-spring-fast` follow the theme,
  and `type-*`, `state-layer` and `shape-morph` utilities provide M3 roles.
- **Typeface:** Google Sans Flex (self-hosted, weight + roundness axes).
- **Motion:** CSS uses the M3 Expressive spring tokens, played back as true
  springs with `linear()` easings (`node scripts/generate-m3-springs.mjs`).
  JavaScript animations use [motion-v](https://motion.unovue.com) with the
  matching springs in `js/design/motion.js`: shared-axis list ⇄ detail
  transitions, the velocity-aware bottom sheet, and Mapbox camera moves on the
  M3 emphasized curve (`cameraMotion`). The desktop map sits under the pane and
  is revealed with a clip, so toggling the pane never resizes the canvas.
- **Components:** `js/components/m3/` (buttons, icon buttons, chips, menu,
  FAB menu, bottom sheet and the morphing-shape loading indicator).
- **Icons:** Iconify icons are bundled offline (`scripts/build-icon-subset.mjs`),
  so they render immediately without calls to the Iconify API.

## Walk list and map performance

Every walk is loaded at once, with no pagination and no clustering:

- `GET /api/walks` returns a compact, user-agnostic summary of every walk,
  cached per data version with an `ETag` (repeat visits get `304 Not
  Modified`) and gzip. The browser also keeps a copy in IndexedDB and renders
  it instantly while it revalidates.
- The list is virtualised with fixed-height rows, so only the visible cards
  exist in the DOM regardless of how many walks there are.
- The map draws all walks as one GeoJSON source and GPU layers; hover and
  selection use feature-state. Filters dim non-matching pins instead of
  hiding them.
- Full details (`/api/walks/{id}`), favourites (`/api/walks/favorites`) and
  route geometry are fetched on demand and memoised.

## Walk photos

Walk photos (the list thumbnail plus a captioned slideshow in each walk) are
imported from the walk's page on [iWalk Cornwall](https://www.iwalkcornwall.co.uk/),
whose URLs match each walk's `walk_id`:

```bash
poetry run python manage.py import_iwalk_photos --walk blisland_to_lavethan_wood --dry-run
poetry run python manage.py import_iwalk_photos            # walks without photos
poetry run python manage.py import_iwalk_photos --refresh  # re-import everything
```

The importer honours `robots.txt`, waits between requests (`--delay`, default
2 s), downloads each photo and stores 960 px and 320 px WebP renditions under
`MEDIA_ROOT/walks/<walk_id>/`. Use `--hotlink` to store the remote URLs instead,
and `--from-html page.html` to test the parser against a saved page. Photos
can be reordered, re-captioned or removed in the Django admin (Walk → Photos).

The photos are © iWalk Cornwall: make sure you have permission before
publishing them. The app credits them and links back to the source walk.

In production, serve `MEDIA_ROOT` from your web server, for example:

```nginx
location /media/ {
    alias /path/to/walkquest/walkquest/media/;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

If nothing else serves media, set `DJANGO_SERVE_MEDIA=True` to let Django serve
`/media/walks/` with long cache headers.

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
- `GET /api/walks` (compact summaries, `ETag`/`304`)
- `GET /api/walks/favorites` (the signed-in user's favourite walk IDs)
- `GET /api/walks/nearby`
- `GET /api/walks/{identifier}` (full details and photos)
- `GET /api/walks/{id}/geometry`
- `POST /api/walks/{id}/favorite`
- `GET /api/tags`
- `GET /api/filters`
- `GET /api/config`

The walk list intentionally returns every walk in one response (see *Walk list and map performance*). Search, category, difficulty and nearby filtering happen client-side over that index; `/api/walks/nearby` remains available for other clients.

## Running on Oracle (Always Free Autonomous Database)

WalkQuest runs on PostgreSQL/PostGIS by default and can also run on Oracle
Database 19c+ with Oracle Spatial, for example an Oracle Cloud **Always Free
Autonomous Database** (2 databases, 20 GB, 1 OCPU, 20 sessions each). Select it
with `DJANGO_DB_BACKEND=oracle`; see `config/settings/database.py` and
`.env.example` for the variables.

> Oracle **NoSQL** (Always Free: 3 tables) can't host the app: Django has no
> NoSQL backend and WalkQuest needs ~40 relational tables (accounts, allauth,
> favourites, adventures, tags, Celery beat, route geometry).

Notes:

- `walkquest.db.oracle` is GeoDjango's Oracle backend plus one fix: older
  migrations declare duplicate indexes that Oracle rejects (ORA-01408), so
  those statements are skipped instead of rewriting migration history.
- Oracle can't `SELECT DISTINCT` over text (LOB) columns and treats `''` like
  `NULL`; the code avoids both pitfalls (see `walks/api.py`).
- Connections use Django 5.2 pooling. Keep the total under 20 sessions:
  web `ORACLE_POOL_MAX=4` × 2 Gunicorn workers, Celery worker/beat
  `ORACLE_POOL_MAX=1` (set in `Procfile` and the systemd units).

### Local Oracle for development

```bash
docker run -d --name oracle -p 1521:1521 \
  -e ORACLE_PASSWORD=oraclepw -e APP_USER=walkquest -e APP_USER_PASSWORD=walkquest \
  gvenzl/oracle-free:23-faststart          # the -slim images omit Oracle Spatial
# test-suite privileges: run the commented grants in deploy/oracle/grants.sql as SYSDBA
DJANGO_DB_BACKEND=oracle ORACLE_DSN=localhost:1521/FREEPDB1 \
  ORACLE_USER=walkquest ORACLE_PASSWORD=walkquest python manage.py migrate
```

### Moving production from PostgreSQL to Autonomous Database

1. In OCI, create an Always Free Autonomous Database (Transaction Processing,
   23ai if your region offers it). Under *Network*, set an access control list
   allowing your VM and turn off *Require mutual TLS* so python-oracledb can use
   one-way TLS without a wallet. Copy the TLS connection string.
2. As `ADMIN`, run `deploy/oracle/grants.sql` (set your own password).
3. On the VM, keep `DJANGO_DB_BACKEND=postgis` and add `ORACLE_DSN`,
   `ORACLE_USER` and `ORACLE_PASSWORD`, then:
   ```bash
   python manage.py copy_to_oracle --dry-run   # row counts
   python manage.py copy_to_oracle             # migrate, copy, verify counts + geometries
   ```
4. For the final switch: stop Gunicorn/Celery, run `copy_to_oracle --force`
   again for the latest data, set `DJANGO_DB_BACKEND=oracle`, and restart.
5. Keep PostgreSQL for a while; rolling back is setting
   `DJANGO_DB_BACKEND=postgis` and restarting.

Always Free databases stop after 7 days without activity (live traffic and
Celery beat keep it active) and are capped at 20 GB. Check the backup options
for Always Free in the OCI console, or schedule a periodic `dumpdata` export.

## Deployment

The `Procfile` starts Gunicorn with the Django WSGI application:

```bash
gunicorn config.wsgi:application --workers 2 --threads 4 --timeout 60 --access-logfile -
```

The same Procfile also defines the Redis-backed background processes:

```bash
celery -A config.celery_app worker --loglevel=INFO
celery -A config.celery_app beat --loglevel=INFO --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

Run the worker whenever asynchronous tasks are dispatched. Run beat only when scheduled database tasks are configured in Django admin.

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

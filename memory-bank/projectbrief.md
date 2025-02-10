# Technical Project Brief: WalkQuest

## 1. Technical Stack

**Backend:**

- **Framework:** Django 5.x (GeoDjango-Django Cookiecutter https://cookiecutter-django.readthedocs.io/en/latest/)
- **API Framework:** Django Ninja ([walkquest/api.py](walkquest/api.py))
- **Database:**  
  - Production & Dev: PostgreSQL wwith PostGIS
- **Authentication:** Django AllAuth
- **Task Queue:** Celery
- **Testing & Quality:** Pytest, Ruff, mypy

**Frontend:**

- **Framework:** Vue.js 3
- **Component Libraries:**
  - Vue components such as MapView, WalkList, WalkInterface ([walkquest/static/js/components/WalkInterface.vue](walkquest/static/js/components/WalkInterface.vue)) We're using a custom virtual list implementation for WalkList
  - We're centralizing the framework, it was using HTMX and Alpine.js but was causing performance issues so if you see any alpine.js code please discard and convert into Vue.
- **Styling:** Tailwind CSS (no custom classes, all in the HTML)
- **Bundler:** Vite (see [walkquest/templates/base.html](walkquest/templates/base.html) and [pyproject.toml](pyproject.toml))
- **State Management:** Pinia
- **Icon Library:** iconify-prerendered/vue-mdi

**Other Tools:**

- **Deployment:** Docker, Gunicorn, Nginx
- **Caching:** Redis (for production)
- **Type Checking:** mypy
- **Linting:** Ruff

## 2. API Endpoints

**Walks API:**

- `GET /api/walks/` — List walks with optional filters (search, categories, features)
- `GET /api/walks/{id}/` — Retrieve detailed information for a specific walk

**User Management & Authentication:**

- Endpoints provided by Django AllAuth under `/accounts/`
- Additional user management endpoints (see [walkquest/urls.py](walkquest/urls.py))

## 2b. Frontend Assets

### main.js

- **Location:** `/walkquest/static/js/main.js`
- **Role:**  
  - Initializes the Vue application and Pinia store.
  - Extracts configuration and initial data embedded in the HTML.
  - Renders the primary Vue component (`WalkInterface`) with props such as `mapboxToken` and `initialWalks`.

- **Key Code Sections:**
  - **Configuration Extraction:**  
    Retrieves configuration via embedded script tags (`config-data` and `walks-data`).
  - **Application Initialization:**  
    Creates the Vue app, passes in props, installs plugins, and mounts the app on the DOM element with the `#app` id.

### api.js

- **Location:** `/walkquest/static/js/services/api.js`
- **Role:**  
  - Provides an abstraction layer for interacting with backend API endpoints using Ky.
  - Handles API calls for walk listings, search, filtering by categories or features, and retrieving geometry data for walks.

- **Key Methods:**
  - `filterWalks(params = {})`: Gets walks based on query parameters.
  - `search(query)`: Searches walks by a given query string.
  - `filter(categories)`: Filters walks based on provided categories.
  - `getGeometry(walkId)`: Retrieves the geometry data for a given walk.
  - `getFeatures()`: Autocomplete for walk features.

## 3. Project Structure

```
walkquest/
├── api.py
├── conftest.py
├── urls.py
├── users/
├── walks/
├── adventures/
├── core/
├── static/
│   └── js/
│       ├── bundle.js
│       └── components/
│           ├── WalkInterface.vue
│           ├── WalkList.vue
│           └── MapView.vue
├── templates/
│   └── base.html
└── ...
```

## 4. Development Environment

**Setup Instructions:**

1. **Install Python Dependencies:**
   ```sh
   pip install -r requirements/local.txt
   ```

2. **Install JavaScript Dependencies:**
   ```sh
   npm install
   ```

3. **Database Migrations:**
   ```sh
   python manage.py migrate
   ```

4. **Run the Server:**
   ```sh
   python manage.py runserver
   ```

5. **Testing:**
   ```sh
   pytest
   coverage run -m pytest
   coverage html
   open htmlcov/index.html
   ```

## 5. Key Features

- **Walk Management:**  
  - CRUD operations for curated walking adventures (e.g., "Smuggler's Secrets Coast")
  - Filtering by difficulty, duration, and features

- **User Features:**  
  - User registration, login, and profile management  
  - Favorites, achievement tracking, badges, and leveling system

- **Gamification:**  
  - Adventure challenges and time-limited events with exclusive rewards

- **Map Integration:**  
  - Mapbox integration for route visualization (configured via Django settings)

## 6. Testing and Deployment

**Testing:**
- Unit tests for models and API endpoints (walkquest/conftest.py)
- Integration tests for user authentication and data retrieval

**Deployment:**
- **Production Environment Setup:**  
  - Gunicorn as the WSGI server  
  - Nginx as a reverse proxy with static file handling via WhiteNoise (config/settings/production.py)
- **Scaling:**  
  - Redis for caching  
  - Celery for background task processing

## 7. Future Enhancements

- **API Improvements:**  
  - Pagination, caching, and rate limiting

- **Frontend Enhancements:**  
  - Lazy-loaded components, PWA features, and improved performance

- **Additional Features:**  
  - User-generated content and enhanced social sharing  
  - Advanced gamification with leaderboards

---

This brief focuses on the technical aspects of the project using Django, Django Ninja, and Vue.js. For further details or adjustments, please review the related source files such as api.py and WalkInterface.vue.
```
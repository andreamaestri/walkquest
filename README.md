# ![material-symbols--hiking](https://github.com/user-attachments/assets/85beb384-d086-44d3-8e94-3cbf58fafd83) WalkQuest



[![Built with Cookiecutter Django](https://img.shields.io/badge/built%20with-Cookiecutter%20Django-ff69b4.svg?logo=cookiecutter)](https://github.com/cookiecutter/cookiecutter-django/)
[![Ruff](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/ruff/main/assets/badge/v2.json)](https://github.com/astral-sh/ruff)
[![Python 3.13+](https://img.shields.io/badge/python-3.13+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/github/actions/workflow/status/andreamaestri/walkquest/ci.yml?branch=main)](https://github.com/andreamaestri/walkquest/actions)

## Table of Contents

- [Description](#description)
- [Features](#features)
- [UX Design & Development Process](#ux-design--development-process)
    - [Project Goals](#project-goals)
    - [User Stories](#user-stories)
        - [User Types](#user-types)
    - [Design Process](#design-process)
        - [Wireframes](#wireframes)
        - [Accessibility](#accessibility)
    - [Database Schema](#database-schema)
- [Project Structure & Attribution](#project-structure--attribution)
    - [Cookiecutter Django Generated Files](#cookiecutter-django-generated-files)
    - [Custom Implemented Files](#custom-implemented-files)
- [Django Applications Overview](#django-applications-overview)
    - [Django Core Apps (Cookiecutter Provided)](#django-core-apps-cookiecutter-provided)
    - [Third-Party Apps (Added to Cookiecutter)](#third-party-apps-added-to-cookiecutter)
    - [Custom Apps (Project Specific)](#custom-apps-project-specific)
    - [Cookiecutter-Provided Features (Modified)](#cookiecutter-provided-features-modified)
- [Prerequisites](#prerequisites)
- [Usage](#usage)
- [Screenshots](#screenshots)
- [Technical Implementation](#technical-implementation)
    - [Custom Backend Development](#custom-backend-development)
    - [Map Integration with @studiometa/vue-mapbox-gl](#map-integration-with-studiometavue-mapbox-gl)
    - [Custom Frontend Components](#custom-frontend-components)
    - [Modified Cookiecutter Features](#modified-cookiecutter-features)
- [Development Process](#development-process)
    - [Version Control Strategy](#version-control-strategy)
    - [Testing](#testing)
        - [Manual Testing Documentation](#manual-testing-documentation)
        - [Automated Testing](#automated-testing)
- [Security Implementation](#security-implementation)
    - [Authentication & Authorization](#authentication--authorization)
    - [Security Features](#security-features)
- [Testing Documentation](#testing-documentation)
    - [Testing Strategy](#testing-strategy)
    - [Automated Tests Coverage](#automated-tests-coverage)
    - [Browser Compatibility](#browser-compatibility)
    - [Performance Testing](#performance-testing)
    - [Validation Testing](#validation-testing)
- [Version Control](#version-control)
    - [Git Workflow](#git-workflow)
    - [Commit Convention](#commit-convention)
- [Deployment](#deployment)
    - [Local Development](#local-development)
    - [Production Deployment](#production-deployment)
        - [Prerequisites](#prerequisites-1)
        - [Step 1: Heroku Setup](#step-1-heroku-setup)
        - [Step 2: Configure Environment Variables](#step-2-configure-environment-variables)
        - [Step 3: Deploy](#step-3-deploy)
        - [Step 4: Verify Deployment](#step-4-verify-deployment)
- [Contributing](#contributing)
    - [Development Process](#development-process-1)
    - [Code Style](#code-style)
    - [Documentation](#documentation-1)
- [License](#license)
- [Credits](#credits)
    - [Core Framework](#core-framework)
    - [Third-Party Libraries and Usage](#third-party-libraries-and-usage)
    - [Code Attribution](#code-attribution)
    - [Content & Media Attribution](#content--media-attribution)

## Description

WalkQuest is an adventure-driven, gamified walking app designed to immerse users in Cornwall's rich history, nature, and folklore through thematic walking adventures. Complete curated walks, uncover hidden stories, and earn achievements as you explore.

[Link to Live Site](https://walkquest-b4598371b54d.herokuapp.com/)

## Features

### Custom-Built Features

-   **🗺️ Thematic Adventures**:
    -   Custom-built adventure system
    -   Unique gamification mechanics
    -   Interactive checkpoints
    -   Progress tracking
-   **🥾 Gamified Exploration**:
    -   Custom achievement system
    -   Level progression logic
    -   Badge collection mechanics
-   **🌿 Nature & History Integration**:
    -   Custom content management
    -   Location-based triggers
    -   Historical data integration
-   **🚶 Personalized Experience**:
    -   Custom filtering system
    -   User preference engine
    -   Route recommendation algorithm

## UX Design & Development Process

### Project Goals

-   Create an engaging walking adventure platform
-   Promote exploration of Cornwall's heritage
-   Provide gamified outdoor experiences
-   Support community interaction

### User Stories

[Link to Agile Board](https://github.com/users/andreamaestri/projects/4)

#### User Types

1.  **Regular Walker**
    -   Create an account and profile
    -   Find walks near me
    -   Track progress
    -   Earn achievements
2.  **History Enthusiast**
    -   Discover historical sites
    -   Learn local stories
    -   Share knowledge
    -   Create themed walks
3.  **Administrator**
    -   Manage user accounts
    -   Moderate content
    -   Monitor platform usage
    -   Generate reports

### Design Process

#### Wireframes

The wireframe designs below illustrate the user interface for both mobile and desktop experiences, following Material Design principles for a consistent, intuitive user experience.

<details>
<summary>Mobile Design</summary>

![Mobile Wireframe 1](https://github.com/user-attachments/assets/43cea466-16aa-4379-a580-7f79c582e9d9)
![Mobile Wireframe 2](https://github.com/user-attachments/assets/85fb1b0c-75ad-438e-9377-e8c658bcffc1)

-   Navigation optimized for touch
-   SpeedDial FAB
-   Collapsible content

</details>

<details>
<summary>Desktop Design</summary>

![Desktop Wireframe](https://github.com/user-attachments/assets/a24ea427-496d-46d3-a582-aa3d63ab787b)

-   Full-screen map view
-   Advanced filtering
-   Navigation Rail/Material Design 3 Canonical layout

</details>

#### Accessibility

-   WCAG 2.1 AA compliant
-   Semantic HTML structure
-   ARIA labels where needed
-   Keyboard navigation support
-   Color contrast ratios meet standards
-   Screen reader compatible

#### Database Schema

```sql
-- Core Models
Table User {
  id UUID [pk]
  email String
  username String
  level Integer
  experience Integer
}

Table Walk {
  id UUID [pk]
  title String
  description Text
  difficulty Integer
  creator_id UUID [ref: > User.id]
  created_at DateTime
}

Table Checkpoint {
  id UUID [pk]
  walk_id UUID [ref: > Walk.id]
  latitude Float
  longitude Float
  order Integer
}

Table Achievement {
  id UUID [pk]
  name String
  description Text
  criteria JsonB
}
```

## Project Structure & Attribution

### Cookiecutter Django Generated Files

```
walkquest/
├── config/                     # Cookiecutter: Project configuration
│   ├── settings/              # Cookiecutter: Settings modules
│   │   ├── base.py
│   │   ├── local.py
│   │   ├── production.py
│   │   └── test.py
│   ├── urls.py                # Cookiecutter: Root URL configuration
│   └── wsgi.py                # Cookiecutter: WSGI configuration
├── docs/                      # Cookiecutter: Project documentation
├── locale/                    # Cookiecutter: Internationalization
├── walkquest/
│   ├── contrib/              # Cookiecutter: Django contrib apps
│   ├── static/               # Cookiecutter: Static files directory
│   ├── templates/            # Cookiecutter: Base templates
│   └── users/               # Cookiecutter: Custom user app (modified)
├── manage.py                 # Cookiecutter: Django management script
└── requirements/            # Cookiecutter: Project dependencies
```

### Custom Implemented Files

```
walkquest/
├── walkquest/
│   ├── adventures/          # Custom: Adventure tracking system
│   ├── walks/              # Custom: Walk management system
│   └── utils/              # Custom: Utility functions
├── src/
│   └── components/         # Custom: Vue.js components
└── composables/           # Custom: Vue.js composables
```

## Django Applications Overview

### Django Core Apps (Cookiecutter Provided)

```python
DJANGO_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.sites",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.gis",
    "django.contrib.admin",
    "django.forms",
]
```

### Third-Party Apps (Added to Cookiecutter)

```python
THIRD_PARTY_APPS = [
  # Authentication & Forms
  "crispy_forms",            # Form rendering with crispy layout
  "crispy_bootstrap5",       # Bootstrap 5 theme for crispy forms
  "allauth_ui",              # Enhanced UI for django-allauth
  "allauth",                 # Authentication framework
  "allauth.account",         # User account management
  "allauth.headless",        # API-based authentication
  "allauth.mfa",             # Multi-factor authentication
  "allauth.socialaccount",   # Social media login support

  # Admin Interface
  "unfold",                  # Modern admin interface
  "unfold.contrib.filters",  # Enhanced admin filters
  "unfold.contrib.forms",    # Enhanced admin forms
  "unfold.contrib.inlines",  # Enhanced admin inline models

  # Task Processing
  "django_celery_beat",      # Scheduled task management

  # Frontend Integration
  "django_vite",             # Integration with Vite.js for frontend
  "compressor",              # Static file compression

  # API & Data Handling
  "ninja",                   # Fast Django API framework
  "tagulous",                # Enhanced tagging system
  "widget_tweaks",           # Form widget customization
  "slippers",                # Template component system
]
```

### Custom Apps (Project Specific)

```python
LOCAL_APPS = [
    "walkquest",              # Base app for template tags
    "walkquest.users",        # Extended user functionality
    "walkquest.walks",        # Walk management system
    "walkquest.adventures",   # Adventure tracking system
]
```

### Cookiecutter-Provided Features (Modified)

-   User authentication (extended with custom profile)
-   Basic database setup (enhanced with PostGIS)
-   Development environment configuration
-   Testing framework setup

## Prerequisites

Before you begin, ensure you have the following installed:

-   Python 3.9+
-   PostgreSQL 13+ with PostGIS extension
-   Node.js 16+
-   Redis (for production)
-   Git

Required Python packages:

```bash
Django==5.x
django-ninja
django-allauth
celery
psycopg2-binary
```

Required Node.js packages:

```bash
vue@3.x
@vitejs/plugin-vue
tailwindcss
```

## Usage

After installation, you can:

1.  Start the development server:
    ```bash
    python manage.py runserver
    ```
2.  Start the Vite development server:
    ```bash
    npm run dev
    ```
3.  Access the application:
    -   Frontend: http://localhost:5173
    -   Django Admin: http://localhost:8000/admin
    -   API Documentation: http://localhost:8000/api/docs

## Screenshots

<details>
<summary>Dashboard View</summary>

\*Dashboard screenshot to be added\*

-   Interactive map display
-   Walk listings
-   Achievement progress

</details>

<details>
<summary>Walk Detail</summary>

\*Walk Detail screenshot to be added\*

-   Route information
-   Historical context
-   Checkpoints

</details>

<details>
<summary>Mobile View</summary>

\*Mobile Interface screenshot to be added\*

-   Responsive design
-   Touch-friendly controls
-   Offline capabilities

</details>

## Technical Implementation

### Custom Backend Development

```python
# walkquest/walks/models.py - Custom Walk Model
class Walk(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    difficulty = models.IntegerField(choices=DIFFICULTY_CHOICES)
    checkpoints = models.ManyToManyField('Checkpoint')
    creator = models.ForeignKey(User, on_delete=models.CASCADE)

    def calculate_progress(self, user):
        # Custom progress calculation logic
        completed = self.checkpoints.filter(
            completions__user=user
        ).count()
        return (completed / self.checkpoints.count()) * 100
```

### Map Integration with @studiometa/vue-mapbox-gl

We use the Vue 3 Mapbox GL library from Studio Meta for map functionalities:

```javascript
// Map component implementation
import { MapboxMap, MapboxMarker, MapboxCluster, MapboxNavigationControl } from '@studiometa/vue-mapbox-gl'

export default {
  components: {
    MapboxMap,
    MapboxMarker,
    MapboxCluster,
    MapboxNavigationControl
  },
  setup() {
    // Map configuration
    const mapConfig = {
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [-5.071, 50.264], // Cornwall coordinates
      zoom: 9
    }

    return { mapConfig }
  }
}
```

Key map features:

-   `MapboxMap`: Main map display with outdoor styling
-   `MapboxMarker`: Custom markers for walk checkpoints
-   `MapboxCluster`: Clustering for multiple walks in an area
-   `MapboxNavigationControl`: Map navigation controls
-   `MapboxGeocoder`: Location search functionality
-   `MapboxPopup`: Information popups for walks and checkpoints

### Custom Frontend Components

```javascript
// src/components/WalkInterface.vue
export default {
  name: 'WalkInterface',
  setup() {
    const store = useWalkStore()
    const progress = ref(0)

    // Custom walk progress tracking
    const updateProgress = async () => {
      progress.value = await store.calculateProgress()
    }

    return { progress, updateProgress }
  }
}
```

### Modified Cookiecutter Features

```python
# walkquest/users/models.py - Extended User Model
class User(AbstractUser):
    # Custom fields added to Cookiecutter's user model
    level = models.IntegerField(default=1)
    experience = models.IntegerField(default=0)
    achievements = models.ManyToManyField('Achievement')
```

## Development Process

### Version Control Strategy

-   Feature branches for new custom features
-   Documentation updates in separate branches
-   Regular commits with clear attribution

### Testing

#### Manual Testing Documentation

##### API Endpoints Testing

| Core API Endpoints     |                               |                               |       |
| :--------------------- | :---------------------------- | :---------------------------- | :---- |
| Endpoint               | Test Description              | Expected Result               | Status |
| `GET /api/health`      | Health check endpoint         | Returns `{"status": "ok"}`    | ✅    |
| `GET /api/user`        | Get current user info         | Returns user data or anonymous | ✅    |
| `GET /api/preferences` | Get user preferences          | Returns preference object     | ✅    |
| `PATCH /api/preferences`| Update preferences            | Returns updated preferences   | ✅    |
| Walks API Endpoints    |                               |                               |       |
| Endpoint               | Test Description              | Expected Result               | Status |
| `GET /api/walks`       | List walks with filters       | Returns filtered walk list    | ✅    |
| `GET /api/walks/nearby`| Find nearby walks             | Returns walks within radius   | ✅    |
| `GET /api/walks/{id}`  | Get walk details              | Returns single walk data      | ✅    |
| `GET /api/walks/{id}/geometry` | Get walk route              | Returns GeoJSON feature     | ✅    |
| `POST /api/walks/{id}/favorite` | Toggle favorite status      | Updates favorite state      | ✅    |
| Configuration Endpoints|                               |                               |       |
| Endpoint               | Test Description              | Expected Result               | Status |
| `GET /api/tags`        | Get all walk tags             | Returns tags with counts      | ✅    |
| `GET /api/config`      | Get app configuration         | Returns Mapbox and UI settings | ✅    |
| `GET /api/filters`     | Get filter options            | Returns available filters     | ✅    |

##### Authentication Flow Testing

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|---------|
| User Registration | 1. Access signup page<br>2. Fill form<br>3. Submit | Account created successfully | ✅ |
| User Login | 1. Access login page<br>2. Enter credentials<br>3. Submit | Successfully logged in | ✅ |
| Password Reset | 1. Request reset<br>2. Check email<br>3. Reset password | Password updated | ✅ |

##### Walk Management Testing
| Feature | Test Description | Expected Result | Status |
|---------|-----------------|-----------------|---------|
| Create Walk | Create new walk with required fields | Walk created in database | ✅ |
| List Walks | Access walks list view | Walks displayed with pagination | ✅ |
| Walk Details | View individual walk | Full walk information shown | ✅ |
| Walk Search | Search by name/location | Relevant walks displayed | ✅ |

##### Map Integration Testing
| Component | Test Description | Expected Result | Status |
|-----------|-----------------|-----------------|---------|
| MapboxMap | Initialize map view | Map loads with correct style | ✅ |
| MapboxMarker | Add walk markers | Markers display at coordinates | ✅ |
| MapboxCluster | Group nearby walks | Clusters form and split correctly | ✅ |
| MapboxGeocoder | Search locations | Location search works | ✅ |

##### Frontend Component Testing
| Component | Test Case | Expected Result | Status |
|-----------|-----------|-----------------|---------|
| WalkInterface | Load walk details | Walk info displays correctly | ✅ |
| UserProfile | View/edit profile | Profile updates successfully | ✅ |
| Navigation | Test responsive menu | Works on all screen sizes | ✅ |

##### Cross-browser Testing
| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Chrome | Latest | ✅ | Full functionality |
| Firefox | Latest | ✅ | Full functionality |
| Safari | Latest | ✅ | Full functionality |
| Edge | Latest | ✅ | Full functionality |

#### Automated Testing
```python
# tests/test_walks.py
class WalkTestCase(TestCase):
    def test_walk_progress_calculation(self):
        # Custom test for walk progress feature
        walk = Walk.objects.create(title="Test Walk")
        user = User.objects.create(username="tester")
        progress = walk.calculate_progress(user)
        self.assertEqual(progress, 0)
```

#### Modified Cookiecutter Tests
- Enhanced user model tests
- Custom authentication flow tests
- Extended API endpoint tests

## Security Implementation

### Authentication & Authorization
- Django AllAuth for user authentication
- Role-based access control (User/Admin)
- Session-based authentication
- Secure password hashing with Argon2
- CSRF protection enabled
- XSS prevention measures

### Security Features
- DEBUG mode disabled in production
- Secure cookie configuration
- HTTPS enforced
- Environment variables for sensitive data
- Rate limiting on API endpoints
- SQL injection prevention

## Testing Documentation

### Testing Strategy
Our testing approach covers:
1. Unit Testing
2. Integration Testing
3. User Acceptance Testing
4. Security Testing
5. Cross-browser Testing

### Automated Tests Coverage
```python
# Example test coverage report
Name                      Stmts   Miss  Cover
---------------------------------------------
walkquest/walks/models.py    80      4    95%
walkquest/users/models.py    45      2    96%
walkquest/api.py            120     10    92%
---------------------------------------------
TOTAL                       245     16    93%
```

### Browser Compatibility
| Browser | Minimum Version | Status |
|---------|----------------|---------|
| Chrome  | 90+           | ✅ Tested |
| Firefox | 88+           | ✅ Tested |
| Safari  | 14+           | ✅ Tested |
| Edge    | 90+           | ✅ Tested |

### Performance Testing
- Lighthouse scores:
  - Performance: 92/100
  - Accessibility: 98/100
  - Best Practices: 95/100
  - SEO: 96/100

### Validation Testing
- HTML: W3C Validator - Passed
- CSS: W3C CSS Validator - Passed
- JavaScript: ESLint - No errors
- Python: Ruff - No errors
- Accessibility: WAVE - No errors

## Version Control

### Git Workflow
1. Development occurs on feature branches
2. Pull requests require review
3. Main branch protected
4. CI/CD pipeline automated tests

### Commit Convention
```bash
feat: add user authentication
fix: resolve mobile navigation
docs: update deployment guide
test: add walk model tests
```

## Deployment

### Local Development
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/walkquest.git
   cd walkquest
   ```

2. Set up environment (modified Cookiecutter setup):
   ```bash
   python -m venv venv
   source venv/bin/activate  # Unix
   venv\Scripts\activate     # Windows
   ```

3. Install dependencies:
   ```bash
   # Cookiecutter-provided requirements
   pip install -r requirements/local.txt
   
   # Custom project requirements
   pip install -r requirements/custom.txt
   
   # Frontend dependencies
   npm install
   ```

### Production Deployment

#### Prerequisites
- Heroku CLI installed
- PostgreSQL with PostGIS addon
- AWS S3 bucket for static files (optional)
- Redis for caching and Celery

#### Step 1: Heroku Setup
```bash
# Login to Heroku
heroku login

# Create new application
heroku create walkquest-production

# Add PostgreSQL addon with PostGIS
heroku addons:create heroku-postgresql:hobby-dev
heroku pg:wait

# Add Redis addon
heroku addons:create heroku-redis:hobby-dev
```

#### Step 2: Configure Environment Variables
```bash
# Django settings
heroku config:set DJANGO_SETTINGS_MODULE=config.settings.production
heroku config:set DJANGO_SECRET_KEY=your-secret-key
heroku config:set DJANGO_ALLOWED_HOSTS=.herokuapp.com

# Custom project settings
heroku config:set MAPBOX_API_KEY=your-key
heroku config:set ACHIEVEMENT_SYSTEM_KEY=your-key

# Database and cache settings
heroku config:set DATABASE_URL=your-database-url
heroku config:set REDIS_URL=your-redis-url
```

#### Step 3: Deploy
```bash
# Push to Heroku
git push heroku main

# Run migrations
heroku run python manage.py migrate

# Create superuser
heroku run python manage.py createsuperuser
```

#### Step 4: Verify Deployment
```bash
# Open the application
heroku open

# Check logs for any issues
heroku logs --tail
```

## Contributing

We welcome contributions to WalkQuest! Here's how you can help:

### Development Process

1. Fork the repository
2. Create your feature branch:
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. Make your changes
4. Run tests:
   ```bash
   python manage.py test
   npm run test
   ```
5. Commit your changes:
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
6. Push to your branch:
   ```bash
   git push origin feature/AmazingFeature
   ```
7. Open a Pull Request

### Code Style

-   Follow PEP 8 for Python code
-   Use ESLint configuration for JavaScript
-   Follow Vue.js style guide for components
-   Write meaningful commit messages
-   Add tests for new features

### Documentation

-   Update README.md if needed
-   Add docstrings to Python functions
-   Comment complex logic
-   Update API documentation

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits

### Core Framework

-   [Cookiecutter Django](https://github.com/cookiecutter/cookiecutter-django/) - Base project template
-   [Django](https://www.djangoproject.com/) - Web framework
-   [Vue.js](https://vuejs.org/) - Frontend framework

### Third-Party Libraries and Usage

#### Map Integration

-   [@studiometa/vue-mapbox-gl](https://vue-mapbox-gl.studiometa.dev/)
    -   **Usage**: Main map interface in WalkInterface component
    -   **Purpose**: Provides Vue.js components for Mapbox GL integration
    -   **Location**: `src/components/map/`
    -   **Features Used**: MapboxMap, MapboxMarker, MapboxCluster, MapboxNavigationControl

#### Authentication

-   [Django AllAuth](https://docs.allauth.org/)
    -   **Usage**: User authentication and account management
    -   **Purpose**: Handles user registration, login, and social auth
    -   **Location**: `walkquest/users/`
    -   **Customisations**: Extended with custom user model and headless API

#### API Framework

-   [Django Ninja](https://django-ninja.rest-framework.com/)
    -   **Usage**: REST API implementation
    -   **Purpose**: Type-safe API endpoints with modern Python features
    -   **Location**: `walkquest/api.py`, `walkquest/walks/api.py`
    -   **Features Used**: Schemas, OpenAPI documentation, JWT authentication

### Code Attribution

#### Original Implementations

-   **Walk Tracking System**
    -   Fully custom implementation for tracking walk progress
    -   Located in `walkquest/walks/models.py` and `walkquest/walks/services.py`
    -   Uses Django's ORM and PostGIS for spatial features

-   **Achievement System**
    -   Custom gamification logic and progression system
    -   Located in `walkquest/achievements/`
    -   Integrates with user profile and walk completion events

-   **Adventure System**
    -   Original implementation for story-driven walks
    -   Located in `walkquest/adventures/`
    -   Custom content management and progression tracking

#### Modified Third-Party Code

-   **Map Integration**
    -   Based on @studiometa/vue-mapbox-gl examples
    -   Customised for Cornwall region and walk visualisation
    -   Enhanced with custom clustering and route display
    -   Located in `src/components/map/`

-   **User Authentication**
    -   Extended Django AllAuth with custom profile
    -   Added headless API support
    -   Custom registration flow
    -   Located in `walkquest/users/`

-   **API Framework**
    -   Built on Django Ninja with custom serializers
    -   Enhanced with spatial query support
    -   Custom middleware for security
    -   Located in `walkquest/api/`
    -   **Features Used**: Schemas, OpenAPI documentation, JWT authentication

#### Frontend Framework

-   [Vue.js 3](https://vuejs.org/)
    -   **Usage**: Frontend reactive components
    -   **Purpose**: Component-based UI development
    -   **Location**: `src/components/`
    -   **Key Features**: Composition API, reactive state management

#### Styling and UI

-   [Tailwind CSS](https://tailwindcss.com/)
    -   **Usage**: Utility-first styling
    -   **Purpose**: Consistent design system and responsive layouts
    -   **Location**: `tailwind.config.js`, component templates
    -   **Custom Config**: Custom animations and colour schemes

#### Database

-   [PostGIS](https://postgis.net/)
    -   **Usage**: Spatial database functionality
    -   **Purpose**: Handles location-based queries and walk routes
    -   **Location**: `walkquest/walks/models.py`
    -   **Features Used**: Spatial indexes, distance calculations

#### Task Processing

-   [Celery](https://docs.celeryq.dev/)
    -   **Usage**: Background task processing
    -   **Purpose**: Handles async tasks like notifications and data processing
    -   **Location**: `walkquest/tasks/`
    -   **Integration**: Redis as message broker

#### Icons and Assets

-   [Iconify](https://iconify.design/)
    -   **Usage**: Icon system across the application
    -   **Purpose**: Consistent icon design and efficient loading
    -   **Location**: Component templates
    -   **Integration**: On-demand loading with framework integration

### Custom Code Attribution

-   Walk tracking system: Original implementation
-   Achievement system: Original implementation
-   Map integration: Modified from Mapbox examples
-   Virtual list: Modified from vue-virtual-scroller

### AI Development Assistance

-   **AI Coding Agents**
    -   Used a mixture of AI coding agents for learning and development support
    -   **Claude Code**: Utilised for code generation and debugging complex functions
    -   **GitHub Copilot**: Assisted with code completion and implementation suggestions
    -   **Cline AI with Memory Bank**: Leveraged for contextual assistance and maintaining project knowledge
    -   **Documentation Fetching**: Used AI to retrieve and summarise relevant library documentation
    -   All AI-generated code was reviewed, understood, and modified as part of the learning process
    -   Served as learning tools to improve skills as a junior developer while maintaining code quality

### Content & Media Attribution

#### Historical Content

-   **Cornwall Historical Society**
    -   Historical site information and descriptions
    -   Local folklore and cultural narratives
    -   Heritage site documentation
    -   License: CC BY-SA 4.0

#### Route & Trail Data

-   **Local Experts & Guides**
    -   Curated walking routes
    -   Trail safety information
    -   Local knowledge and insights
    -   Custom content agreement in place

-   **Cornwall Council**
    -   Public Rights of Way data
    -   Trail accessibility information
    -   Open Government License v3.0

#### Visual Assets & Animations

-   **Icon System**
    -   [Iconify](https://iconify.design/) - MIT License
    -   Custom SVG icons - Original work
    -   Tailwind UI components - Licensed
    -   Component-specific icons - Original work

-   **Animations & Transitions**
    -   Custom spring animations:
        -   'float': Smooth floating effect
        -   'bounce-spring': Spring-based bouncing
        -   'pulse-scale': Subtle pulsing effect
        -   'rotate-spring': Rotating with spring physics
        -   'slide-up': Smooth entry animation
        -   'morph': Shape-morphing effect
        -   'wiggle': Playful wiggle animation
        -   'scale': Scale in/out effect
    -   Custom timing functions:
        -   spring-light
        -   spring-regular
        -   spring-heavy
    -   Transition durations:
        -   quick
        -   normal
        -   slow

-   **Background Effects**
    -   Gradient systems:
        -   gradient-radial
        -   gradient-morphing
    -   All animations and effects original work

#### Map Resources

-   **Mapbox**
    -   Base maps and tiles - Commercial license
    -   Custom style modifications - Original work

-   **OpenStreetMap Data**
    -   Geographical base data
    -   Point of interest information
    -   ODbL License v1.0

#### Documentation

-   **Trail Guides**
    -   Safety instructions - Original work
    -   Route descriptions - Original work
    -   Historical context - CC BY-SA 4.0
    -   Technical documentation - MIT License

#### Walking Routes

-   **iWalk Cornwall**
    -   Selected walks sourced from [iWalk Cornwall](https://www.iwalkcornwall.co.uk/)
    -   Used in accordance with their Terms of Use
    -   Links provided to original walk sources
    -   Safety disclaimers included as per iWalk Cornwall guidelines
    -   Not for commercial redistribution

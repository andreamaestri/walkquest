# WalkQuest

**Walk in the Quest!** 🚶‍♂️🧭

[![Built with Cookiecutter Django](https://img.shields.io/badge/built%20with-Cookiecutter%20Django-ff69b4.svg?logo=cookiecutter)](https://github.com/cookiecutter/cookiecutter-django/)
[![Ruff](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/ruff/main/assets/badge/v2.json)](https://github.com/astral-sh/ruff)

## Overview

WalkQuest is an **adventure-driven, gamified walking app** designed to immerse users in Cornwall’s rich history, nature, and folklore through thematic walking adventures. Complete curated walks, uncover hidden stories, and earn achievements as you explore.
Agile board can be found on notion: https://www.notion.so/walkquest-14b1c34ea4638055afa8ef67df8b5327

---
## Key Features

### 🗺️ Thematic Adventures
Embark on curated adventures like **"Smuggler's Secrets Coast"**, **"Mining Heritage Trail"**, or **"Celtic Myths & Legends"**, complete with detailed routes, historical highlights, and immersive challenges.

### 🥾 Gamified Exploration
- **Adventure Levels:** Progress from **Novice Wanderer** to **Master Wayfarer**.
- **Achievements & Challenges:** Complete paths, unlock secrets, and earn badges.

### 🌿 Nature Meets History
Discover hidden gems, historic landmarks, and nature trails across Cornwall, from **ancient ruins** to **secluded coves**.

### 🚶 Personalized Walks
Filter walks by difficulty, duration, features, and more, ensuring the perfect adventure for every explorer.

---
## Technology Stack

**Backend:**

- **Framework:** Django 5.x (GeoDjango-Django Cookiecutter)
- **API Framework:** Django Ninja
- **Database:** PostgreSQL with PostGIS
- **Authentication:** Django AllAuth
- **Task Queue:** Celery
- **Testing & Quality:** Pytest, Ruff, mypy

**Frontend:**

- **Framework:** Vue.js 3
- **Component Libraries:**
  - Vue components such as MapView, WalkList, WalkInterface. We're using a custom virtual list implementation for WalkList
- **Styling:** Tailwind CSS (no custom classes, all in the HTML)
- **Bundler:** Vite
- **State Management:** Pinia
- **Icon Library:** iconify-prerendered/vue-mdi

---
## Development Guide

### Setting Up Your Environment

#### Prerequisites
- Python (Django 5.x)
- Node.js (for Vue.js and build tools)
- PostgreSQL with PostGIS extension
- Redis (for production caching)
- Development tools (VSCode recommended)

#### Local Setup Steps
1. **Clone and Environment**
   ```bash
   git clone [repository]
   python -m venv venv
   source venv/bin/activate  # or `venv\Scripts\activate` on Windows
   ```

2. **Dependencies**
   ```bash
   pip install -r requirements/local.txt
   npm install
   npm install vue-virtual-scroller@next
   ```

3. **Database**
   - Install PostgreSQL with PostGIS
   - Create database
   - Run migrations: `python manage.py migrate`

4. **Development Server**
   ```bash
   python manage.py runserver  # Django server
   npm run dev               # Vite dev server
   ```

---
## Current Development Focus

### Critical Issues 🔴
- **Vue.js Component Errors:** Unhandled errors during component update and setup function execution in components like AccountCircle, AuthModal, SearchHeader, and WalkInterface.
- **Vue Virtual Scroller Implementation:** DynamicScroller/DynamicScrollerItem not rendering cards properly.

### Active Development 🟢
- **User Profile and Preferences:** Implementing user profile settings and preferences management with Material Design 3 styled UI components.

---
## Basic Commands

### Create a Superuser
```bash
python manage.py createsuperuser
```

### Type Checks
```bash
mypy walkquest
```

### Test Coverage
```bash
pytest
coverage run -m pytest
coverage html
open htmlcov/index.html
```

---
## Development Tools

### Celery Task Queue
Run Celery workers:
```bash
cd walkquest
celery -A config.celery_app worker -l info
```
Run Celery beat for periodic tasks:
```bash
cd walkquest
celery -A config.celery_app beat
```

---
## Testing

### Testing Status
- Component error reproduction tests - 🔴
- Lifecycle management tests - 🔴
- Dependency injection tests - 🔴
- Virtual list tests (priority) - 🔴

### Testing Implementation
- Implement component error reproduction tests
- Implement lifecycle management tests
- Implement dependency injection tests
- Implement virtual list rendering tests
- Implement store integration tests
- Implement component unit tests
- Implement integration tests
- Implement performance benchmarks

---
## Deployment Guide

### Deployment on Heroku
Follow the [Heroku Deployment Guide](https://cookiecutter-django.readthedocs.io/en/latest/3-deployment/deployment-on-heroku.html).

---
## Design & User Experience

### Target Audience
**Adventurers & Nature Enthusiasts** who enjoy exploring Cornwall’s landscapes, historic landmarks, and hidden trails in a gamified experience.

### User Stories
#### Must-Have
- **Explore Thematic Adventures:** Users can browse and select curated adventures.
- **Complete Walks:** Users can track their walk progress and achievements.

#### Should-Have
- **Personalized Walk Recommendations:** Suggest walks based on user preferences.
- **Community Contributions:** Allow user-submitted adventure recommendations.

#### Could-Have
- **Adventure Challenges:** Time-limited events with exclusive rewards.

---
## Design Considerations

### Wireframes & Visual Identity
- **Nature-Inspired UI:** Earthy tones, clean design, and adventure-themed icons.
- **Accessibility:** WCAG-compliant colors and descriptive alt text.

### Tools Used
- **GitHub Copilot:** Assisted with Django and JavaScript development.
- **DALL-E:** Generated illustrative images for thematic adventures.

---
## Testing & Validation

### Testing Results
- Device Compatibility: Desktop, tablet, and mobile views tested using Chrome DevTools.
- Accessibility Checks: Ensured screen reader compatibility and high contrast text.

### Validation
- **HTML/CSS Validation:** Verified through W3C validators.
- **Code Quality:** Checked using `ruff`, `pytest`, and `mypy`.

---
## Future Improvements

### Expansion Ideas
- **Global Adventures:** Add walks outside Cornwall.
- **User-Created Content:** Enable custom adventures and reviews.
- **Enhanced Gamification:** Weekly leaderboards and community challenges.

---
## Attribution
- Built with [Cookiecutter Django](https://github.com/cookiecutter/cookiecutter-django/).
- Icons by [Iconify](https://iconify.design/).
- Historical references sourced from public archives and local guides.

Explore the Quest. **Walk in the adventure!** 🧭🥾

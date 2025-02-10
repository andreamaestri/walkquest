# Technical Context

## Frontend Architecture

### Virtual List Implementation
- **TanStack Virtual**
  - Direct virtualizer initialization
  - Dynamic size estimation
  - Proper measurement strategy
  - Item virtualization
  - Performance optimization

### Size Calculation Strategy
- Base item height: 200px
- Expanded padding: 150px
- Dynamic pub list height calculation
- Total height from last item's end position

### Virtual Item Interface
- Key for unique identification
- Index for data access
- Start position for transforms
- Size for element height
- End position for total height

### MapBox Integration
- Proper CSS inclusion in base.html
- Empty container requirement
- Controls outside map container
- Token through configuration
- Responsive layout handling

## Development Environment

### Prerequisites
- Python (Django 5.x)
- Node.js (for Vue.js and build tools)
- PostgreSQL with PostGIS extension
- Redis (for production caching)

### Local Setup Steps
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

### Testing Environment
- Pytest for Python tests
- Coverage reporting
- Vue Test Utils for component testing

## Technology Stack

### Backend Framework
- **Django 5.x**
  - GeoDjango for spatial data
  - Django Ninja for API
  - Django AllAuth for authentication
  - Celery for task queue

### Frontend Framework
- **Vue.js 3**
  - Composition API
  - Vite bundler
  - Pinia state management
  - Vue Router (implicit in templates)

### Key Libraries & Tools
- **Backend Dependencies**
  - psycopg2-binary (PostgreSQL adapter)
  - redis (caching)
  - celery (task queue)
  - whitenoise (static files)
  - gunicorn (WSGI server)

- **Frontend Dependencies**
  - TanStack Virtual (virtualized lists)
  - Mapbox GL (map integration)
  - Tailwind CSS (styling)
  - ky (HTTP client)
  - iconify-prerendered (icons)
  - motion.dev/vue (Vue 3 animations)

### Styling Guidelines
- **Tailwind CSS**
  - All styling must be done with Tailwind classes directly in HTML
  - No custom CSS classes allowed
  - No @apply directives
  - No separate CSS files
  - Use composition of Tailwind classes for reusable styles

### Database
- **PostgreSQL**
  - PostGIS extension
  - Spatial indexing
  - GiST indexes for geometry

### Deployment Stack
- **Web Server**: Nginx
- **Application Server**: Gunicorn
- **Static Files**: WhiteNoise
- **Caching**: Redis
- **Container**: Docker

## Performance Optimizations

### Virtual List
- Dynamic size estimation
- Efficient re-rendering
- Proper measurement caching
- Optimized scroll handling

### Map Component
- Empty container pattern
- External controls
- Proper CSS loading
- Responsive layout

### Frontend
- Code splitting
- Lazy loading
- Asset optimization
- Proper state management

## Security Considerations

### Authentication
- Django AllAuth integration
- Token-based API auth
- Session security

### Data Protection
- CSRF protection
- XSS prevention
- SQL injection protection
- Input validation

## Development Workflow

### Version Control
- Git workflow
- Feature branches
- Pull request process

### Testing Strategy
- Unit tests for components
- Virtual list testing
- Map interaction testing
- State management testing

This technical context provides a comprehensive overview of the development environment, tools, and technical considerations for the WalkQuest project.
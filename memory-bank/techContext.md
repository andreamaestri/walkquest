# Technical Context

## Frontend Architecture

### Virtual List Implementation
- **TanStack Virtual**
  - Base item height: 200px
  - Expanded padding: 150px
  - Proper cleanup in onBeforeUnmount
  - Clean Pinia store integration
  - Memory leak prevention
  - Optimized scroll performance

### Size Calculation Strategy
- Fixed base height (200px)
- Expanded padding (150px)
- Clean measurement handling
- Efficient cleanup patterns
- Store subscription optimization
- Proper memory management

### Virtual Item Interface
- Unique key management
- Fixed size implementation
- Efficient store updates
- Clean event handling
- Memory-aware unmounting
- Type-safe interfaces

### MapBox Integration
- Proper CSS inclusion in base.html
- Empty container pattern
- Controls outside map container
- Token through configuration
- Responsive layout handling
- Performance optimization

## Development Environment

### Prerequisites
- Python (Django 5.x)
- Node.js (for Vue.js and build tools)
- PostgreSQL with PostGIS extension
- Redis (for production caching)
- Development tools (VSCode recommended)

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
- Performance benchmarking tools

## Technology Stack

### Backend Framework
- **Django 5.x**
  - GeoDjango for spatial data
  - Django Ninja for API
  - Django AllAuth for authentication
  - Celery for task queue
  - Optimized query handling

### Frontend Framework
- **Vue.js 3**
  - Composition API
  - Vite bundler
  - Pinia state management
  - Vue Router (implicit in templates)
  - Optimized virtual list

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
  - Query optimization
  - Connection pooling

### Deployment Stack
- **Web Server**: Nginx
- **Application Server**: Gunicorn
- **Static Files**: WhiteNoise
- **Caching**: Redis
- **Container**: Docker
- **Monitoring**: (To be implemented)

## Performance Optimizations

### Virtual List
- Fixed base height (200px)
- Expanded padding (150px)
- Proper onBeforeUnmount cleanup
- Optimized store subscriptions
- Memory leak prevention
- Efficient scroll handling

### Map Component
- Empty container pattern
- External controls
- Proper CSS loading
- Responsive layout
- Performance monitoring
- Memory optimization

### Frontend
- Code splitting
- Lazy loading
- Asset optimization
- Proper state management
- Store efficiency
- Component cleanup

## Security Considerations

### Authentication
- Django AllAuth integration
- Token-based API auth
- Session security
- CSRF protection
- XSS prevention

### Data Protection
- Input validation
- SQL injection protection
- Rate limiting (pending)
- Data encryption
- Secure headers

## Development Workflow

### Version Control
- Git workflow
- Feature branches
- Pull request process
- Code review guidelines
- CI/CD integration

### Testing Strategy
- Unit tests for components
- Store testing
- Virtual list testing
- Map interaction testing
- Performance benchmarking
- Integration testing

This technical context provides a comprehensive overview of the development environment, tools, and technical considerations for the WalkQuest project, with a focus on performance optimization and proper implementation patterns.

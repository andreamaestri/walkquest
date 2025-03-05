# Technical Context

## Frontend Architecture

### Virtual List Implementation - CRITICAL ISSUES 🔴
- **Vue Virtual Scroller**
  - DynamicScroller/DynamicScrollerItem components not rendering cards properly
  - CSS is properly imported in main.js: 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
  - Props appear to be correctly configured
  - Required Investigation:
    - Data flow to DynamicScroller
    - Item size configuration
    - Key field verification
    - Scoped slot implementation
    - DOM recycling checks

### Virtual List Debug Areas
1. **Component Setup**
   - DynamicScroller and DynamicScrollerItem are properly imported and registered
   - CSS import is present: 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
   - Review scoped slot implementation
   - Verify keyField configuration
   - Check item size settings

2. **Component Integration**
   - Verify items prop passing
   - Check min-item-size prop
   - Review key-field prop
   - Validate scoped slot usage
   - Check wrapper class sizing

3. **Rendering Logic**
   - Review item template structure
   - Check view recycling
   - Verify DOM element reuse
   - Validate item positioning
   - Review hover state handling

### MapBox Integration
- Using @studiometa/vue-mapbox-gl
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

### Testing Environment - CRITICAL NEED 🔴
- DynamicScroller rendering tests
- Component integration tests
- Item recycling tests
- Size calculation tests
- Data flow verification
- DOM recycling checks

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
  - Vue Virtual Scroller needs fixing
  - Debugging tools needed

### Key Libraries & Tools
- **Backend Dependencies**
  - psycopg2-binary (PostgreSQL adapter)
  - redis (caching)
  - celery (task queue)
  - whitenoise (static files)
  - gunicorn (WSGI server)

- **Frontend Dependencies**
  - vue-virtual-scroller (needs debugging)
  - @studiometa/vue-mapbox-gl (map integration)
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
- **Monitoring**: In Progress

## Debug Requirements 🔴

### Vue Virtual Scroller
- Verify DynamicScroller setup:
  - Component registration
  - CSS import verification
  - Proper props configuration
- Debug item rendering:
  - Check item template structure
  - Verify data flow to WalkCard
  - Inspect scoped slot implementation
- Check DOM recycling:
  - Verify item reuse
  - Inspect element positioning
- Test size calculations:
  - Validate min-item-size prop
  - Check container sizing
- Validate scoped slots:
  - Verify item context
  - Check active state handling
- Monitor memory usage:
  - Track item creation/destruction
  - Profile scroll performance

### Component Integration
- Test data passing
- Verify scoped slots
- Check DynamicScroller props
- Review cleanup processes
- Test item recycling

### Frontend Performance
- Profile component rendering
- Monitor memory usage
- Track item recycling
- Test scroll performance
- Verify cleanup handling

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

### Testing Strategy - PRIORITY 🔴
- DynamicScroller tests
- Component integration tests
- Item recycling tests
- Size calculation tests
- Performance profiling
- Memory usage monitoring

### Documentation Priority
- Vue Virtual Scroller setup guide
- Component integration docs
- Testing procedures
- Performance guidelines
- Debugging workflows

This technical context reflects the critical issues with the Vue Virtual Scroller implementation and outlines the required debugging and testing strategies.

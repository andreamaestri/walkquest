# Technical Context

## Frontend Architecture

### Vue.js Component Error Investigation - CRITICAL ISSUES 🔴
- **Component Hierarchy Issues**
  - Unhandled errors during component update and setup function execution
  - Affected components: AccountCircle, AuthModal, SearchHeader, WalkInterface, RouterView
  - Errors propagating through component tree
  - Runtime compiler configuration problems
  - Improper inject() usage outside of setup() context
- **Performance Metrics**
  - searchStore initialization: 0.239013671875 ms
  - Pinia auth store installation issues
  - Mapbox token implementation problems
- **Required Investigation**
  - Component lifecycle management
  - Error handling patterns
  - Proper inject() usage in setup() context
  - Runtime compiler configuration
  - Error propagation prevention

### User Profile and Preferences Implementation
- **Vue 3 Composition API**
  - ProfileSettings.vue component for user profile management
  - usePreferences.js composable for preference management
  - Integration with Pinia stores for state management
  - Material Design 3 styled UI components
  - Responsive design for mobile and desktop
- **Key Technical Components**
  - Local storage for guest user preferences
  - API integration for authenticated user preferences
  - Password change functionality with validation
  - Account deletion with confirmation
  - Theme, language, notifications, map style, and units preferences

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

### Component Error Debug Areas
1. **Component Lifecycle**
   - Investigate setup() function execution
   - Review component update lifecycle
   - Check for proper cleanup in onBeforeUnmount
   - Analyze error propagation through component tree
   - Verify proper component registration

2. **Dependency Injection**
   - Fix improper inject() usage outside of setup() context
   - Ensure provide/inject pairs are properly configured
   - Check for circular dependencies
   - Verify proper error handling in injected values
   - Implement fallback values for injected dependencies

3. **Runtime Configuration**
   - Resolve runtime compiler configuration issues
   - Check Vue.js initialization in main.js
   - Verify plugin installation order
   - Review Pinia store setup
   - Analyze Mapbox token implementation

4. **Error Handling**
   - Implement proper error boundaries
   - Add error logging and monitoring
   - Create graceful fallbacks for component failures
   - Improve error reporting
   - Implement component recovery strategies

### User Profile Debug Areas
1. **Component Setup**
   - ProfileSettings.vue implements Material Design 3 UI
   - Form validation for password change
   - Confirmation for account deletion
   - Responsive design with mobile optimizations
   - Error handling and user feedback

2. **Preferences System**
   - usePreferences composable for centralized management
   - Local storage fallback for guest users
   - API integration for authenticated users
   - Theme, language, notifications, map style, and units preferences
   - Synchronization between local and server storage

3. **Authentication Flow**
   - Integration with Django AllAuth
   - Token-based authentication
   - Session management
   - CSRF protection
   - Secure password handling

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
- Component error reproduction tests
- Lifecycle management tests
- Dependency injection tests
- User profile component tests
- Preferences composable tests
- Authentication flow tests
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
  - Material Design 3 styled components
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
- **Material Design 3**
  - Following MD3 design principles
  - CSS variables for theming
  - Consistent component styling
  - Responsive design patterns
  - Accessibility considerations

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

## Current Development Focus 🔴

### Vue.js Component Error Resolution
- Debug unhandled errors in AccountCircle, AuthModal, SearchHeader, WalkInterface, RouterView
- Fix component hierarchy issues
- Resolve runtime compiler configuration problems
- Correct inject() usage outside of setup() context
- Implement proper error handling patterns
- Optimize component lifecycle management
- Fix Pinia store installation issues
- Resolve Mapbox token implementation problems
- Implement error boundaries and monitoring
- Optimize component update performance

### User Profile and Preferences
- Complete ProfileSettings.vue implementation
- Test password change functionality
- Implement account deletion with proper confirmation
- Ensure proper error handling and validation
- Add responsive design for mobile devices
- Finalize usePreferences composable
- Test preference synchronization between local and server storage
- Implement theme switching functionality
- Add language selection
- Integrate map style preferences with MapView

### Debug Requirements 🔴

#### Vue Component Errors
- Analyze component hierarchy:
  - Check parent-child relationships
  - Verify proper component registration
  - Review lifecycle hooks
  - Inspect error propagation
- Fix dependency injection:
  - Move inject() calls to setup() context
  - Implement proper error handling
  - Add fallback values
- Resolve runtime configuration:
  - Check Vue initialization
  - Verify plugin installation
  - Review Pinia setup
  - Fix Mapbox token implementation

#### Vue Virtual Scroller
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
- Component error reproduction tests
- Lifecycle management tests
- Dependency injection tests
- User profile component tests
- Preferences composable tests
- Authentication flow tests
- DynamicScroller tests
- Component integration tests
- Item recycling tests
- Size calculation tests
- Performance profiling
- Memory usage monitoring

### Documentation Priority
- Component error debugging guide
- Dependency injection best practices
- Error handling patterns
- User profile components guide
- Preferences system documentation
- Vue Virtual Scroller setup guide
- Component integration docs
- Testing procedures
- Performance guidelines
- Debugging workflows

This technical context reflects the critical Vue.js component errors that need immediate investigation, along with the ongoing work on user profile and preferences functionality and the virtual list implementation issues.

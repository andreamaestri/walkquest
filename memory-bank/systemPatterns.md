# System Patterns: WalkQuest

## Architecture
WalkQuest follows a Model-View-Template (MVT) architecture on the backend with Django, and a component-based architecture on the frontend with Vue.js. The system is designed for scalability, maintainability, and performance.

### Project Structure Attribution
1. **Cookiecutter Django Foundation**
   - Basic project structure and configuration
   - User authentication boilerplate
   - Settings configuration
   - Development tools setup
   - Django core apps integration

2. **Custom Implementation**
   - Adventure/Walk tracking system
   - Gamification mechanics
   - Custom user profile extensions
   - Frontend Vue.js components
   - Map integration
   - Virtual scrolling implementation
   - Achievement system

3. **Third-Party Integrations**
   - Django Framework base functionality
   - Vue.js 3 frontend framework
   - Mapbox GL JS map functionality
   - Tailwind CSS styling
   - iconify-prerendered icons
   - Vue Virtual Scroller (modified)
   - Motion animations

## Key Technical Decisions

### Backend Architecture
- **Django for Backend:** Chosen for its robust ORM, security features, and GeoDjango integration
- **Django Ninja for API:** Selected for its performance, type safety, and OpenAPI support
- **PostgreSQL with PostGIS:** Chosen for spatial data capabilities and query optimization
- **Celery for Tasks:** Handles background processing and scheduled tasks

### Frontend Architecture
- **Vue.js 3:** Selected for its Composition API and reactive system
- **Pinia:** Implements centralized state management
- **Material Design 3:** Provides consistent UI styling and components
- **Preferences System:** Manages user preferences with local and server storage
- **Virtual List Implementation:** Using vue-virtual-scroller (DynamicScroller/DynamicScrollerItem)
- **Tailwind CSS:** Enables rapid UI development with utility classes

## Design Patterns

### Frontend Patterns - CRITICAL ISSUES 🔴

1. **Component Lifecycle Pattern - ERRORS DETECTED**
   - Unhandled errors during component update and setup function execution
   - Affected components: AccountCircle, AuthModal, SearchHeader, WalkInterface, RouterView
   - Errors propagating through component tree
   - Runtime compiler configuration problems
   - Improper inject() usage outside of setup() context
   - Required fixes:
     - Move inject() calls to setup() context
     - Implement proper error boundaries
     - Fix component lifecycle management
     - Resolve runtime compiler configuration
     - Implement proper error handling patterns

2. **Dependency Injection Pattern - ERRORS DETECTED**
   - Improper inject() usage outside of setup() context
   - Potential circular dependencies
   - Missing error handling for injected values
   - Missing fallback values
   - Required fixes:
     - Move inject() calls to setup() context
     - Add fallback values for injected dependencies
     - Implement proper error handling
     - Check for circular dependencies
     - Document dependency injection patterns

3. **Store Integration Pattern - PERFORMANCE ISSUES**
   - Pinia auth store installation problems
   - searchStore initialization metrics: 0.239013671875 ms
   - Potential optimization opportunities
   - Required improvements:
     - Review store initialization order
     - Optimize store registration
     - Implement proper error handling
     - Add performance monitoring
     - Document store integration patterns

4. **Virtual List Pattern - CRITICAL ISSUES**
   - DynamicScroller not rendering cards properly
   - CSS is properly imported in main.js
   - Props appear to be correctly configured
   - Debugging in progress:
     - Verifying DynamicScroller and DynamicScrollerItem implementation
     - Checking container sizing and item height calculations
     - Debugging data flow to virtual scroller
     - Verifying key field setup
     - Updating cleanup handling

### Frontend Patterns - CURRENT FOCUS 🟢

1. **User Profile Pattern**
   - ProfileSettings.vue implements Material Design 3 UI
   - Form validation for password change
   - Confirmation for account deletion
   - Responsive design with mobile optimizations
   - Error handling and user feedback
   - Clean component composition

2. **Preferences Management Pattern**
   - usePreferences composable for centralized management
   - Local storage fallback for guest users
   - API integration for authenticated users
   - Theme, language, notifications, map style, and units preferences
   - Synchronization between local and server storage
   - Reactive state management

3. **Component Composition**
   - Hierarchical component structure
   - Clean parent-child communication
   - Proper prop/event handling
   - Material Design 3 styling patterns
   - Responsive design implementation

4. **Map Integration Pattern**
   - Using @studiometa/vue-mapbox-gl
   - Empty container initialization
   - External control placement
   - Proper event handling
   - Clean resource management
   - Mapbox token implementation issues need resolution

### Backend Patterns
1. **API Gateway**
   - Django Ninja routing
   - Type-safe endpoints
   - Clean request handling
   - Proper error responses

2. **Data Access**
   - Optimized queries
   - Proper indexing
   - Efficient serialization
   - Clean model structure

3. **Authentication Flow**
   - Token-based auth
   - Session management
   - Secure routes
   - Clean user handling

## Component Relationships

### Frontend Components - CRITICAL ISSUES 🔴

1. **AccountCircle.vue - ERRORS DETECTED**
   - Experiencing unhandled errors during component update
   - Potential issues with setup function execution
   - Errors propagating through component tree
   - Improper inject() usage outside of setup() context
   - Needs immediate investigation and debugging

2. **AuthModal.vue - ERRORS DETECTED**
   - Experiencing unhandled errors during component update
   - Potential issues with setup function execution
   - Errors propagating through component tree
   - Improper inject() usage outside of setup() context
   - Needs immediate investigation and debugging

3. **SearchHeader.vue - ERRORS DETECTED**
   - Experiencing unhandled errors during component update
   - Potential issues with setup function execution
   - Errors propagating through component tree
   - Improper inject() usage outside of setup() context
   - Needs immediate investigation and debugging

4. **WalkInterface.vue - ERRORS DETECTED**
   - Experiencing unhandled errors during component update
   - Potential issues with setup function execution
   - Errors propagating through component tree
   - Improper inject() usage outside of setup() context
   - Needs immediate investigation and debugging

5. **RouterView - ERRORS DETECTED**
   - Experiencing unhandled errors during component update
   - Potential issues with setup function execution
   - Errors propagating through component tree
   - Improper inject() usage outside of setup() context
   - Needs immediate investigation and debugging

### Frontend Components - ACTIVE DEVELOPMENT 🟢

1. **ProfileSettings.vue - ACTIVE DEVELOPMENT**
   - Implements user profile settings UI
   - Password change functionality
   - Account deletion with confirmation
   - Material Design 3 styled components
   - Responsive design for mobile and desktop
   - Form validation and error handling
   - Integration with auth store

2. **AccountCircle.vue & AccountMenu.vue - ACTIVE DEVELOPMENT**
   - User account UI components
   - Authentication state visualization
   - Navigation to profile settings
   - Logout functionality
   - Integration with auth store

3. **usePreferences.js - ACTIVE DEVELOPMENT**
   - Composable for managing user preferences
   - Local storage fallback for guest users
   - API integration for authenticated users
   - Theme, language, notifications, map style, and units preferences
   - Reactive state management
   - Clean API for preference access and updates

### Frontend Components - NEEDS FIXING 🔴

1. **WalkList.vue - CRITICAL ISSUES**
   - DynamicScroller implementation
   - Item wrapper not rendering properly
   - No card elements rendered
   - Required fixes:
     - Verify DynamicScroller props
     - Check item size settings
     - Key field configuration
     - Component recycling
     - View management

2. **WalkCard.vue**
   - Component is properly implemented
   - Displays walk information
   - Handles user interactions
   - Manages local state
   - Emits relevant events

3. **MapView.vue**
   - Manages map display using @studiometa/vue-mapbox-gl
   - Handles map interactions
   - Controls map state
   - Manages markers
   - Resource cleanup
   - Mapbox token implementation issues need resolution

### Store Structure

1. **auth.js - CRITICAL ISSUES 🔴**
   - Pinia auth store installation problems
   - Potential issues with state management
   - Needs investigation for proper initialization
   - Used by components experiencing errors
   - Integration with Django authentication

2. **search.js - PERFORMANCE METRICS**
   - searchStore initialization: 0.239013671875 ms
   - Potential optimization opportunities
   - May be related to component errors
   - Used by SearchHeader component

3. **ui.js - ACTIVE DEVELOPMENT 🟢**
   - Loading states
   - Error handling
   - UI preferences
   - Mobile responsiveness
   - Theme management
   - Performance optimizations
   - Toast notifications
   - Used by profile components

4. **walks.js - NEEDS REVIEW 🔴**
   - Review required:
     - Data flow to DynamicScroller
     - Item management
     - Loading states
     - Store subscriptions
     - View recycling
     - Memory management

### Service Layer

1. **api.js**
   - Handles API requests
   - Manages responses
   - Controls error handling
   - Implements retries

2. **map.js**
   - Manages map setup with @studiometa/vue-mapbox-gl
   - Controls map state
   - Handles map events
   - Manages markers
   - Resource cleanup
   - Mapbox token implementation issues need resolution

## Data Flow

### Frontend Flow - CRITICAL ISSUES 🔴

1. **Component Lifecycle Flow**
   - Unhandled errors during component update
   - Issues with setup function execution
   - Improper inject() usage outside of setup() context
   - Errors propagating through component tree
   - Required fixes:
     - Move inject() calls to setup() context
     - Implement proper error boundaries
     - Fix component lifecycle management
     - Resolve runtime compiler configuration
     - Implement proper error handling patterns

2. **Store Initialization Flow**
   - Pinia auth store installation problems
   - searchStore initialization metrics: 0.239013671875 ms
   - Potential optimization opportunities
   - Required improvements:
     - Review store initialization order
     - Optimize store registration
     - Implement proper error handling
     - Add performance monitoring
     - Document store integration patterns

3. **Virtual List Flow**
   - DynamicScroller setup
   - Item template rendering
   - View recycling
   - DOM element reuse
   - Cleanup processes

### Frontend Flow - CURRENT FOCUS 🟢

1. **User Profile Flow**
   - Authentication state management
   - Form data validation
   - API requests for password change
   - Confirmation for destructive actions
   - Error handling and user feedback
   - Responsive UI adaptation

2. **Preferences Flow**
   - Local storage for guest users
   - API integration for authenticated users
   - Reactive state updates
   - Theme application
   - Language selection
   - Map style configuration
   - Units preference application

### Backend Flow
1. **Request Handling**
   - URL routing
   - View processing
   - Data serialization
   - Response formatting

2. **Data Processing**
   - Model operations
   - Query optimization
   - Cache management
   - Background tasks

## Integration Points

### Frontend-Backend
1. **API Integration**
   - Endpoint mapping
   - Data validation
   - Error handling
   - Response formatting

2. **Authentication**
   - Token management
   - Session handling
   - Route protection
   - User validation

### External Services
1. **Mapbox**
   - Using @studiometa/vue-mapbox-gl
   - Token management - ISSUES DETECTED
   - Map initialization
   - Event handling
   - Resource cleanup

2. **Storage Services**
   - File handling
   - Asset management
   - Cache control
   - Resource optimization

## Error Handling Patterns - NEEDS IMPLEMENTATION 🔴

1. **Component Error Boundaries**
   - Implement Vue 3 error handling
   - Catch and report component errors
   - Provide fallback UI
   - Log errors for debugging
   - Prevent error propagation

2. **Dependency Injection Error Handling**
   - Provide fallback values
   - Validate injected dependencies
   - Handle missing dependencies gracefully
   - Document dependency requirements
   - Implement proper error messages

3. **Store Error Handling**
   - Handle initialization failures
   - Provide fallback state
   - Implement retry mechanisms
   - Log store errors
   - Recover from store failures

4. **API Error Handling**
   - Handle network failures
   - Process error responses
   - Implement retry logic
   - Show user-friendly messages
   - Log API errors for debugging

## Animation System
1. **Motion Integration**
   - Using motion.dev/vue
   - Transition animations
   - Enter/exit animations
   - Scroll-linked animations
   - Viewport detection

This system patterns documentation reflects the critical Vue.js component errors that need immediate investigation, along with the ongoing work on user profile and preferences functionality and the virtual list implementation issues.

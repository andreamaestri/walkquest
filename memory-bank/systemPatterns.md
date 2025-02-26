# System Patterns: WalkQuest

## Architecture
WalkQuest follows a Model-View-Template (MVT) architecture on the backend with Django, and a component-based architecture on the frontend with Vue.js. The system is designed for scalability, maintainability, and performance.

## Key Technical Decisions

### Backend Architecture
- **Django for Backend:** Chosen for its robust ORM, security features, and GeoDjango integration
- **Django Ninja for API:** Selected for its performance, type safety, and OpenAPI support
- **PostgreSQL with PostGIS:** Chosen for spatial data capabilities and query optimization
- **Celery for Tasks:** Handles background processing and scheduled tasks

### Frontend Architecture
- **Vue.js 3:** Selected for its Composition API and reactive system
- **Pinia:** Implements centralized state management
- **Virtual List Implementation:** Using vue-virtual-scroller (DynamicScroller/DynamicScrollerItem)
- **Tailwind CSS:** Enables rapid UI development with utility classes

## Design Patterns

### Frontend Patterns - NEEDS REVISION 🔴

1. **Virtual List Pattern - CRITICAL ISSUES**
   - DynamicScroller not rendering cards properly
   - CSS is properly imported in main.js
   - Props appear to be correctly configured
   - Required fixes:
     - Verify DynamicScroller and DynamicScrollerItem implementation
     - Check container sizing and item height calculations
     - Debug data flow to virtual scroller
     - Verify key field setup
     - Update cleanup handling

2. **Component Composition**
   - Hierarchical component structure
   - Clean parent-child communication
   - Proper prop/event handling
   - Needs review:
     - DynamicScroller integration
     - Item template structure
     - Store integration
     - Rendering lifecycle

3. **Store Pattern**
   - Centralized state in Pinia
   - Action-based mutations
   - Computed property caching
   - Needs investigation:
     - Data flow to DynamicScroller
     - Item recycling
     - State updates
     - View recycling

4. **Map Integration Pattern**
   - Using @studiometa/vue-mapbox-gl
   - Empty container initialization
   - External control placement
   - Proper event handling
   - Clean resource management

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

### Frontend Components

1. **WalkInterface.vue**
   - Main container component
   - Manages layout and routing
   - Coordinates child components
   - Handles global events
   - Review needed:
     - Data passing to WalkList
     - Event handling
     - Store integration

2. **WalkList.vue - CRITICAL ISSUES 🔴**
   - DynamicScroller implementation
   - Item wrapper not rendering properly
   - No card elements rendered
   - Required fixes:
     - Verify DynamicScroller props
     - Check item size settings
     - Key field configuration
     - Component recycling
     - View management

3. **WalkCard.vue**
   - Component is properly implemented
   - Displays walk information
   - Handles user interactions
   - Manages local state
   - Emits relevant events

4. **MapView.vue**
   - Manages map display using @studiometa/vue-mapbox-gl
   - Handles map interactions
   - Controls map state
   - Manages markers
   - Resource cleanup

### Store Structure

1. **walks.js - NEEDS REVIEW 🔴**
   - Review required:
     - Data flow to DynamicScroller
     - Item management
     - Loading states
     - Store subscriptions
     - View recycling
     - Memory management

2. **ui.js**
   - Controls UI state
   - Manages preferences
   - Handles responsive layout
   - Controls theme
   - Performance optimization

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

## Data Flow

### Frontend Flow - NEEDS REVIEW 🔴
1. **Virtual List Flow**
   - DynamicScroller setup
   - Item template rendering
   - View recycling
   - DOM element reuse
   - Cleanup processes

2. **Data Management**
   - Store mutations
   - Computed updates
   - Component recycling
   - Cleanup handling
   - Memory optimization

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
   - Token management
   - Map initialization
   - Event handling
   - Resource cleanup

2. **Storage Services**
   - File handling
   - Asset management
   - Cache control
   - Resource optimization

## Animation System
1. **Motion Integration**
   - Using motion.dev/vue
   - Transition animations
   - Enter/exit animations
   - Scroll-linked animations
   - Viewport detection

This system patterns documentation reflects the critical issues with the vue-virtual-scroller implementation that require immediate attention and debugging.

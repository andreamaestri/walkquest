import Alpine from 'alpinejs';
import ApiService from './services/api.js';
import MapService from './services/map.js';

/**
 * Alpine.js Components for WalkQuest
 * Provides interactive map and walk listing functionality with optimized performance
 * and seamless integration with Mapbox GL JS.
 */

// Constants and configuration
const MAP_CONFIG = {
    MOBILE_BREAKPOINT: 768,
    DEFAULT_ZOOM: {
        MOBILE: 12.5,
        DESKTOP: 13.5
    },
    PADDING: {
        TOP: 50,
        BOTTOM: 50,
        RIGHT: 50,
        SIDEBAR_LEFT: 384 + 50,
        DEFAULT_LEFT: 50
    },
    BOUNDS: {
        SW: [-5.8, 49.8],
        NE: [-4.0, 51.0]
    }
};

const ANIMATION_CONFIG = {
    CARD_REVEAL: {
        THRESHOLD: 0.2,
        ROOT_MARGIN: '20% 0px -10% 0px',
        DURATION: 500,
        EASING: [0.2, 0.8, 0.2, 1]
    },
    MAP_FLY: {
        DURATION: 1200
    }
};

// Reusable helper for event registration with cleanup support.
export function addEvent(target, event, handler, options, cleanupSet) {
    target.addEventListener(event, handler, options);
    cleanupSet.add(() => target.removeEventListener(event, handler, options));
}

// Global debouncing helper to avoid duplication across components.
export function debounce(func, wait, context = null) {
    let timeout;
    return function(...args) {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context || this, args), wait);
    };
}

/**
 * Loading component with error handling and state management
 * Provides loading states, error handling, and cleanup
 */
export function loading() {
    return {
        isLoading: false,
        error: null,
        message: '',
        timeoutId: null,
        
        init() {
            this.$watch('isLoading', (value) => {
                if (!value) {
                    // Reset error state when loading completes
                    this.timeoutId = setTimeout(() => {
                        this.error = null;
                        this.message = '';
                    }, 300);
                }
            });
        },

        destroy() {
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
            }
        },
        
        startLoading(message = '') {
            this.isLoading = true;
            this.message = message;
            this.error = null;
        },
        
        stopLoading(error = null) {
            this.isLoading = false;
            this.error = error;
        },
        
        handleError(error) {
            console.error('Loading error:', error);
            this.error = error?.message || 'An unexpected error occurred';
            this.stopLoading(this.error);
        }
    };
}

/**
 * Mobile menu component with improved accessibility and event handling
 * Manages menu state, keyboard navigation, and screen reader support
 */
export function mobileMenu() {
    return {
        menuId: 'mobile-menu',
        toggleId: 'mobile-menu-toggle',

        init() {
            // Handle escape key to close menu
            const handleEscape = (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.closeMenu();
                }
            };

            // Handle clicks outside menu to close
            const handleClickOutside = (e) => {
                const menu = document.getElementById(this.menuId);
                const toggle = document.getElementById(this.toggleId);
                if (this.isOpen && menu && toggle &&
                    !menu.contains(e.target) &&
                    !toggle.contains(e.target)) {
                    this.closeMenu();
                }
            };

            // Use addEvent helper for cleaner event registration
            addEvent(document, 'keydown', handleEscape, {}, { cleanup: new Set() }.cleanup);

            addEvent(document, 'click', handleClickOutside, {}, { cleanup: new Set() }.cleanup);

            // Store cleanup function manually for later removal
            this.cleanup = () => {
                document.removeEventListener('keydown', handleEscape);
                document.removeEventListener('click', handleClickOutside);
            };

            // Sync with global state and manage accessibility
            const globals = Alpine.store('globals');
            if (globals) {
                this.$watch('isOpen', (value) => {
                    globals.mobileMenu.isOpen = value;
                    globals.isOpen = value;
                    
                    // Update ARIA attributes and body scroll
                    document.body.style.overflow = value ? 'hidden' : '';
                    this.$nextTick(() => {
                        const menu = document.getElementById(this.menuId);
                        const toggle = document.getElementById(this.toggleId);
                        if (menu) {
                            menu.setAttribute('aria-hidden', (!value).toString());
                            menu.setAttribute('aria-expanded', value.toString());
                        }
                        if (toggle) {
                            toggle.setAttribute('aria-expanded', value.toString());
                        }
                        
                        // Focus management
                        if (value && menu) {
                            const firstFocusable = menu.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                            if (firstFocusable) {
                                firstFocusable.focus();
                            }
                        }
                    });
                });
            }
        },

        destroy() {
            if (this.cleanup) {
                this.cleanup();
            }
        },

        toggleMenu() {
            this.isOpen ? this.closeMenu() : this.openMenu();
        },

        openMenu() {
            this.isOpen = true;
        },

        closeMenu() {
            this.isOpen = false;
            // Return focus to toggle button
            this.$nextTick(() => {
                const toggle = document.getElementById(this.toggleId);
                if (toggle) {
                    toggle.focus();
                }
            });
        }
    };
}

// Walk interface component with subtle loading states
export function walkInterface() {
    return {
        // Component state
        walks: [],
        searchQuery: '',
        showSidebar: window.localStorage.getItem('sidebar') === 'true',
        isMapLoading: true,
        fullscreen: false,
        error: null,
        isLoading: false,
        mapLoading: false,
        
        // Loading states
        loadingStates: {
            walks: new Set(),    // Track loading state per walk
            map: false,          // Map loading state
            search: false,       // Search loading state
            path: false         // Path loading state
        },
        
        // Cleanup registry for better resource management
        cleanup: {
            events: new Set(),      // Event listener cleanup functions
            observers: new Set(),   // IntersectionObserver cleanup
            intervals: new Set(),   // Interval cleanup
            timeouts: new Set()     // Timeout cleanup
        },
        
        // Map instance
        map: null,
        
        async init() {
            console.group('WalkInterface Initialization');
            console.log('Starting initialization...');
            
            try {
                // Bind methods to preserve context
                ['handleWalkSelection', 'clearSelection', 'toggleFullscreen', 'handleWalkInteractions']
                    .forEach(method => {
                        if (typeof this[method] === 'function') {
                            this[method] = this[method].bind(this);
                        }
                    });

                // Initialize map immediately
                await this.initializeMap();
                
                // Set up event listeners with cleanup registration
                this.registerEventListener(document, 'click', this.handleWalkInteractions);
                this.registerEventListener(window, 'walk:selected', (event) => {
                    if (event.detail) {
                        this.handleWalkSelection(event.detail);
                    }
                });

                // Handle responsive layout
                const debouncedResize = debounce(() => {
                    if (this.map) {
                        this.map.resize();
                        this.updateResponsiveLayout();
                    }
                }, 250, this);
                
                this.registerEventListener(window, 'resize', debouncedResize);
                
                // Initialize data in parallel
                await Promise.all([
                    this.initializeData(),
                    this.fetchWalks()
                ]);

                // Initial responsive layout
                this.updateResponsiveLayout();

                console.log('Initialization complete');
            } catch (error) {
                console.error('Initialization failed:', error);
                this.handleError(error);
            } finally {
                console.groupEnd();
            }
        },

        // Helper method for error handling
        handleError(error) {
            const message = error?.message || 'An unexpected error occurred';
            this.error = `Failed to initialize interface: ${message}`;
            
            // Notify loading component if available
            const loadingComponent = document.querySelector('[x-data="loading"]')?.__x?.Alpine;
            if (loadingComponent) {
                loadingComponent.$data.handleError(error);
            }
        },

        // New method to handle all walk interactions through event delegation
        handleWalkInteractions(event) {
            const walkCard = event.target.closest('[data-walk-id]');
            if (!walkCard) return;

            const walkId = walkCard.dataset.walkId;
            
            // Handle different interaction types based on clicked element
            if (event.target.matches('[data-expand-walk]')) {
                this.toggleWalkExpansion(walkId);
            } else if (event.target.matches('[data-select-walk]')) {
                this.handleWalkSelection({ id: walkId });
            }
        },

        async initializeData() {
            console.log('Initializing data...');
            const walksData = document.getElementById('walks-data');
            if (!walksData) {
                console.warn('No initial walks data found');
                return;
            }

            try {
                const initialData = JSON.parse(walksData.textContent);
                this.walks = initialData.walks || [];
                console.log('Data initialized with', this.walks.length, 'walks');
                
                this.$nextTick(() => {
                    if (this.map) {
                        // Removed marker update to preserve the full marker set from fetchMarkers
                        // this.updateMarkers(this.walks);
                    }
                });
            } catch (error) {
                console.error('Failed to parse initial data:', error);
                throw error;
            }
        },

        async initializeMap() {
            try {
                const configScript = document.getElementById('config-data');
                if (!configScript) {
                    throw new Error('Config script not found');
                }

                const config = JSON.parse(configScript.textContent);
                if (!config.mapboxToken) {
                    throw new Error('Mapbox token not found in config');
                }

                const mapContainer = document.getElementById('map');
                if (!mapContainer) {
                    throw new Error('Map container element not found');
                }

                // Use MapService instead of direct mapboxgl
                this.map = await MapService.initialize(mapContainer, {
                    mapboxToken: config.mapboxToken,
                    ...config.map
                });

                // Setup map event handlers
                this.map.on('load', () => {
                    // ...existing map load handler code...
                });

                // Add controls using MapService
                this.map.addControl(MapService.createNavigationControl(), 'top-left');
            } catch (error) {
                console.error('Failed to initialize map:', error);
                this.error = error.message;
                this.isMapLoading = false;
            }
        },

        async fetchWalks() {
            if (this.loadingStates.search) return;
            this.loadingStates.search = true;

            try {
                const response = await ApiService.filterWalks({
                    search: this.searchQuery,
                    include_transition: true,
                    include_expanded: true
                });

                if (!response?.walks) {
                    throw new Error('Invalid response format');
                }

                // Hide current cards immediately
                const currentCards = document.querySelectorAll('.walk-item');
                if (window.Motion && currentCards.length) {
                    await window.Motion.animate(currentCards, {
                        opacity: [1, 0],
                        scale: [1, 0.95],
                        y: [0, 20]
                    }, {
                        duration: 0.2,
                        easing: [0.4, 0, 0.2, 1]
                    }).finished;
                }

                // Update walks data
                this.walks = response.walks.map(walk => ({
                    ...walk,
                    isExpanded: false,
                    pubs_list: Array.isArray(walk.pubs_list) ? walk.pubs_list : [],
                    loading: false
                }));

                // Initialize intersection observer after DOM update
                this.$nextTick(() => {
                    this.initializeScrollAnimation();
                });

            } catch (error) {
                console.error('Failed to fetch walks:', error);
                this.error = `Failed to load walks: ${error.message || 'Please try again.'}`;
            } finally {
                this.loadingStates.search = false;
            }
        },

        initializeScrollAnimation() {
            const cards = document.querySelectorAll('.walk-item:not(.revealed)');
            if (!cards.length || !window.Motion) return;
        
            // Use a single IntersectionObserver for all cards
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const card = entry.target;
                        requestAnimationFrame(() => {
                            this.animateCard(card);
                            card.classList.add('revealed');
                        });
                        observer.unobserve(card);
                    }
                });
            }, {
                threshold: ANIMATION_CONFIG.CARD_REVEAL.THRESHOLD,
                rootMargin: ANIMATION_CONFIG.CARD_REVEAL.ROOT_MARGIN
            });
        
            // Register observer for cleanup
            this.registerObserver(observer);
        
            // Single scroll handler using requestAnimationFrame for optimization
            let ticking = false;
            const container = document.querySelector('.walk-list');
            
            if (container) {
                const handleScroll = debounce(() => {
                    if (!ticking) {
                        requestAnimationFrame(() => {
                            // Only observe cards that are not yet revealed
                            cards.forEach(card => {
                                if (!card.classList.contains('revealed')) {
                                    observer.observe(card);
                                }
                            });
                            ticking = false;
                        });
                        ticking = true;
                    }
                }, 16, this); // ~60fps
                
                // Register scroll event with cleanup
                this.registerEventListener(container, 'scroll', handleScroll, { passive: true });
            }
        
            // Initial observation
            cards.forEach(card => observer.observe(card));
        },

        // Helper method for card animations
        animateCard(card, delay = 0) {
            if (!window.Motion) return;
            
            return window.Motion.animate(card, {
                opacity: [0, 1],
                y: [15, 0],
                scale: [0.97, 1]
            }, {
                duration: 0.5,
                delay,
                easing: [0.2, 0.8, 0.2, 1]
            });
        },

        initializeExpandedContent() {
            // Initialize any previously expanded cards
            const expandedWalkIds = JSON.parse(localStorage.getItem('expandedWalks') || '[]');
            this.walks.forEach(walk => {
                walk.isExpanded = expandedWalkIds.includes(walk.id);
            });
        },

        toggleWalkExpansion(walkId) {
            const walk = this.walks.find(w => w.id === walkId);
            if (walk) {
                walk.isExpanded = !walk.isExpanded;
                this.saveExpandedStates();
            }
        },

        saveExpandedStates() {
            const expandedWalkIds = this.walks.filter(w => w.isExpanded).map(w => w.id);
            localStorage.setItem('expandedWalks', JSON.stringify(expandedWalkIds));
        },

        handleWalkSelection(detail) {
            const store = Alpine.store('walks');
            if (!detail) {
                this.clearSelection();
                store.setSelectedWalk(null);
                return;
            }
            // If clicked walk is already selected, collapse it.
            if (store.selectedWalkId === detail.id) {
                this.clearSelection();
                store.setSelectedWalk(null);
                return;
            }
            // Otherwise, select and expand
            store.setSelectedWalk(detail);
            this.$nextTick(() => {
                const card = document.querySelector(`[data-walk-id="${detail.id}"]`);
                if (card) {
                    const cardComponent = Alpine.$data(card);
                    if (cardComponent?.adjustScroll) {
                        cardComponent.adjustScroll();
                    }
                }
                this.showSidebar = true;
                window.localStorage.setItem('sidebar', 'true');
                this.updateMapView(detail);
                this.loadWalkGeometry(detail);
            });
        },
        
        clearSelection() {
            // Removed marker deselection since markers are now managed by Mapbox.
            const store = Alpine.store('walks');
            if (store) store.setSelectedWalk(null);
            this.showSidebar = false;
            window.localStorage.removeItem('sidebar');
        },

        updateMapView(detail) {
            if (!this.map || !detail) return;
            
            // Calculate offset to keep marker visible with expanded card
            const isMobile = window.innerWidth < 768;
            const padding = {
                top: 50,
                bottom: 50,
                left: this.showSidebar && !isMobile ? 384 + 50 : 50, // Add extra padding for sidebar
                right: 50
            };

            // Calculate optimal zoom based on window size
            const optimalZoom = isMobile ? 13 : 14;

            // Calculate offset to keep marker visible
            const offset = [
                this.showSidebar && !isMobile ? -150 : 0, // Horizontal offset when sidebar is open
                0 // Vertical offset
            ];

            if (detail.longitude && detail.latitude) {
                this.map.flyTo({
                    center: [detail.longitude, detail.latitude],
                    zoom: optimalZoom,
                    padding,
                    offset,
                    duration: 1200,
                    essential: true, // Makes the movement happen even during low-power mode
                    easing: (t) => {
                        // Custom easing function for smoother movement
                        return t < 0.5
                            ? 4 * t * t * t
                            : 1 - Math.pow(-2 * t + 2, 3) / 2;
                    }
                });

                // Removed tooltip integration. Markers will now display a hover effect via CSS.
            }
        },

        async loadWalkGeometry(detail) {
            if (!detail?.id || this.loadingStates.walks.has(detail.id)) return;
            this.loadingStates.walks.add(detail.id);
        
            try {
                const zoom = Math.floor(this.map.getZoom());
                const geojson = await ApiService.getWalkGeometry(detail.id, zoom);
        
                if (this.map.getSource('route')) {
                    this.map.getSource('route').setData(geojson);
                } else {
                    this.map.addSource('route', {
                        type: 'geojson',
                        data: geojson
                    });
                    this.map.addLayer({
                        id: 'route',
                        type: 'line',
                        source: 'route',
                        layout: {
                            'line-join': 'round',
                            'line-cap': 'round'
                        },
                        paint: {
                            'line-color': ['get', 'color'],
                            'line-width': 4
                        }
                    });
                }
            } catch (error) {
                console.error('Failed to load walk geometry:', error);
            } finally {
                this.loadingStates.walks.delete(detail.id);
            }
        },

        // Helper to check if a specific walk is loading
        isWalkLoading(walkId) {
            return this.loadingStates.walks.has(walkId);
        },

        walkTransition(walk, index) {
            return {
                ':class': "{ 'opacity-0': $store.walks.loading }",
                'x-transition:enter': 'transition ease-out duration-300',
                'x-transition:enter-start': 'opacity-0 translate-y-4',
                'x-transition:enter-end': 'opacity-100 translate-y-0',
                'style': `animation-delay: ${index * 100}ms`
            };
        },

        // Removed: updateMarkers method - markers now use Mapbox layer "geojson-cwfsvt"

        getMarkerColor(steepnessLevel) {
            const colors = {
                'Easy': '#10B981',      // Green
                'Moderate': '#4338CA',  // Blue
                'Challenging': '#DC2626' // Red
            };
            return colors[steepnessLevel] || '#242424'; // Default color
        },

        ensureInView(walkId) {
            // Add small delay to ensure DOM updates
            this.registerTimeout(() => {
                const card = document.querySelector(`[data-walk-id="${walkId}"]`);
                const container = document.querySelector('.walk-list');
                
                if (!card || !container) {
                    console.warn('Card or container not found:', { walkId, card, container });
                    return;
                }
                
                // First, collapse all other cards
                this.walks.forEach(w => {
                    if (w.id !== walkId && w.isExpanded) {
                        w.isExpanded = false;
                    }
                });
                
                // Get updated dimensions after collapse
                const containerRect = container.getBoundingClientRect();
                const cardRect = card.getBoundingClientRect();
                
                // Calculate the ideal scroll position to center the card
                const targetScroll = container.scrollTop +
                    (cardRect.top - containerRect.top) -
                    (containerRect.height - cardRect.height) / 2;
                
                // Smooth scroll to position
                container.scrollTo({
                    top: Math.max(0, targetScroll),
                    behavior: 'smooth'
                });
                
                // Expand the selected card after scrolling
                this.registerTimeout(() => {
                    const walk = this.walks.find(w => w.id === walkId);
                    if (walk) {
                        walk.isExpanded = true;
                        this.saveExpandedStates();
                    }
                }, 300); // Wait for scroll to complete
            }, 50);
        },

        // Helper methods for event management and cleanup
        registerEventListener(target, event, handler, options = {}) {
            addEvent(target, event, handler, options, this.cleanup.events);
        },

        registerTimeout(callback, delay) {
            const timeoutId = setTimeout(callback, delay);
            this.cleanup.timeouts.add(timeoutId);
            return timeoutId;
        },

        registerInterval(callback, delay) {
            const intervalId = setInterval(callback, delay);
            this.cleanup.intervals.add(intervalId);
            return intervalId;
        },

        registerObserver(observer) {
            this.cleanup.observers.add(observer);
            return observer;
        },

        // Cleanup method for component destruction
        destroy() {
            // Clean up event listeners
            this.cleanup.events.forEach(cleanup => cleanup());
            this.cleanup.events.clear();
            
            // Clean up timeouts
            this.cleanup.timeouts.forEach(clearTimeout);
            this.cleanup.timeouts.clear();
            
            // Clean up intervals
            this.cleanup.intervals.forEach(clearInterval);
            this.cleanup.intervals.clear();
            
            // Clean up observers
            this.cleanup.observers.forEach(observer => observer.disconnect());
            this.cleanup.observers.clear();
            
            // Clean up map instance
            if (this.map) {
                this.map.remove();
                this.map = null;
            }
        },

        // Add fullscreen toggle method with resize handling
        toggleFullscreen() {
            this.fullscreen = !this.fullscreen;
            // Allow layout to update before any animations
            this.$nextTick(() => {
                if (this.map) {
                    this.map.resize();
                    // Update responsive layout after resize
                    this.updateResponsiveLayout();
                }
            });
        },

        // Helper for responsive layout updates
        updateResponsiveLayout() {
            const isMobile = window.innerWidth < MAP_CONFIG.MOBILE_BREAKPOINT;
            if (this.map && this.map.getZoom) {
                const optimalZoom = isMobile ?
                    MAP_CONFIG.DEFAULT_ZOOM.MOBILE :
                    MAP_CONFIG.DEFAULT_ZOOM.DESKTOP;
                this.map.setZoom(optimalZoom);
            }
        },

        // Add mobile menu handling
        mobileMenu: {
            isOpen: false,
            toggleMenu() {
                this.isOpen = !this.isOpen;
            }
        }
    };
}

// Add showBadges helper function
export function showBadges(steepnessLevel) {
    const badges = {
        'Easy': { icon: '🌳', color: 'bg-green-100 text-green-800' },
        'Moderate': { icon: '⛰️', color: 'bg-blue-100 text-blue-800' },
        'Challenging': { icon: '🏔️', color: 'bg-red-100 text-red-800' }
    };
    return badges[steepnessLevel] || { icon: '🚶', color: 'bg-gray-100 text-gray-800' };
}

// Initialize Alpine.js stores and components
document.addEventListener('alpine:init', () => {
    // Register showBadges as a global Alpine property
    Alpine.magic('badges', () => (steepnessLevel) => showBadges(steepnessLevel));
    
    // Register components
    Alpine.data('loading', loading);
    Alpine.data('mobileMenu', mobileMenu);
    Alpine.data('walkInterface', walkInterface);

    // Backward compatibility
    window.adjustScroll = function(element) {
        const walkInterface = document.querySelector('[x-data="walkInterface"]')?.__x?.Alpine;
        if (walkInterface) {
            walkInterface.$data.ensureInView(element);
        }
    };

    console.log('Alpine.js initialization complete:', {
        components: {
            walkInterface: walkInterface,
            mobileMenu: mobileMenu,
            loading: loading
        }
    });
});

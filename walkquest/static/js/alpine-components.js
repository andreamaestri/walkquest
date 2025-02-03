// Define component functions immediately in global scope
(function() {
    // Loading component
    window.loading = function() {
        return {
            init() {
                // Component initialization if needed
            }
        };
    };

    // Mobile menu component
    window.mobileMenu = function() {
        return {
            isOpen: false,
            toggleMenu() {
                this.isOpen = !this.isOpen;
                const globals = Alpine.store('globals');
                if (globals) {
                    globals.mobileMenu.isOpen = this.isOpen;
                    globals.isOpen = this.isOpen;
                }
            }
        };
    };

    // Walk interface component with subtle loading states
    window.walkInterface = function() {
        return {
            walks: [],
            searchQuery: '',
            showSidebar: window.localStorage.getItem('sidebar') === 'true',
            isMapLoading: true,
            fullscreen: false, // Add missing fullscreen state
            error: null,
            loadingStates: {
                walks: new Set(),    // Track loading state per walk
                map: false,          // Map loading state
                search: false        // Search loading state
            },
            map: null,
            markers: new Map(),
            markerCache: new Map(),
            
            async init() {
                // Ensure proper binding context
                const self = this;
                
                // Bind methods to preserve context
                ['handleWalkSelection', 'clearSelection', 'toggleFullscreen'].forEach(method => {
                    if (typeof this[method] === 'function') {
                        this[method] = this[method].bind(this);
                    }
                });

                console.group('WalkInterface Initialization');
                console.log('Starting initialization...');
                
                // Initialize map immediately
                await this.initializeMap();
                
                try {
                    // Add walk selection listener
                    window.addEventListener('walk:selected', (event) => {
                        if (event.detail) {
                            this.handleWalkSelection(event.detail);
                        }
                    });
                    
                    // Fetch markers in the background
                    this.fetchMarkers();
                    // Fetch paginated walks without overriding markers
                    await this.initializeData();
                    await this.fetchWalks();
                    console.log('Initialization complete');
                } catch (error) {
                    console.error('Initialization failed:', error);
                    this.error = 'Failed to initialize interface';
                } finally {
                    console.groupEnd();
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
                const configScript = document.getElementById('config-data');
                if (!configScript) {
                    console.error('Config data script tag not found');
                    this.error = 'Configuration not found';
                    this.isMapLoading = false;
                    return;
                }

                try {
                    const config = JSON.parse(configScript.textContent);
                    if (!config.mapboxToken) {
                        throw new Error('Mapbox token not found in config');
                    }

                    mapboxgl.accessToken = config.mapboxToken;
                    const mapContainer = document.getElementById('map');
                    if (!mapContainer) {
                        throw new Error('Map container element not found');
                    }
                    if (mapContainer.children.length > 0) {
                        console.warn('Map container is not empty. Clearing existing content.');
                        mapContainer.innerHTML = '';
                    }
                    
                    this.map = new mapboxgl.Map({
                        container: mapContainer,
                        style: 'mapbox://styles/mapbox/outdoors-v12?optimize=true',
                        center: config.map?.defaultCenter || [-4.85, 50.4],
                        zoom: config.map?.defaultZoom || 9.5,
                        preserveDrawingBuffer: false,
                        maxZoom: 16,
                        minZoom: 1,
                        renderWorldCopies: false,
                        trackResize: true,
                        useWebGL: true,
                        antialias: false,
                        maxBounds: new mapboxgl.LngLatBounds(
                            [-5.8, 49.8],
                            [-4.0, 51.0]
                        )
                    });


                    this.map.on('load', () => {
                        console.log('Map loaded successfully');
                        // Optimize initial map load
                        requestAnimationFrame(() => {
                            this.isMapLoading = false;
                            this.map.resize();
                            
                            // Apply performance optimizations
                            if (this.map) {
                                // Reduce memory usage for tiles
                                if (config.map?.maxTileCacheSize != null) {
                                    this.map.setMaxTileCacheSize(config.map.maxTileCacheSize);
                                }
                                
                                // Only request tiles within the maxBounds
                                this.map.setRenderWorldCopies(false);
                                
                                // Optimize for static map usage
                                this.map.dragRotate.disable();
                                this.map.touchZoomRotate.disableRotation();
                            }
                        });
                    });

                    this.map.addControl(new mapboxgl.NavigationControl(), 'top-left');
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
                    const response = await window.ApiService.filterWalks({
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
            
                let lastScrollTime = Date.now();
                let ticking = false;
                const container = document.querySelector('.walk-list');
                
                // Create reusable timeline for animations
                const animateCard = (card, delay = 0) => {
                    return window.Motion.animate(card, {
                        opacity: [0, 1],
                        y: [15, 0],
                        scale: [0.97, 1]
                    }, {
                        duration: 0.5,
                        delay,
                        easing: [0.2, 0.8, 0.2, 1]
                    });
                };
            
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            const card = entry.target;
                            const rect = card.getBoundingClientRect();
                            const viewportHeight = window.innerHeight;
                            const scrollProgress = (viewportHeight - rect.top) / (viewportHeight + rect.height);
                            const delay = Math.max(0, Math.min(0.3, 1 - scrollProgress)) * 0.3;
            
                            requestAnimationFrame(() => {
                                animateCard(card, delay);
                                card.classList.add('revealed');
                            });
            
                            observer.unobserve(card);
                        }
                    });
                }, {
                    threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5],
                    rootMargin: '20% 0px -10% 0px'
                });
            
                // Handle scroll events more efficiently
                const onScroll = () => {
                    lastScrollTime = Date.now();
                    if (!ticking) {
                        requestAnimationFrame(() => {
                            const timeSinceLastScroll = Date.now() - lastScrollTime;
                            if (timeSinceLastScroll > 100) {
                                cards.forEach(card => {
                                    if (!card.classList.contains('revealed')) {
                                        observer.observe(card);
                                    }
                                });
                            }
                            ticking = false;
                        });
                        ticking = true;
                    }
                };
            
                if (container) {
                    container.addEventListener('scroll', onScroll, { passive: true });
                }
            
                // Initial observation
                cards.forEach(card => observer.observe(card));
            
                // Cleanup
                return () => {
                    observer.disconnect();
                    if (container) {
                        container.removeEventListener('scroll', onScroll);
                    }
                };
            },

            async fetchMarkers() {
                try {
                    this.loadingStates.map = true;
                    const markers = await window.ApiService.getWalkMarkers();
                    
                    // Only update markers if map is ready
                    if (this.map) {
                        // Use requestAnimationFrame for smoother updates
                        requestAnimationFrame(() => {
                            this.updateMarkers(markers);
                        });
                    } else {
                        console.warn('Map not ready, caching markers for later');
                        this.markerCache = markers;
                    }
                    this.loadingStates.map = false;
                } catch (error) {
                    console.error('Error fetching markers:', error);
                }
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
                // Clear active state from all markers when deselecting
                this.markers.forEach(marker => {
                    marker.getElement().classList.remove('active-marker');
                });
                
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

                    // Highlight the active marker
                    const marker = this.markers.get(detail.id);
                    marker?.getElement().classList.add('active-marker');
                    setTimeout(() => {
                        marker?.getElement().classList.remove('active-marker');
                    });
                }
            },

            async loadWalkGeometry(detail) {
                if (!detail?.id || this.loadingStates.walks.has(detail.id)) return;
                this.loadingStates.walks.add(detail.id);

                try {
                    const response = await fetch(`/api/walks/${detail.id}/geometry`);
                    if (!response.ok) throw new Error('Failed to load geometry');
                    
                    const geojson = await response.json();
                    
                    // Silently update the map without loading indicators
                    if (this.map) {
                        if (!this.map.getSource('route')) {
                            this.map.addSource('route', {
                                type: 'geojson',
                                data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
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

                        // Update source data with color property
                        geojson.properties = {
                            color: {
                                'Moderate': '#4338CA',
                                'Challenging': '#DC2626',
                                'Easy': '#10B981'
                            }[detail.steepness_level] || '#242424'
                        };
                        
                        this.map.getSource('route').setData(geojson);
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

            updateMarkers(walks) {
                if (!this.map) return;

                // If we have cached markers and no walks provided, use cached markers
                if (!walks && this.markerCache) {
                    walks = this.markerCache;
                    this.markerCache = null;
                }
                if (!walks) return;
                
                const existingIds = new Set(this.markers.keys());
                const newIds = new Set();
                
                for (const walk of walks) {
                    if (!walk.latitude || !walk.longitude) continue;
                    newIds.add(walk.id);
                    
                    if (!this.markers.has(walk.id)) {
                        // Create default marker with color
                        const marker = new mapboxgl.Marker({
                            color: this.getMarkerColor(walk.steepness_level)
                        });
                        marker.setLngLat([walk.longitude, walk.latitude])
                             .addTo(this.map);

                        // Add click handler
                        marker.getElement().addEventListener('click', () => {
                            window.dispatchEvent(new CustomEvent('walk:selected', { 
                                detail: walk,
                                bubbles: true
                            }));
                        });
                        this.markers.set(walk.id, marker);
                        marker.getElement().classList.add('map-marker');
                    }
                }
                
                // Remove unused markers
                for (const id of existingIds) {
                    if (!newIds.has(id)) {
                        this.markers.get(id)?.remove();
                        this.markers.delete(id);
                    }
                }
            },

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
                setTimeout(() => {
                    const card = document.querySelector(`[data-walk-id="${walkId}"]`);
                    const container = document.querySelector('.walk-list'); // Direct selector instead of closest
                    if (!card || !container) {
                        console.log('Card or container not found:', { walkId, card, container });
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
                    setTimeout(() => {
                        const walk = this.walks.find(w => w.id === walkId);
                        if (walk) {
                            walk.isExpanded = true;
                            this.saveExpandedStates();
                        }
                    }, 300); // Wait for scroll to complete
                }, 50);
            },

            // Add fullscreen toggle method
            toggleFullscreen() {
                this.fullscreen = !this.fullscreen;
                // Allow layout to update before any animations
                this.$nextTick(() => {
                    if (this.map) {
                        this.map.resize();
                    }
                });
            }
        };
    };

    // Add showBadges helper function
    window.showBadges = function(steepnessLevel) {
        const badges = {
            'Easy': { icon: '🌳', color: 'bg-green-100 text-green-800' },
            'Moderate': { icon: '⛰️', color: 'bg-blue-100 text-blue-800' },
            'Challenging': { icon: '🏔️', color: 'bg-red-100 text-red-800' }
        };
        return badges[steepnessLevel] || { icon: '🚶', color: 'bg-gray-100 text-gray-800' };
    };

})();

// Initialize Alpine.js stores and components
document.addEventListener('alpine:init', () => {
    // Register showBadges as a global Alpine property
    Alpine.magic('badges', () => (steepnessLevel) => window.showBadges(steepnessLevel));
    
    // Initialize walks store first with toggle behavior
    Alpine.store('walks', {
        selectedWalkId: null,
        setSelectedWalk(detail) {
            // Always set the selected walk without toggling
            this.selectedWalkId = detail ? detail.id : null;
        },
        isWalkSelected(walkId) {
            return this.selectedWalkId === walkId;
        },
        pendingFavorites: new Set(),
        loading: false,
        progress: 0,
        
        // ...existing methods for progress/loading...
        setProgress(value) {
            this.progress = Math.min(100, Math.max(0, value));
            if (this.progress === 100) {
                setTimeout(() => this.stopLoading(), 200);
            }
        },
        startLoading() {
            this.loading = true;
        },
        stopLoading() {
            this.loading = false;
        },
        togglePendingFavorite(walkId) {
            if (this.pendingFavorites.has(walkId)) {
                this.pendingFavorites.delete(walkId);
            } else {
                this.pendingFavorites.add(walkId);
            }
        },
        isPending(walkId) {
            return this.pendingFavorites.has(wwalkId);
        }
    });

    // Initialize global store first
    Alpine.store('globals', {
        fullscreen: false,
        mobileMenu: {
            isOpen: false
        },
        expandWalk: null
    });

    // Register components
    Alpine.data('loading', window.loading);
    Alpine.data('mobileMenu', window.mobileMenu);
    Alpine.data('walkInterface', window.walkInterface);

    // Backward compatibility
    window.adjustScroll = function(element) {
        const walkInterface = document.querySelector('[x-data="walkInterface"]')?.__x?.Alpine;
        if (walkInterface) {
            walkInterface.$data.ensureInView(element);
        }
    };

    console.log('Alpine.js initialization complete:', {
        store: Alpine.store('walks'),
        components: {
            walkInterface: window.walkInterface,
            mobileMenu: window.mobileMenu,
            loading: window.loading
        }
    });
});

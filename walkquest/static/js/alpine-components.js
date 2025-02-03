// Define component functions immediately in global scope
(function() {
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

    // Loading component
    window.loading = function() {
        return {
            show: false,
            init() {
                const globals = Alpine.store('globals');
                if (globals?.loading) {
                    this.show = globals.loading.show;
                }

                window.addEventListener('loading:show', () => {
                    this.show = true;
                    const globals = Alpine.store('globals');
                    if (globals?.loading) globals.loading.show = true;
                });
                
                window.addEventListener('loading:hide', () => {
                    this.show = false;
                    const globals = Alpine.store('globals');
                    if (globals?.loading) globals.loading.show = false;
                });
            }
        };
    };

    // Walk interface component with full map and walk card functionality
    window.walkInterface = function() {
        return {
            walks: [],
            searchQuery: '',
            showSidebar: window.localStorage.getItem('sidebar') === 'true',
            isMapLoading: true,
            error: null,
            loadingStates: { map: false, path: false },
            map: null,
            markers: new Map(),
            markerCache: new Map(),
            
            async init() {
                console.group('WalkInterface Initialization');
                console.log('Starting initialization...');
                
                try {
                    // Add walk selection listener
                    window.addEventListener('walk:selected', (event) => {
                        if (event.detail) {
                            this.handleWalkSelection(event.detail);
                        }
                    });

                    await this.initializeMap();
                    // Fetch all markers via full API call
                    await this.fetchMarkers();
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
                if (this.isLoading) return;
                this.isLoading = true;
                window.dispatchEvent(new Event('loading:show'));

                try {
                    const response = await window.ApiService.filterWalks({
                        search: this.searchQuery,
                        include_transition: true,
                        include_expanded: true
                    });

                    if (!response?.walks) {
                        throw new Error('Invalid response format');
                    }

                    this.walks = response.walks.map(walk => ({
                        ...walk,
                        isExpanded: false,
                        // Ensure pubs_list is always an array
                        pubs_list: Array.isArray(walk.pubs_list) ? walk.pubs_list : []
                    }));
                    this.error = null;

                    this.$nextTick(() => {
                        // Add staggered reveal animations
                        document.querySelectorAll('.walk-item').forEach((card, index) => {
                            setTimeout(() => {
                                card.classList.add('revealed');
                            }, index * 100);
                        });

                        this.initializeExpandedContent();
                        
                        // Initialize hover effects after cards are revealed
                        if (window.WalkAnimations?.initializeHoverEffects) {
                            window.WalkAnimations.initializeHoverEffects();
                        }
                    });
                } catch (error) {
                    console.error('Failed to fetch walks:', error);
                    this.error = `Failed to load walks: ${error.message || 'Please try again.'}`;
                } finally {
                    this.isLoading = false;
                    window.dispatchEvent(new Event('loading:hide'));
                }
            },

            async fetchMarkers() {
                try {
                    // Use the new service method if available; otherwise, call directly
                    const response = await fetch('/api/walks/markers');
                    const data = await response.json();
                    if (!data.markers) {
                        throw new Error('Invalid marker data response');
                    }
                    // Update markers immediately using the lightweight data
                    this.updateMarkers(data.markers);
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
                if (!detail?.id) return;
        
                try {
                    const response = await fetch(`/api/walks/${detail.id}/geometry`);
                    if (!response.ok) throw new Error('Failed to load geometry');
                    
                    const geojson = await response.json();

                    // Ensure source exists
                    if (!this.map.getSource('route')) {
                        this.map.addSource('route', {
                            type: 'geojson',
                            data: {
                                type: 'Feature',
                                properties: {},
                                geometry: {
                                    type: 'LineString',
                                    coordinates: []
                                }
                            }
                        });
                    }

                    // Ensure layer exists
                    if (!this.map.getLayer('route')) {
                        this.map.addLayer({
                            id: 'route',
                            type: 'line',
                            source: 'route',
                            layout: {
                                'line-join': 'round',
                                'line-cap': 'round'
                            },
                            paint: {
                                'line-color': '#242424',
                                'line-width': 4
                            }
                        });
                    }

                    // Update source data
                    this.map.getSource('route').setData(geojson);

                    // Update route color based on steepness
                    const color = {
                        'Moderate': '#4338CA',
                        'Challenging': '#DC2626',
                        'Easy': '#10B981'
                    }[detail.steepness_level] || '#242424';

                    this.map.setPaintProperty('route', 'line-color', color);
                } catch (error) {
                    console.error('Failed to load walk geometry:', error);
                }
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
                
                const existingIds = new Set(this.markers.keys());
                const newIds = new Set();
                
                for (const walk of walks) {
                    if (!walk.latitude || !walk.longitude) continue;
                    newIds.add(walk.id);
                    
                    if (!this.markers.has(walk.id)) {
                        let marker;
                        if (this.markerCache.has(walk.steepness_level)) {
                            marker = new mapboxgl.Marker(this.markerCache.get(walk.steepness_level).cloneNode(true));
                        } else {
                            const element = document.createElement('div');
                            // Update class name to match CSS
                            element.className = 'walk-marker';
                            // Add size and shape styles
                            element.style.width = '24px';
                            element.style.height = '24px';
                            element.style.borderRadius = '50%';
                            element.style.backgroundColor = this.getMarkerColor(walk.steepness_level);
                            // Add drop shadow
                            element.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                            this.markerCache.set(walk.steepness_level, element);
                            marker = new mapboxgl.Marker({
                                element: element,
                                anchor: 'center'
                            });
                        }
                        
                        marker.setLngLat([walk.longitude, walk.latitude]).addTo(this.map);

                        marker.getElement().addEventListener('click', () => {
                            window.dispatchEvent(new CustomEvent('walk:selected', { 
                                detail: walk,
                                bubbles: true
                            }));
                        });
                        /* Add reactive press animations for markers */
                        marker.getElement().addEventListener('mousedown', () => {
                            window.Motion.animate(marker.getElement(), { scale: [1, 0.9] }, {
                                duration: 0.08,
                                easing: [0.4, 0, 0.2, 1]
                            });
                        });
                        marker.getElement().addEventListener('mouseup', () => {
                            window.Motion.animate(marker.getElement(), { scale: [0.9, 1.1, 1] }, {
                                duration: 0.15,
                                easing: [0.175, 0.885, 0.32, 1.275]
                            });
                        });
                        this.markers.set(walk.id, marker);
                    }
                }
                
                // Remove unused markers
                for (const id of existingIds) {
                    if (!newIds.has(id)) {
                        const marker = this.markers.get(id);
                        if (marker) {
                            marker.remove();
                            this.markers.delete(id);
                        }
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
            return this.pendingFavorites.has(walkId);
        }
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

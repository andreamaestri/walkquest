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
            hasMore: true,
            page: 1,
            
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

                    await this.initializeData();
                    await this.initializeMap();
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
                    this.hasMore = initialData.hasMore || false;
                    console.log('Data initialized with', this.walks.length, 'walks');
                    
                    this.$nextTick(() => {
                        if (this.map) {
                            this.updateMarkers(this.walks);
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
                        this.isMapLoading = false;
                        this.map.resize();
                        
                        try {
                            if (this.map.getLayer('route')) {
                                this.map.removeLayer('route');
                            }
                            if (this.map.getSource('route')) {
                                this.map.removeSource('route');
                            }

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

                            if (this.walks.length > 0) {
                                this.updateMarkers(this.walks);
                            }
                        } catch (error) {
                            console.error('Error initializing route:', error);
                        }
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
                        page: 1,
                        page_size: 10
                    });

                    if (!response?.walks) {
                        throw new Error('Invalid response format');
                    }

                    this.walks = response.walks;
                    this.hasMore = response.walks.length >= 10;
                    this.page = 1;
                    this.error = null;
                    
                    this.$nextTick(() => {
                        this.updateMarkers(this.walks);
                    });
                } catch (error) {
                    console.error('Failed to fetch walks:', error);
                    this.error = `Failed to load walks: ${error.message || 'Please try again.'}`;
                } finally {
                    this.isLoading = false;
                    window.dispatchEvent(new Event('loading:hide'));
                }
            },

            async loadMore() {
                if (this.isLoadingMore || !this.hasMore) return;
                
                this.isLoadingMore = true;
                try {
                    const response = await window.ApiService.filterWalks({
                        search: this.searchQuery,
                        page: this.page + 1,
                        page_size: 10
                    });

                    if (!response?.walks) {
                        throw new Error('Invalid response format');
                    }

                    this.walks = [...this.walks, ...response.walks];
                    this.hasMore = response.walks.length >= 10;
                    this.page++;
                    this.error = null;

                    this.$nextTick(() => {
                        this.updateMarkers(this.walks);
                    });
                } catch (error) {
                    console.error('Failed to load more walks:', error);
                    this.error = `Failed to load more walks: ${error.message || 'Please try again.'}`;
                } finally {
                    this.isLoadingMore = false;
                }
            },

            handleWalkSelection(detail) {
                if (!detail) {
                    const store = Alpine.store('walks');
                    if (store) store.setSelectedWalk(null);
                    this.showSidebar = false;
                    window.localStorage.removeItem('sidebar');
                    return;
                }

                const store = Alpine.store('walks');
                if (store) store.setSelectedWalk(detail);
                
                this.showSidebar = true;
                window.localStorage.setItem('sidebar', 'true');

                // Update map view
                this.updateMapView(detail);
                this.loadWalkGeometry(detail);
            },

            updateMapView(detail) {
                if (!this.map || !detail) return;
                
                const padding = {
                    top: 50,
                    bottom: 50,
                    left: this.showSidebar ? 384 : 50,
                    right: 50
                };

                if (detail.longitude && detail.latitude) {
                    this.map.flyTo({
                        center: [detail.longitude, detail.latitude],
                        zoom: 14,
                        padding,
                        duration: 1000
                    });
                }
            },

            async loadWalkGeometry(detail) {
                if (!detail?.id) return;
                
                try {
                    const response = await fetch(`/api/walks/${detail.id}/geometry`);
                    if (!response.ok) throw new Error('Failed to load geometry');
                    
                    const geojson = await response.json();
                    const source = this.map.getSource('route');
                    if (source) {
                        source.setData(geojson);
                    }

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

            updateMarkers(walks) {
                if (!this.map) return;
                
                const existingIds = new Set(this.markers.keys());
                const newIds = new Set();
                
                // Update or add new markers
                for (const walk of walks) {
                    if (!walk.latitude || !walk.longitude) continue;
                    newIds.add(walk.id);
                    
                    if (!this.markers.has(walk.id)) {
                        const marker = new mapboxgl.Marker()
                            .setLngLat([walk.longitude, walk.latitude])
                            .addTo(this.map);
                        
                         if (!marker.getElement().getAttribute('data-listener-added')) {
                            marker.getElement().addEventListener('click', () => {
                                try {
                                    // Find the corresponding walk card element
                                    const card = document.querySelector(`[data-walk-id="${walk.id}"]`);
                                    if (card) {
                                        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        // Get Alpine component instance and call toggleExpand directly
                                        const cardComponent = Alpine.$data(card);
                                        if (cardComponent && typeof cardComponent.toggleExpand === 'function') {
                                            cardComponent.toggleExpand();
                                        } else {
                                            console.warn('Walk card component or toggleExpand method not found');
                                        }
                                    } else {
                                        console.warn('Walk card not found for walk id:', walk.id);
                                    }
                                    // Dispatch custom event for reactive selection
                                    window.dispatchEvent(new CustomEvent('walk:selected', { detail: walk }));
                                    // Fly to the marker
                                    if (this.map) {
                                        this.map.flyTo({
                                            center: [walk.longitude, walk.latitude],
                                            zoom: 14,
                                            padding: {
                                                top: 50,
                                                bottom: 50,
                                                left: this.showSidebar ? 384 : 50,
                                                right: 50
                                            },
                                            duration: 1000
                                        });
                                    }
                                } catch (err) {
                                    console.error('Error handling marker click:', err);
                                }
                            });
                            marker.getElement().setAttribute('data-listener-added', 'true');
                        }
                        
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
            }
        };
    };
})();

// Initialize Alpine.js stores and components
document.addEventListener('alpine:init', () => {
    // Initialize walks store first
    Alpine.store('walks', {
        selectedWalk: null,
        // Removed isSelecting property for simplicity
        pendingFavorites: new Set(),
        loading: false,
        progress: 0,
        
        setSelectedWalk(walk) {
            // Toggle selection if the same walk is clicked
            if (this.selectedWalk && this.selectedWalk.id === walk?.id) {
                this.selectedWalk = null;
                // ...existing code for deselection (e.g., sidebar management)...
                window.localStorage.removeItem('sidebar');
                return;
            }
            this.selectedWalk = walk;
            this.progress = 0;
            if (walk) {
                this.startLoading();
                this.setProgress(20);
            } else {
                this.stopLoading();
            }
        },
        
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

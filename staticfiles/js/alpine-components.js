// Global constants
const CONFIG = {
    DEBOUNCE_DELAY: 300,
    PAGE_SIZE: 10,
    MAP: {
        MIN_ZOOM: 5,
        MAX_ZOOM: 16,
        BOUNDS: [[-6.5, 49.5], [-3.0, 51.5]], // Cornwall bounds
        MAX_BOUNDS: [[-8.0, 48.0], [-2.0, 52.0]], // Restrict panning
        PATH_COLORS: {
            Moderate: '#4338CA',
            Challenging: '#DC2626',
            Easy: '#10B981',
            default: '#212422'
        }
    }
};

// Utility functions
const utils = {
    debounce(fn, delay) {
        let timeoutId;
        const debouncedFn = (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn(...args), delay);
        };
        debouncedFn.cancel = () => clearTimeout(timeoutId);
        return debouncedFn;
    },

    async fetchWithTimeout(resource, options = {}) {
        const timeout = options.timeout || 8000;
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
        if (csrfToken) {
            options.headers = {
                ...options.headers,
                'X-CSRFToken': csrfToken
            };
        }

        try {
            const response = await fetch(resource, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    }
};

document.addEventListener('alpine:init', () => {
    // Loading Component
    Alpine.data('loading', () => ({
        show: false,
        init() {
            const updateLoading = (show) => {
                requestAnimationFrame(() => this.show = show);
            };
            
            const showHandler = () => updateLoading(true);
            const hideHandler = () => updateLoading(false);
            
            window.addEventListener('loading:show', showHandler);
            window.addEventListener('loading:hide', hideHandler);
            
            return () => {
                window.removeEventListener('loading:show', showHandler);
                window.removeEventListener('loading:hide', hideHandler);
            };
        }
    }));

    // Walk Store
    Alpine.store('walks', {
        selectedWalk: null,
        pendingFavorites: new Set(),
        walkDetails: new Map(),
        
        setSelectedWalk(walk) {
            if (!walk?.id) return;
            this.selectedWalk = walk;
            if (!this.walkDetails.has(walk.id)) {
                this.walkDetails.set(walk.id, walk);
            }
        },
        
        togglePendingFavorite(walkId) {
            if (!walkId) return;
            this.pendingFavorites[this.pendingFavorites.has(walkId) ? 'delete' : 'add'](walkId);
        },
        
        isPending(walkId) {
            return Boolean(walkId && this.pendingFavorites.has(walkId));
        },
        
        getWalkDetails(walkId) {
            return walkId ? this.walkDetails.get(walkId) : null;
        },
        
        clearCache() {
            this.walkDetails.clear();
            this.pendingFavorites.clear();
            this.selectedWalk = null;
        }
    });

    // Mobile Menu Component
    Alpine.data('mobileMenu', () => ({
        isOpen: false,
        toggleMenu() {
            this.isOpen = !this.isOpen;
        }
    }));

    // Walk Interface Component
    Alpine.data('walkInterface', () => ({
        // State initialization
        walks: [],
        searchQuery: '',
        showSidebar: window.localStorage.getItem('sidebar') === 'true',
        isMapLoading: true,
        isLoading: false,
        isLoadingMore: false,
        hasMore: true,
        page: 1,
        error: null,
        map: null,
        markers: new Map(),
        pathCache: new Map(),
        loadingStates: new Map(),

        // Lifecycle methods
        init() {
            this.debouncedSearch = utils.debounce(() => this.fetchWalks(), CONFIG.DEBOUNCE_DELAY);
            this.$watch('searchQuery', () => {
                if (!this.isLoading) {
                    this.debouncedSearch();
                }
            });
            this.setupEventListeners();
            return this.initializeComponent();
        },

        async initializeComponent() {
            try {
                await Promise.all([
                    this.initializeData(),
                    this.initializeMap()
                ]);
            } catch (error) {
                this.handleError('Failed to initialize component', error);
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
                
                if (this.map) {
                    this.$nextTick(() => this.updateMarkers(this.walks));
                }
            } catch (error) {
                console.error('Failed to parse initial data:', error);
                this.error = 'Failed to load initial data';
            }
        },

        setupEventListeners() {
            window.addEventListener('walk:selected', (event) => {
                if (event.detail) {
                    this.handleWalkSelection(event.detail);
                }
            });

            document.body.addEventListener('htmx:afterRequest', (event) => {
                if (event.detail.successful) {
                    this.handleHtmxSuccess(event);
                } else {
                    this.handleHtmxError(event);
                }
            });
        },

        // Map methods
        async initializeMap() {
            if (!mapboxgl.supported()) {
                this.handleError('WebGL not supported');
                return;
            }

            try {
                const config = JSON.parse(document.getElementById('config-data')?.textContent || '{}');
                if (!config.mapboxToken) throw new Error('Mapbox token not found');

                mapboxgl.accessToken = config.mapboxToken;
                this.map = new mapboxgl.Map({
                    container: 'map',
                    style: config.map?.style || 'mapbox://styles/mapbox/standard?optimize=true',
                    center: config.map?.defaultCenter || [-4.85, 50.4],
                    zoom: config.map?.defaultZoom || 9.5,
                    preserveDrawingBuffer: true,
                    minZoom: CONFIG.MAP.MIN_ZOOM,
                    maxZoom: CONFIG.MAP.MAX_ZOOM,
                    bounds: CONFIG.MAP.BOUNDS,
                    maxBounds: CONFIG.MAP.MAX_BOUNDS
                });

                this.map.on('load', () => {
                    this.setupMapLayers();
                    this.isMapLoading = false;
                    if (this.walks.length) {
                        this.updateMarkers(this.walks);
                    }
                });

                this.map.addControl(new mapboxgl.NavigationControl(), 'top-left');
            } catch (error) {
                this.handleError('Map initialization failed', error);
            }
        },

        setupMapLayers() {
            if (!this.map) return;

            const source = 'route';
            if (this.map.getLayer(source)) this.map.removeLayer(source);
            if (this.map.getSource(source)) this.map.removeSource(source);

            this.map.addSource(source, {
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
                id: source,
                type: 'line',
                source: source,
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round',
                    'visibility': 'visible'
                },
                paint: {
                    'line-color': CONFIG.MAP.PATH_COLORS.default,
                    'line-opacity': 0.8,
                    'line-width': 4
                }
            });
        },

        // Data methods
        async fetchWalks() {
            if (this.isLoading) return;
            
            this.isLoading = true;
            window.dispatchEvent(new Event('loading:show'));

            try {
                const response = await utils.fetchWithTimeout('/api/walks/filter', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        search: this.searchQuery,
                        page: 1,
                        page_size: CONFIG.PAGE_SIZE
                    })
                });

                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                
                const data = await response.json();
                this.walks = data.walks || [];
                this.hasMore = (data.walks || []).length >= CONFIG.PAGE_SIZE;
                this.page = 1;
                this.error = null;
                
                this.updateMarkers(this.walks);
            } catch (error) {
                this.handleError('Failed to fetch walks', error);
            } finally {
                this.isLoading = false;
                window.dispatchEvent(new Event('loading:hide'));
            }
        },

        async loadMore() {
            if (this.isLoadingMore || !this.hasMore) return;
            
            this.isLoadingMore = true;
            try {
                const response = await utils.fetchWithTimeout('/api/walks/filter', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        search: this.searchQuery,
                        page: this.page + 1,
                        page_size: CONFIG.PAGE_SIZE
                    })
                });

                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                
                const data = await response.json();
                const newWalks = data.walks || [];
                this.walks = [...this.walks, ...newWalks];
                this.hasMore = newWalks.length >= CONFIG.PAGE_SIZE;
                this.page++;
                
                this.updateMarkers(this.walks);
            } catch (error) {
                this.handleError('Failed to load more walks', error);
            } finally {
                this.isLoadingMore = false;
            }
        },

        // Event Handlers
        async handleWalkSelection(detail) {
            if (!detail) return;
            
            this.$store.walks.setSelectedWalk(detail);
            this.showSidebar = true;
            window.localStorage.setItem('sidebar', 'true');
            
            await this.updatePathGeometry(detail);
        },

        async updatePathGeometry(detail) {
            if (!this.map) return;
            
            this.loadingStates.path = true;
            try {
                let geometry;
                if (this.pathCache.has(detail.id)) {
                    geometry = this.pathCache.get(detail.id);
                } else {
                    const response = await utils.fetchWithTimeout(`/api/walks/${detail.id}/geometry`);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    geometry = await response.json();
                    this.pathCache.set(detail.id, geometry);
                }

                const source = this.map.getSource('route');
                if (source) {
                    source.setData(geometry);
                    const color = CONFIG.MAP.PATH_COLORS[detail.steepness_level] || CONFIG.MAP.PATH_COLORS.default;
                    this.map.setPaintProperty('route', 'line-color', color);

                    const coordinates = geometry.coordinates;
                    const bounds = new mapboxgl.LngLatBounds();
                    coordinates.forEach(coord => bounds.extend(coord));
                    
                    this.map.fitBounds(bounds, {
                        padding: { top: 50, bottom: 50, left: 50, right: 384 },
                        maxZoom: 15,
                        duration: 1000
                    });
                }
            } catch (error) {
                this.handleError('Failed to update path', error);
            } finally {
                this.loadingStates.path = false;
            }
        },

        updateMarkers(walks) {
            if (!this.map) return;
            
            // Remove all existing markers
            this.markers.forEach(marker => marker.remove());
            this.markers.clear();

            // Add new markers
            walks.forEach(walk => {
                if (!walk.latitude || !walk.longitude) return;

                const el = document.createElement('div');
                el.className = 'marker';
                el.innerHTML = `
                    <iconify-icon icon="mdi:map-marker" 
                        class="text-2xl ${walk.steepness_level === 'Challenging' ? 'text-red-600' : 
                                        walk.steepness_level === 'Moderate' ? 'text-blue-600' : 
                                        'text-green-600'}"
                        style="cursor: pointer;">
                    </iconify-icon>
                `;

                el.addEventListener('click', () => this.handleWalkSelection(walk));

                const marker = new mapboxgl.Marker({ element: el })
                    .setLngLat([walk.longitude, walk.latitude])
                    .addTo(this.map);

                this.markers.set(walk.id, marker);
            });
        },

        handleError(message, error) {
            console.error(message, error);
            this.error = message;
            this.isLoading = false;
            this.isLoadingMore = false;
            this.isMapLoading = false;
            this.loadingStates = { path: false, map: false };
            try {
                const response = await utils.fetchWithTimeout('/api/walks/filter', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        search: this.state.searchQuery,
                        page: this.state.page + 1,
                        page_size: CONFIG.PAGE_SIZE
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                this.appendWalks(data);
            } catch (error) {
                this.handleError('Failed to load more walks', error);
            } finally {
                this.state.isLoadingMore = false;
            }
        },

        async handleWalkSelection(detail) {
            if (!detail) return;
            
            this.$store.walks.setSelectedWalk(detail);
            
            this.$nextTick(async () => {
                this.state.showSidebar = true;
                
                if (!this.mapState.pathCache.has(detail.id)) {
                    await this.fetchAndCachePath(detail);
                }
                
                this.showWalkPath(detail);
            });
        },

        async fetchAndCachePath(walk) {
            const loadingKey = `path-${walk.id}`;
            this.state.loadingStates.set(loadingKey, true);
            
            try {
                const response = await utils.fetchWithTimeout(`/api/walks/${walk.id}/path`);
                if (!response.ok) throw new Error('Failed to fetch path');
                
                const data = await response.json();
                this.mapState.pathCache.set(walk.id, data.coordinates);
            } catch (error) {
                console.error('Error fetching path:', error);
                this.mapState.pathCache.set(walk.id, []);
            } finally {
                this.state.loadingStates.delete(loadingKey);
            }
        },

        showWalkPath(walk) {
            if (!this.mapState.map || !walk) return;
            
            const coordinates = this.mapState.pathCache.get(walk.id);
            if (!coordinates?.length) return;
            
            const map = this.mapState.map;
            const bounds = utils.createBounds(coordinates);
            
            map.getSource('route').setData({
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates
                }
            });
            
            map.setPaintProperty('route', 'line-color', 
                CONFIG.MAP.PATH_COLORS[walk.steepness_level] || CONFIG.MAP.PATH_COLORS.default
            );
            
            map.fitBounds(bounds, {
                padding: { top: 50, bottom: 50, left: 50, right: 50 },
                duration: 1000
            });
            
            utils.showPathAnimation(map, coordinates);
        },

        updateMarkers(walks) {
            if (!this.mapState.map) return;
            
            // Remove existing markers
            this.mapState.markers.forEach(marker => marker.remove());
            this.mapState.markers.clear();
            
            // Add new markers
            walks.forEach(walk => {
                if (!walk.start_location) return;
                
                const marker = new mapboxgl.Marker({
                    element: utils.createMarkerElement(walk)
                })
                .setLngLat(walk.start_location)
                .addTo(this.mapState.map);
                
                this.mapState.markers.set(walk.id, marker);
            });
        },

        // State Management Methods
        updateWalksState(data) {
            this.state.walks = data.walks || [];
            this.state.hasMore = data.has_more || false;
            this.state.page = 1;
            this.state.error = null;
        },

        appendWalks(data) {
            if (data.walks?.length) {
                this.state.walks = [...this.state.walks, ...data.walks];
                this.state.page += 1;
                this.state.hasMore = data.has_more || false;
                this.updateMarkers(this.state.walks);
            }
        },

        setLoadingState(isLoading) {
            this.state.isLoading = isLoading;
            window.dispatchEvent(
                new CustomEvent(isLoading ? 'loading:show' : 'loading:hide')
            );
        },

        handleHtmxSuccess(event) {
            const walkId = event.detail.elt?.dataset?.walkId;
            if (walkId) {
                this.$store.walks.togglePendingFavorite(walkId);
            }
        },

        handleHtmxError(event) {
            console.error('HTMX request failed:', event.detail);
            this.state.error = 'Operation failed. Please try again.';
        },

        handleError(message, error) {
            console.error(message, error);
            this.state.error = message;
            this.setLoadingState(false);
        },

        // Utility Methods
        toggleSidebar() {
            this.state.showSidebar = !this.state.showSidebar;
            window.localStorage.setItem('sidebar', this.state.showSidebar);
            
            if (window.Motion) {
                window.Motion.animate('.sidebar', {
                    opacity: this.state.showSidebar ? 1 : 0,
                    transform: this.state.showSidebar ? 'translateX(0)' : 'translateX(100%)'
                }, {
                    duration: 0.3,
                    easing: 'ease-in-out'
                });
            }
        }
    }));
});

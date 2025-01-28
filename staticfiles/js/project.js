// Application defaults
const DEFAULT_CONFIG = {
    map: {
        style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
        defaultCenter: [-4.85, 50.4],
        defaultZoom: 9.5,
        markerColors: {
            default: '#FF0000',
            selected: '#00FF00',
            favorite: '#FFD700'
        }
    },
    filters: {
        categories: true,
        features: true,
        distance: true
    }
};

// Register Alpine components
document.addEventListener('alpine:init', () => {
    try {
        // Register walkInterface component
        Alpine.data('walkInterface', () => ({
            // Required properties
            showSidebar: true,
            selectedWalk: null,
            isLoading: false,
            filteredWalks: [],
            map: null,
            markers: new Map(),
            currentRoute: null,

            init() {
                const configData = document.getElementById('config-data');
                const walksData = document.getElementById('walks-data');
                
                this.config = configData ? JSON.parse(configData.textContent) : {};
                this.filteredWalks = walksData ? JSON.parse(walksData.textContent).walks || [] : [];

                this.initializeMap();
                this.setupEventListeners();

                // Listen for walk selection
                this.$el.addEventListener('walk-selected', (e) => {
                    const walk = this.filteredWalks.find(w => w.id === e.detail);
                    if (walk) {
                        this.selectWalk(walk);
                    }
                });
            },

            // Import methods from walkInterface.js
            ...window.walkInterface()
        }));

        // Register walkList component with enhanced functionality
        Alpine.data('walkList', () => ({
            // Required properties
            walks: [],
            searchQuery: '',
            error: null,
            isLoading: false,
            isLoadingMore: false,
            hasMore: true,
            page: 1,
            selectedCategories: [],
            selectedFeatures: [],
            pendingFavorites: new Set(),
            
            // Intersection observer handlers
            ['@intersect.once']() {
                this.initializeAnimations();
            },

            ['@intersect.margin.200px']() {
                if (this.hasMore && !this.isLoading) {
                    this.loadMore();
                }
            },

            init() {
                try {
                    // Initialize data from DOM
                    const walksData = document.getElementById('walks-data');
                    if (walksData) {
                        const initialWalks = JSON.parse(walksData.textContent);
                        if (Array.isArray(initialWalks.walks)) {
                            this.walks = initialWalks.walks;
                            this.hasMore = this.walks.length >= 10;
                        }
                    }

                    // Setup animations
                    if ('IntersectionObserver' in window) {
                        this.$nextTick(() => {
                            if (window.Motion) {
                                window.Motion.inView('.walk-item', {
                                    amount: 0.3,
                                    once: true
                                }).then((element) => {
                                    window.Motion.animate(element, {
                                        opacity: [0, 1],
                                        y: [50, 0],
                                        scale: [0.95, 1]
                                    }, {
                                        delay: window.Motion.stagger(0.1),
                                        duration: 0.6,
                                        easing: [0.2, 0, 0, 1]
                                    });
                                });
                            }
                        });
                    } else {
                        this.initializeAnimations();
                    }

                    // Event listeners
                    window.addEventListener('walk-favorited', this.handleFavoriteUpdate.bind(this));
                } catch (error) {
                    console.error('Error initializing walks:', error);
                    this.error = 'Failed to load initial walks data';
                }
            },

            // Initialize animations
            initializeAnimations() {
                this.$nextTick(() => {
                    if (window.WalkAnimations) {
                        window.WalkAnimations.initializeHoverEffects();
                    }
                });
            },

            // Handle favorite updates
            handleFavoriteUpdate(event) {
                const { walkId, isFavorite } = event.detail;
                const walk = this.walks.find(w => w.id === walkId);
                if (walk) {
                    walk.is_favorite = isFavorite;
                    this.pendingFavorites.delete(walkId);
                }
            },

            async searchWalks() {
                this.page = 1;
                this.walks = [];
                this.isLoading = true;
                
                try {
                    const response = await window.ApiService.filterWalks({
                        search: this.searchQuery,
                        page: 1,
                        page_size: 10
                    });

                    this.walks = response.walks || [];
                    this.hasMore = this.walks.length >= 10;

                    this.$nextTick(() => {
                        this.initializeAnimations();
                    });
                } catch (error) {
                    console.error('Error searching walks:', error);
                    this.error = 'Failed to search walks';
                } finally {
                    this.isLoading = false;
                }
            },

            async loadMore() {
                if (this.isLoadingMore || !this.hasMore) return;
                
                try {
                    this.isLoadingMore = true;
                    const nextPage = this.page + 1;
                    
                    const response = await window.ApiService.filterWalks({
                        search: this.searchQuery,
                        page: nextPage,
                        page_size: 10
                    });

                    const newWalks = response.walks || [];
                    this.walks = [...this.walks, ...newWalks];
                    this.hasMore = newWalks.length >= 10;
                    this.page = nextPage;
                    
                    this.$nextTick(() => {
                        this.initializeAnimations();
                    });
                } catch (error) {
                    console.error('Error loading more walks:', error);
                    this.error = 'Failed to load more walks';
                } finally {
                    this.isLoadingMore = false;
                }
            }
        }));

        console.log('Alpine components registered successfully');
    } catch (error) {
        console.error('Error registering Alpine components:', error);
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.classList.remove('hidden');
            errorContainer.textContent = 'Failed to initialize components. Please refresh the page.';
        }
    }
});

// Initialize features after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.WalkAnimations) {
        window.WalkAnimations.initializeHoverEffects();
    } else {
        window.addEventListener('motion:ready', () => {
            if (window.WalkAnimations) {
                window.WalkAnimations.initializeHoverEffects();
            }
        });
    }
});

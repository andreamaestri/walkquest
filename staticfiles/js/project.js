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

// Initialize card hover animations
const initializeCardHover = () => {
    if (!window.Motion) return;

    window.Motion.hover('.walk-item', (element) => {
        // Start hover animation
        const animations = [
            // Card elevation and scale
            window.Motion.animate(element, 
                { 
                    scale: 1.02,
                    y: -4,
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                },
                { 
                    duration: 0.3,
                    easing: [0.2, 0, 0, 1] // Custom ease-out cubic-bezier
                }
            ),
            
            // Animate categories
            window.Motion.animate(
                element.querySelectorAll('.category-tag'),
                { 
                    scale: 1.05,
                    backgroundColor: '#E0E7FF', // Indigo-100
                    color: '#4338CA' // Indigo-700
                },
                { 
                    duration: 0.2,
                    delay: window.Motion.stagger(0.03)
                }
            ),

            // Highlights section
            window.Motion.animate(
                element.querySelector('.highlights'),
                {
                    opacity: [0, 1],
                    y: [10, 0]
                },
                {
                    duration: 0.2,
                    delay: 0.1
                }
            )
        ];

        // Return cleanup function
        return () => {
            // Reverse all animations on hover end
            animations.forEach(animation => {
                animation.reverse();
            });
        };
    });
};

// Initialize application dependencies
document.addEventListener('DOMContentLoaded', () => {
    // Initialize ApiService before Alpine
    if (window.ApiService) {
        window.ApiService.init();
    }

    // Initialize hover animations
    initializeCardHover();
});

// Initialize Alpine.js components and stores
document.addEventListener('alpine:init', () => {
    try {
        // Register the walkList component
        Alpine.data('walkList', () => ({
            walks: [],
            searchQuery: '',
            error: null,
            isLoading: false,
            isLoadingMore: false,
            hasMore: true,
            currentPage: 1,
            selectedCategories: [],
            selectedFeatures: [],
            pendingFavorites: new Set(),

            init() {
                try {
                    // Initialize from existing walks data
                    const walksData = document.getElementById('walks-data');
                    if (walksData) {
                        const initialWalks = JSON.parse(walksData.textContent);
                        if (Array.isArray(initialWalks)) {
                            this.walks = initialWalks;
                            this.hasMore = initialWalks.length >= 10;
                        }
                    }

                    // Listen for favorite updates from other components
                    window.addEventListener('walk-favorited', (e) => {
                        this.handleFavoriteUpdate(e.detail.walkId, e.detail.isFavorite);
                    });

                    // Initialize animations after Alpine renders the component
                    this.$nextTick(() => {
                        this.initializeAnimations();
                        initializeCardHover(); // Re-initialize hover effects after new cards are added
                    });
                } catch (error) {
                    console.error('Error initializing walks:', error);
                    this.error = 'Failed to load initial walks data';
                }
            },

            initializeAnimations() {
                if (!window.Motion) return;

                window.Motion.animate('.walk-item',
                    {
                        opacity: [0, 1],
                        y: [50, 0],
                        scale: [0.95, 1]
                    },
                    {
                        delay: window.Motion.stagger(0.15),
                        duration: 0.8,
                        easing: [0.33, 1, 0.68, 1]
                    }
                );
            },

            async fetchWalks(resetList = true) {
                if (resetList) {
                    this.isLoading = true;
                    this.currentPage = 1;
                    this.walks = [];
                    this.error = null;
                } else {
                    this.isLoadingMore = true;
                }

                try {
                    const response = await window.ApiService.filterWalks({
                        search: this.searchQuery,
                        categories: this.selectedCategories,
                        features: this.selectedFeatures,
                        page: this.currentPage,
                        page_size: 10
                    });

                    const walks = response.walks;

                    if (resetList) {
                        this.walks = walks;
                        this.$nextTick(() => {
                            this.initializeAnimations();
                            initializeCardHover(); // Re-initialize hover effects
                        });
                    } else {
                        this.walks = [...this.walks, ...walks];
                        this.$nextTick(() => {
                            if (window.Motion) {
                                window.Motion.animate(
                                    '.walk-item:nth-last-child(-n+10)',
                                    {
                                        opacity: [0, 1],
                                        y: [50, 0],
                                        scale: [0.95, 1]
                                    },
                                    {
                                        delay: window.Motion.stagger(0.15),
                                        duration: 0.8,
                                        easing: [0.33, 1, 0.68, 1]
                                    }
                                );
                            }
                            initializeCardHover(); // Re-initialize hover effects for new cards
                        });
                    }

                    this.hasMore = walks.length >= 10;
                } catch (error) {
                    console.error('Error fetching walks:', error);
                    this.error = 'Failed to load walks. Please try again.';
                } finally {
                    this.isLoading = false;
                    this.isLoadingMore = false;
                }
            },

            async toggleFavorite(walkId) {
                if (!walkId || this.pendingFavorites.has(walkId)) return;

                const walk = this.walks.find(w => w.id === walkId);
                if (!walk) return;

                this.pendingFavorites.add(walkId);
                const newValue = !walk.is_favorite;
                walk.is_favorite = newValue;

                try {
                    const result = await window.ApiService.toggleFavorite(walkId);
                    if (result.status !== 'success') {
                        walk.is_favorite = !newValue;
                        throw new Error(result.message || 'Failed to update favorite status');
                    }

                    window.dispatchEvent(new CustomEvent('walk-favorited', {
                        detail: { walkId, isFavorite: newValue }
                    }));
                } catch (error) {
                    console.error('Error toggling favorite:', error);
                    this.error = 'Failed to update favorite status';
                } finally {
                    this.pendingFavorites.delete(walkId);
                }
            },

            async loadMore() {
                if (this.isLoading || this.isLoadingMore || !this.hasMore) return;
                this.currentPage++;
                await this.fetchWalks(false);
            },

            updateWalk(walkId, newData) {
                const index = this.walks.findIndex(w => w.id === walkId);
                if (index === -1) {
                    console.warn('Walk not found:', walkId);
                    return;
                }
                Object.assign(this.walks[index], newData);
            },

            handleFavoriteUpdate(walkId, isFavorite) {
                const walk = this.walks.find(w => w.id === walkId);
                if (walk && walk.is_favorite !== isFavorite) {
                    walk.is_favorite = isFavorite;
                }
            },

            setCategories(categories) {
                this.selectedCategories = categories;
                this.fetchWalks();
            },

            setFeatures(features) {
                this.selectedFeatures = features;
                this.fetchWalks();
            },

            resetFilters() {
                this.selectedCategories = [];
                this.selectedFeatures = [];
                this.searchQuery = '';
                this.fetchWalks();
            }
        }));

        console.log('Project initialization completed');
    } catch (error) {
        console.error('Initialization error:', error);
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.classList.remove('hidden');
            errorContainer.textContent = 'Application initialization failed. Please refresh the page.';
        }
    }
});

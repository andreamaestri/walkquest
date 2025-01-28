// Optimize hover animations with motion best practices
const initializeHoverEffects = () => {
    if (!window.Motion) return;

    // Use Motion's hover API with configuration options
    window.Motion.hover('.walk-item', {
        // Set hover scale threshold
        scale: 1.02,
        // Add spring physics
        spring: {
            stiffness: 300,
            damping: 25
        },
        // Add enter/leave callbacks
        enter: (element) => {
            const expandableContent = element.querySelector('.expandable-content');
            if (!expandableContent) return;

            // Get natural height once
            expandableContent.style.height = 'auto';
            const targetHeight = expandableContent.offsetHeight;
            expandableContent.style.height = '0px';
            expandableContent.style.opacity = '0';

            return window.Motion.animate([
                [element, {
                    y: -8,
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                }],
                [expandableContent, {
                    height: targetHeight,
                    opacity: 1,
                    marginTop: 16
                }, {
                    duration: 0.3,
                    easing: [0.2, 0, 0, 1]
                }],
                [element.querySelectorAll('.category-tag'), {
                    scale: 1.05,
                    backgroundColor: '#E0E7FF',
                    color: '#4338CA' 
                }, {
                    delay: window.Motion.stagger(0.05)
                }]
            ]);
        },
        leave: (element) => {
            const expandableContent = element.querySelector('.expandable-content');
            if (!expandableContent) return;

            return window.Motion.animate([
                [element, {
                    y: 0,
                    scale: 1,
                    boxShadow: 'none'
                }],
                [expandableContent, {
                    height: 0,
                    opacity: 0,
                    marginTop: 0
                }, {
                    duration: 0.2,
                    easing: [0.4, 0, 0.2, 1]
                }],
                [element.querySelectorAll('.category-tag'), {
                    scale: 1,
                    backgroundColor: '#EEF2FF',
                    color: '#4F46E5'
                }]
            ]);
        }
    });
};

// Optimize Alpine component with intersection observer 
document.addEventListener('alpine:init', () => {
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
        
        // Add intersection observer handling
        ['@intersect.once']() {
            // Load initial data when component enters viewport
            this.initializeAnimations();
        },

        ['@intersect.margin.200px']() {
            // Load more data when near bottom
            if (this.hasMore && !this.isLoading) {
                this.loadMore();
            }
        },

        init() {
            try {
                // Only initialize essential data
                const walksData = document.getElementById('walks-data');
                if (walksData) {
                    const initialWalks = JSON.parse(walksData.textContent);
                    if (Array.isArray(initialWalks)) {
                        this.walks = initialWalks;
                        this.hasMore = initialWalks.length >= 10;
                    }
                }

                // Lazy load animations
                if ('IntersectionObserver' in window) {
                    this.$nextTick(() => {
                        // Use Motion's inView for entrance animations
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
                    });
                } else {
                    // Fallback for older browsers
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
                initializeHoverEffects();
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

        // Load more walks
        async loadMore() {
            if (this.isLoadingMore || !this.hasMore) return;

            this.isLoadingMore = true;
            try {
                const nextPage = this.currentPage + 1;
                const response = await fetch(`/api/walks/?page=${nextPage}`);
                const data = await response.json();

                if (Array.isArray(data.results)) {
                    this.walks = [...this.walks, ...data.results];
                    this.hasMore = data.next !== null;
                    this.currentPage = nextPage;

                    // Initialize animations for new items
                    this.$nextTick(() => {
                        initializeHoverEffects();
                    });
                }
            } catch (error) {
                console.error('Error loading more walks:', error);
                this.error = 'Failed to load more walks';
            } finally {
                this.isLoadingMore = false;
            }
        }
    }));
});
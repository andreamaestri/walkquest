// Wait for both Alpine and Motion to be available
document.addEventListener('alpine:init', () => {
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
            } catch (error) {
                console.error('Error initializing walks:', error);
                this.error = 'Failed to load initial walks data';
            }

            // Listen for favorite updates from other components
            window.addEventListener('walk-favorited', (e) => {
                this.handleFavoriteUpdate(e.detail.walkId, e.detail.isFavorite);
            });

            // Initialize animations after Alpine renders the component
            this.$nextTick(() => {
                this.initializeAnimations();
            });
        },

        initializeAnimations() {
            // Use window.Motion since it's globally available
            if (window.Motion) {
                window.Motion.animate('.walk-item',
                    { 
                        opacity: [0, 1],
                        y: [20, 0]
                    },
                    { delay: window.Motion.stagger(0.1), duration: 0.6, easing: 'ease-out' });
            }
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
                const params = new URLSearchParams();
                
                if (this.searchQuery) {
                    params.append('search', this.searchQuery);
                }
                if (this.currentPage) {
                    params.append('page', this.currentPage);
                    params.append('page_size', 10);
                }
                if (this.selectedCategories.length) {
                    params.append('categories', this.selectedCategories.join(','));
                }
                if (this.selectedFeatures.length) {
                    params.append('features', this.selectedFeatures.join(','));
                }

                const response = await fetch(`/api/walks?${params}`);
                const data = await response.json();
                
                const walks = Array.isArray(data) ? data : (data.walks || []);
                
                if (!Array.isArray(walks)) {
                    throw new Error('Invalid walks data format');
                }

                if (resetList) {
                    this.walks = walks;
                    this.$nextTick(() => {
                        this.initializeAnimations();
                    });
                } else {
                    this.walks = [...this.walks, ...walks];
                    this.$nextTick(() => {
                        if (window.Motion) {
                            window.Motion.animate(
                                '.walk-item:nth-last-child(-n+10)',
                                { 
                                    opacity: [0, 1],
                                    y: [20, 0]
                                },
                                { delay: window.Motion.stagger(0.1), duration: 0.6, easing: 'ease-out' });
                        }
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
                const response = await fetch(`/api/walks/${walkId}/favorite`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                    }
                });

                const data = await response.json();
                if (data.status !== 'success') {
                    walk.is_favorite = !newValue;
                    throw new Error(data.message || 'Failed to update favorite status');
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
});
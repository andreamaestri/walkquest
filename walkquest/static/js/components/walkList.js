// Initialize walk list component
document.addEventListener('alpine:init', () => {
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

        // Initialize component
        init() {
            try {
                // Initialize data from DOM
                const walksData = document.getElementById('walks-data');
                if (walksData) {
                    const initialData = JSON.parse(walksData.textContent);
                    this.walks = Array.isArray(initialData) ? initialData : (initialData.walks || []);
                    this.hasMore = this.walks.length >= 10;
                }

                // Setup animations
                this.$nextTick(() => {
                    if (window.WalkAnimations) {
                        window.WalkAnimations.initializeHoverEffects();
                    }
                });

                // Event listeners
                window.addEventListener('walk-favorited', this.handleFavoriteUpdate.bind(this));
            } catch (error) {
                console.error('Error initializing walks:', error);
                this.error = 'Failed to load initial walks data';
            }
        },

        // Search walks (required by template)
        async fetchWalks() {
            if (this.isLoading) return;

            try {
                this.isLoading = true;
                this.error = null;
                this.page = 1;
                
                const response = await window.ApiService.filterWalks({
                    search: this.searchQuery,
                    page: this.page,
                    page_size: 10
                });

                this.walks = response.walks || [];
                this.hasMore = this.walks.length >= 10;

                this.$nextTick(() => {
                    if (window.WalkAnimations) {
                        window.WalkAnimations.initializeHoverEffects();
                    }
                });
            } catch (error) {
                console.error('Error searching walks:', error);
                this.error = 'Failed to search walks';
            } finally {
                this.isLoading = false;
            }
        },

        // Load more walks
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
                    if (window.WalkAnimations) {
                        window.WalkAnimations.initializeHoverEffects();
                    }
                });
            } catch (error) {
                console.error('Error loading more walks:', error);
                this.error = 'Failed to load more walks';
            } finally {
                this.isLoadingMore = false;
            }
        },

        // Handle favorite updates
        handleFavoriteUpdate(event) {
            const { walkId, isFavorite } = event.detail;
            const walk = this.walks.find(w => w.id === walkId);
            if (walk) {
                walk.is_favorite = isFavorite;
                this.pendingFavorites.delete(walkId);
            }
        }
    }));
});
// Enhanced walk list component with reactive features
function walkList() {
    return {
        walks: [],
        isLoading: true,
        isLoadingMore: false,
        searchQuery: '',
        currentPage: 1,
        hasMore: true,
        selectedCategories: [],
        selectedFeatures: [],
        error: null,
        pendingFavorites: new Set(), // Track optimistic updates

        init() {
            // Initialize from existing walks data if available
            const walksData = document.getElementById('walks-data');
            if (walksData) {
                const data = JSON.parse(walksData.textContent);
                this.walks = data.walks || [];
                this.hasMore = data.walks?.length >= 10; // Assume pagination of 10
            }
            this.isLoading = false;

            // Listen for favorite updates from other components
            window.addEventListener('walk-favorited', (e) => {
                this.handleFavoriteUpdate(e.detail.walkId, e.detail.isFavorite);
            });
        },

        // Fetch walks with search and filters
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
                const params = new URLSearchParams({
                    search: this.searchQuery,
                    page: this.currentPage,
                    categories: this.selectedCategories.join(','),
                    features: this.selectedFeatures.join(',')
                });

                const response = await fetch(`/api/walks?${params}`);
                const data = await response.json();

                if (resetList) {
                    this.walks = data;
                } else {
                    this.walks = [...this.walks, ...data];
                }

                this.hasMore = data.length >= 10; // Assume pagination of 10
            } catch (error) {
                console.error('Error fetching walks:', error);
                this.error = 'Failed to load walks. Please try again.';
            } finally {
                this.isLoading = false;
                this.isLoadingMore = false;
            }
        },

        // Optimistic favorite toggle
        async toggleFavorite(walkId) {
            // Prevent double-clicking
            if (this.pendingFavorites.has(walkId)) return;

            this.pendingFavorites.add(walkId);
            const walk = this.walks.find(w => w.id === walkId);
            if (!walk) return;

            // Optimistically update UI
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
                    // Revert on failure
                    walk.is_favorite = !newValue;
                    throw new Error(data.message || 'Failed to update favorite status');
                }

                // Dispatch event for other components
                window.dispatchEvent(new CustomEvent('walk-favorited', {
                    detail: { walkId, isFavorite: newValue }
                }));
            } catch (error) {
                console.error('Error toggling favorite:', error);
                // Show error toast/notification here if needed
            } finally {
                this.pendingFavorites.delete(walkId);
            }
        },

        // Handle infinite scroll
        async loadMore() {
            if (this.isLoadingMore || !this.hasMore) return;
            this.currentPage++;
            await this.fetchWalks(false);
        },

        // Update walk in list
        updateWalk(walkId, newData) {
            const index = this.walks.findIndex(w => w.id === walkId);
            if (index !== -1) {
                // Preserve reactive references while updating
                Object.assign(this.walks[index], newData);
            }
        },

        // Handle favorite updates from other components
        handleFavoriteUpdate(walkId, isFavorite) {
            const walk = this.walks.find(w => w.id === walkId);
            if (walk && walk.is_favorite !== isFavorite) {
                walk.is_favorite = isFavorite;
            }
        },

        // Filter methods
        setCategories(categories) {
            this.selectedCategories = categories;
            this.fetchWalks();
        },

        setFeatures(features) {
            this.selectedFeatures = features;
            this.fetchWalks();
        },

        // Reset all filters
        resetFilters() {
            this.selectedCategories = [];
            this.selectedFeatures = [];
            this.searchQuery = '';
            this.fetchWalks();
        }
    };
}

// Register as Alpine component
if (window.Alpine) {
    window.Alpine.data('walkList', walkList);
} else {
    document.addEventListener('alpine:init', () => {
        window.Alpine.data('walkList', walkList);
    });
}

export default walkList;
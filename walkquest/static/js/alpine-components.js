// Define WalkQuest Alpine plugin
function walkquestPlugin(Alpine) {
    // Set up shared state
    Alpine.store('walkState', {
        pendingFavorites: new Set(),
        selectedWalk: null
    });

    // Register magic methods
    Alpine.magic('walkService', () => ({
        async toggleFavorite(walkId) {
            return await window.ApiService.toggleFavorite(walkId);
        },
        async filterWalks(params) {
            return await window.ApiService.filterWalks(params);
        }
    }));

    // Register components
    Alpine.data('walkInterface', () => ({
        showSidebar: false,
        selectedWalk: null,
        config: window.walkquestConfig || {},
        pendingFavorites: new Set(),

        init() {
            console.log('Initializing walkInterface component...');
            if (!window.ApiService?.init) {
                console.error('ApiService not properly initialized');
                return;
            }
        },

        handleWalkSelection(detail) {
            if (!detail) return;
            
            this.selectedWalk = detail;
            this.showSidebar = true;
            
            // Dispatch event for map updating
            window.dispatchEvent(new CustomEvent('walk-selected', {
                detail: this.selectedWalk
            }));
        },

        async toggleFavorite(walkId) {
            if (this.pendingFavorites.has(walkId)) return;
            
            this.pendingFavorites.add(walkId);
            try {
                const result = await window.ApiService.toggleFavorite(walkId);
                const walk = this.walks.find(w => w.id === walkId);
                if (walk) {
                    walk.is_favorite = result.is_favorite;
                }
            } catch (error) {
                console.error('Failed to toggle favorite:', error);
            } finally {
                this.pendingFavorites.delete(walkId);
            }
        }
    }));

    Alpine.data('walkList', () => ({
        walks: [],
        isLoading: false,
        isLoadingMore: false,
        hasMore: false,
        error: null,
        searchQuery: '',
        page: 1,
        pendingFavorites: new Set(),
        
        init() {
            console.log('Initializing walkList component...');
            const walksData = document.getElementById('walks-data');
            if (walksData) {
                try {
                    const initialData = JSON.parse(walksData.textContent);
                    this.walks = initialData.walks || [];
                    this.hasMore = initialData.hasMore || false;
                } catch (err) {
                    console.error('Failed to parse initial walks data:', err);
                }
            }
            this.fetchWalks();
        },

        async fetchWalks() {
            this.isLoading = true;
            this.error = null;
            try {
                const response = await this.$walkService.filterWalks({
                    search: this.searchQuery,
                    page: 1,
                    page_size: 10
                });
                this.walks = response.walks || [];
                this.hasMore = (response.walks || []).length >= 10;
                this.page = 1;
            } catch (err) {
                console.error('Failed to fetch walks:', err);
                this.error = 'Failed to load walks. Please try again.';
            } finally {
                this.isLoading = false;
            }
        },

        async loadMore() {
            if (this.isLoadingMore || !this.hasMore) return;
            this.isLoadingMore = true;
            this.page++;
            try {
                const response = await this.$walkService.filterWalks({
                    search: this.searchQuery,
                    page: this.page,
                    page_size: 10
                });
                const newWalks = response.walks || [];
                this.walks = [...this.walks, ...newWalks];
                this.hasMore = newWalks.length >= 10;
            } catch (err) {
                console.error('Failed to load more walks:', err);
                this.error = 'Failed to load more walks. Please try again.';
                this.page--;
            } finally {
                this.isLoadingMore = false;
            }
        },

        handleError(message) {
            this.error = message;
            console.error('Walk list error:', message);
        },

        checkScroll() {
            const scrollPosition = window.innerHeight + window.scrollY;
            const documentHeight = document.documentElement.scrollHeight;
            const threshold = 200;
            if (documentHeight - scrollPosition < threshold) {
                this.loadMore();
            }
        },

        async toggleFavorite(walkId) {
            if (this.pendingFavorites.has(walkId)) return;
            this.pendingFavorites.add(walkId);
            try {
                const result = await this.$walkService.toggleFavorite(walkId);
                const walk = this.walks.find(w => w.id === walkId);
                if (walk) {
                    walk.is_favorite = result.is_favorite;
                }
            } catch (error) {
                console.error('Failed to toggle favorite:', error);
            } finally {
                this.pendingFavorites.delete(walkId);
            }
        }
    }));

}

// Register plugin with Alpine
document.addEventListener('alpine:init', () => {
    console.log('Registering WalkQuest Alpine plugin...');
    Alpine.plugin(walkquestPlugin);
    console.log('WalkQuest Alpine plugin registered successfully');
});

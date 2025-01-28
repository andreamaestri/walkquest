// Wait for dependencies to be available
if (!window.ApiService) {
    console.error('ApiService must be loaded before Alpine components');
}

// Ensure Alpine.js is loaded
const initializeComponents = () => {
    if (typeof window.Alpine === 'undefined') {
        console.error('Alpine.js must be loaded before initializing components');
        return;
    }
    console.log('Alpine.js detected, proceeding with initialization');
};

// Initialize when Alpine is ready
document.addEventListener('alpine:init', () => {
    initializeComponents();
    console.log('Initializing Alpine components...');

    // Set up shared state
    Alpine.store('walkState', {
        pendingFavorites: new Set(),
        selectedWalk: null
    });

    // Log initialization
    console.log('Alpine.js initialization started');

    // Main interface component
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

    // Define walkList component globally first
    window.walkList = function() {
        return {
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
            // Initialize with any existing data
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
            
            // Fetch fresh data
            this.fetchWalks();
        },

        async fetchWalks() {
            this.isLoading = true;
            this.error = null;
            
            try {
                const response = await window.ApiService.filterWalks({
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
                const response = await window.ApiService.filterWalks({
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
                this.page--; // Revert page increment on error
            } finally {
                this.isLoadingMore = false;
            }
        },

        handleError(message) {
            this.error = message;
            console.error('Walk list error:', message);
        },

        checkScroll() {
            // Check if we're near the bottom of the page
            const scrollPosition = window.innerHeight + window.scrollY;
            const documentHeight = document.documentElement.scrollHeight;
            const threshold = 200; // pixels from bottom

            if (documentHeight - scrollPosition < threshold) {
                this.loadMore();
            }
        }
        };
    };

    // Then register it with Alpine
    Alpine.data('walkList', window.walkList);

    console.log('Alpine components initialized successfully');
});

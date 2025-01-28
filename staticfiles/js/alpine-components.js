document.addEventListener('alpine:init', () => {
    // Main interface component
    Alpine.data('walkInterface', () => ({
        showSidebar: false,
        selectedWalk: null,

        init() {
            // Initialize map and interface
            const configData = document.getElementById('config-data');
            if (configData) {
                this.config = JSON.parse(configData.textContent);
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
        }
    }));

    // Walk list component
    Alpine.data('walkList', () => ({
        walks: [],
        isLoading: false,
        isLoadingMore: false,
        hasMore: false,
        error: null,
        searchQuery: '',
        page: 1,
        
        init() {
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
                    page: 1, // Reset to first page
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
        }
    }));
});
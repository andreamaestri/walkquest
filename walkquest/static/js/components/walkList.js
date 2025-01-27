// Wait for Alpine.js to be available
if (typeof Alpine === 'undefined') {
    console.error('Alpine.js is not loaded. Please ensure Alpine.js is included before this script.');
}

// Register walkList Alpine component
document.addEventListener('alpine:init', () => {
    Alpine.data('walkList', () => ({
        // Data properties
        walks: [],
        searchQuery: '',
        isLoading: false,
        selectedWalk: null,
        filters: {
            categories: [],
            features: [],
            difficulty: null,
            hasStiles: null,
            hasBus: null
        },

        // Lifecycle hook
        init() {
            // Initialize with data from template if available
            const walksData = document.getElementById('walks-data');
            if (walksData) {
                try {
                    const data = JSON.parse(walksData.textContent);
                    this.walks = data.walks || [];
                } catch (error) {
                    console.error('Error parsing initial walks data:', error);
                    this.walks = [];
                }
            }
            // Initial fetch
            this.fetchWalks();
        },

        // Methods
        async fetchWalks() {
            this.isLoading = true;
            try {
                // Build query parameters
                const params = new URLSearchParams();
                if (this.searchQuery) params.append('search', this.searchQuery);
                if (this.filters.categories.length) params.append('categories', this.filters.categories.join(','));
                if (this.filters.features.length) params.append('features', this.filters.features.join(','));
                if (this.filters.difficulty) params.append('difficulty', this.filters.difficulty);
                if (this.filters.hasStiles !== null) params.append('has_stiles', this.filters.hasStiles);
                if (this.filters.hasBus !== null) params.append('has_bus', this.filters.hasBus);

                const response = await fetch(`/api/walks?${params.toString()}`, {
                    headers: {
                        'Accept': 'application/json',
                        'X-CSRFToken': document.querySelector('meta[name="csrf-token"]')?.content
                    },
                    credentials: 'same-origin'
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                this.walks = Array.isArray(data) ? data : [];
                
                // Dispatch event for map update
                this.$dispatch('walks-updated', this.walks);
            } catch (error) {
                console.error('Error fetching walks:', error);
                this.walks = [];
            } finally {
                this.isLoading = false;
            }
        },

        async toggleFavorite(walkId) {
            try {
                const response = await fetch(`/api/walks/${walkId}/favorite`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'X-CSRFToken': document.querySelector('meta[name="csrf-token"]')?.content
                    },
                    credentials: 'same-origin'
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                if (data.status === 'success') {
                    // Update the walk in the list
                    this.walks = this.walks.map(walk => 
                        walk.id === walkId 
                            ? { ...walk, is_favorite: data.is_favorite }
                            : walk
                    );
                }
            } catch (error) {
                console.error('Error toggling favorite:', error);
            }
        },

        selectWalk(walkId) {
            this.selectedWalk = this.walks.find(w => w.id === walkId) || null;
            this.$dispatch('walk-selected', this.selectedWalk);
        },

        formatDistance(distance) {
            return `${distance.toFixed(1)} km`;
        },

        getDifficultyClass(level) {
            const classes = {
                'EASY': 'bg-green-100 text-green-800',
                'MODERATE': 'bg-yellow-100 text-yellow-800',
                'HARD': 'bg-red-100 text-red-800'
            };
            return classes[level] || 'bg-gray-100 text-gray-800';
        },

        updateFilters(type, value) {
            this.filters[type] = value;
            this.fetchWalks();
        }
    }));
});
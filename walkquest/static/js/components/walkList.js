import { api } from '../services.js';

// Register walkList Alpine component
document.addEventListener('alpine:init', () => {
    Alpine.data('walkList', () => ({
        searchQuery: '',
        isLoading: false,
        walks: [],
        selectedWalk: null,

        init() {
            // Get initial walks data from the template
            const walksData = document.getElementById('walks-data');
            if (walksData) {
                this.walks = JSON.parse(walksData.textContent).walks || [];
            }
        },

        async fetchWalks() {
            this.isLoading = true;
            try {
                const { walks } = await api.filterWalks({ search: this.searchQuery });
                this.walks = walks;
            } catch (error) {
                console.error('Failed to fetch walks:', error);
                this.walks = [];
            } finally {
                this.isLoading = false;
            }
        },

        selectWalk(id) {
            // Emit event to parent component
            this.$dispatch('walk-selected', id);
        }
    }));
});
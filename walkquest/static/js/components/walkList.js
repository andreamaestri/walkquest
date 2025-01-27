document.addEventListener('alpine:init', () => {
    Alpine.data('walkList', () => ({
        walks: [],
        searchQuery: '',
        isLoading: false,
        selectedWalk: null,

        async init() {
            await this.fetchWalks();
        },

        async fetchWalks() {
            this.isLoading = true;
            try {
                const params = new URLSearchParams();
                if (this.searchQuery) {
                    params.append('search', this.searchQuery);
                }
                
                const response = await fetch(`/api/walks?${params}`);
                if (!response.ok) throw new Error('Network response was not ok');
                this.walks = await response.json();
            } catch (error) {
                console.error('Error fetching walks:', error);
            } finally {
                this.isLoading = false;
            }
        },

        selectWalk(walkId) {
            this.selectedWalk = this.walks.find(w => w.id === walkId);
            // Emit event for map interaction
            this.$dispatch('walk-selected', { walkId });
        }
    }));
});
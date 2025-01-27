// Alpine.js component for walk interface
document.addEventListener('alpine:init', () => {
    Alpine.data('walkInterface', () => ({
        showSidebar: true,
        searchQuery: '',
        isLoading: false,
        selectedWalk: null,
        filteredWalks: [],
        map: null,
        markers: new Map(),
        currentRoute: null,

        init() {
            const walksData = JSON.parse(document.getElementById('walks-data').textContent);
            this.filteredWalks = walksData;
            this.isLoading = false;
        },

        selectWalk(walkId) {
            this.selectedWalk = this.filteredWalks.find(walk => walk.id === walkId);
        },

        formatDistance(distance) {
            if (!distance) return '0 km';
            return `${(distance / 1000).toFixed(1)} km`;
        }
    }));
});
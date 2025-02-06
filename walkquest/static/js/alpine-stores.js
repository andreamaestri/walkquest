// Store configurations
export const globalsStore = {
    mobileMenu: {
        isOpen: false,
        toggle() {
            this.isOpen = !this.isOpen;
        }
    },
    fullscreen: false,
    showSidebar: false,
    error: null,
    isLoading: false,
    isMapLoading: false,
    loadingStates: {
        map: false,
        path: false,
        search: false
    },
    searchQuery: ''
};

export const walksStore = {
    selectedWalk: null,
    loading: false,
    pendingFavorites: new Set(),
    expandedWalkId: null,
    
    expandWalk(walkId) {
        this.expandedWalkId = this.expandedWalkId === walkId ? null : walkId;
        window.dispatchEvent(new CustomEvent('walk:expansion-changed', {
            detail: { walkId: this.expandedWalkId }
        }));
    },

    isPending(walkId) {
        return this.pendingFavorites.has(walkId);
    },

    setSelectedWalk(detail) {
        this.selectedWalk = detail;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Initialize stores
    Alpine.store('globals', globalsStore);
    Alpine.store('walks', walksStore);
});
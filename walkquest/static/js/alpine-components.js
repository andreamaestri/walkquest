// ... existing code ...

Alpine.store('walks', {
    selectedWalk: null,
    pendingFavorites: new Set(),
    markerStates: {}, // New state for marker-specific data
    
    setSelectedWalk(walk) {
        this.selectedWalk = walk;
        window.dispatchEvent(new CustomEvent('walkSelected', { detail: walk }));
    },
    
    togglePendingFavorite(walkId) {
        this.pendingFavorites.has(walkId) 
            ? this.pendingFavorites.delete(walkId)
            : this.pendingFavorites.add(walkId);
        window.dispatchEvent(new CustomEvent('favoriteToggled', { detail: walkId }));
    },
    
    updateMarkerState(walkId, state) {
        this.markerStates[walkId] = state;
        window.dispatchEvent(new CustomEvent('markerStateChanged', { detail: { walkId, state } }));
    }
});

// ... existing code ...

const initializeHoverEffects = () => {
    if (!window.Motion) return;

    window.Motion.hover('.walk-item', (element) => {
        const expandableContent = element.querySelector('.expandable-content');
        if (!expandableContent) return;

        // Get natural height once
        expandableContent.style.height = 'auto';
    });
};

const initializePressHandlers = () => {
    if (!window.Motion) return;
    
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && 
                mutation.attributeName === 'class' && 
                mutation.target.classList.contains('walk-item')) {
                
                const element = mutation.target;
                // Update marker state when card state changes
                if (element.classList.contains('expanded')) {
                    Alpine.store('walks').updateMarkerState(
                        element.dataset.walkId, 
                        { expanded: true }
                    );
                }
            }
        });
    });

    // ... existing code ...
};

// Define walk interface component
Alpine.data('walkInterface', () => ({
    // ... existing properties ...

    init() {
        return new Promise(async (resolve) => {
            console.group('WalkInterface Initialization');
            console.log('Starting initialization...');
            
            try {
                await this.initializeData();
                await this.initializeMap();
                await this.fetchWalks();
                
                // Add event listeners for state changes
                window.addEventListener('walkSelected', (e) => {
                    this.handleWalkSelection(e.detail);
                });
                
                window.addEventListener('favoriteToggled', (e) => {
                    this.handleFavoriteToggle(e.detail);
                });
                
                window.addEventListener('markerStateChanged', (e) => {
                    this.handleMarkerStateChange(e.detail);
                });
                
                console.log('Initialization complete');
            } catch (error) {
                console.error('Initialization failed:', error);
                this.error = 'Failed to initialize interface';
            } finally {
                console.groupEnd();
                resolve();
            }
        });
    },

    // ... existing methods ...

    handleWalkSelection(detail) {
        if (!detail || !window.htmx) {
            console.error('Invalid walk detail or HTMX not loaded');
            return;
        }

        // Update store and UI state
        Alpine.store('walks').setSelectedWalk(detail);
        this.showSidebar = true;
        
        // Update marker state
        this.updateMarker(detail.id, {
            selected: true
        });
    },

    handleFavoriteToggle(walkId) {
        // Update corresponding marker
        this.updateMarker(walkId, {
            isFavorite: !Alpine.store('walks').pendingFavorites.has(walkId)
        });
    },

    handleMarkerStateChange({ walkId, state }) {
        // Update corresponding card
        const card = document.querySelector(`[data-walk-id="${walkId}"]`);
        if (card) {
            if (state.expanded) {
                card.classList.add('expanded');
            }
            
            if (state.selected) {
                card.classList.add('selected');
            }
        }
    },

    updateMarker(walkId, state) {
        Alpine.store('walks').updateMarkerState(walkId, state);
    }
}));

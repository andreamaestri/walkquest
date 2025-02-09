// Loading component with proper state management
export const loading = {
    isLoading: false,
    error: null,
    message: '',
    loadingStates: [],
    
    init() {
        // Watch loading states from UI store
        this.$watch('$store.ui.isLoading', (value) => {
            this.isLoading = value;
        });

        // Watch error state from UI store
        this.$watch('$store.ui.error', (value) => {
            this.error = value;
        });

        // Watch loading states from UI store
        this.$watch('$store.ui.loadingStates', (states) => {
            this.loadingStates = Object.entries(states)
                .filter(([_, value]) => value)
                .map(([path]) => ({ path, loading: true }));
        });
    },

    startLoading(message = '') {
        this.isLoading = true;
        this.message = message;
        this.error = null;
        Alpine.store('ui').isLoading = true;
    },
    
    stopLoading(error = null) {
        this.isLoading = false;
        this.error = error;
        if (error) {
            Alpine.store('ui').error = error;
        }
        Alpine.store('ui').isLoading = false;
    },
    
    handleError(error) {
        console.error('Loading error:', error);
        const message = error?.message || 'An unexpected error occurred';
        this.error = message;
        Alpine.store('ui').error = message;
        this.stopLoading(message);
    }
};

// Export as default for compatibility
export default loading;

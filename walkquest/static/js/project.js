// Application defaults
const DEFAULT_CONFIG = {
    map: {
        style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
        defaultCenter: [-4.85, 50.4],
        defaultZoom: 9.5,
        markerColors: {
            default: '#FF0000',
            selected: '#00FF00',
            favorite: '#FFD700'
        }
    },
    filters: {
        categories: true,
        features: true,
        distance: true
    }
};

// Initialize hover animations
const initializeHoverEffects = () => {
    if (!window.Motion) return;

    window.Motion.hover('.walk-item', (element) => {
        const expandableContent = element.querySelector('.expandable-content');
        if (!expandableContent) return;

        expandableContent.style.height = 'auto';
        expandableContent.style.opacity = '0';
        const targetHeight = expandableContent.offsetHeight;
        expandableContent.style.height = '0px';

        const animations = [
            window.Motion.animate(
                element, 
                { 
                    y: -8,
                    scale: 1.02,
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                },
                { 
                    type: "spring",
                    stiffness: 300,
                    damping: 25
                }
            ),
            window.Motion.animate(
                expandableContent,
                { height: [0, targetHeight] },
                {
                    type: "spring",
                    stiffness: 150,
                    damping: 15
                }
            ),
            window.Motion.animate(
                expandableContent,
                { opacity: [0, 1] },
                {
                    delay: window.Motion.stagger(0.1),
                    duration: 0.4,
                    at: "<",
                    easing: [0.2, 0, 0, 1]
                }
            ),
            window.Motion.animate(
                expandableContent,
                { marginTop: [0, 16] },
                {
                    delay: 0.1,
                    duration: 0.2,
                    easing: [0.2, 0, 0, 1]
                }
            ),
            window.Motion.animate(
                element.querySelectorAll('.category-tag'),
                { 
                    scale: 1.05,
                    backgroundColor: '#E0E7FF',
                    color: '#4338CA'
                },
                { 
                    type: "spring",
                    stiffness: 400,
                    damping: 20,
                    delay: window.Motion.stagger(0.05)
                }
            )
        ];

        return () => {
            window.Motion.animate(element, 
                { 
                    y: 0,
                    scale: 1,
                    boxShadow: 'none'
                },
                { 
                    type: "spring",
                    stiffness: 400
                }
            );

            window.Motion.animate(
                expandableContent,
                {
                    height: 0,
                    opacity: 0,
                    marginTop: 0
                },
                { duration: 0.2, easing: [0.4, 0, 0.2, 1] }
            );

            window.Motion.animate(
                element.querySelectorAll('.category-tag'),
                {
                    scale: 1,
                    backgroundColor: '#EEF2FF',
                    color: '#4F46E5'
                },
                {
                    type: "spring",
                    stiffness: 400
                });
        }
    });
};

// Initialize ApiService before Alpine components
if (window.ApiService && window.ApiService.init) {
    window.ApiService.init();
}

// Register Alpine components
document.addEventListener('alpine:init', () => {
    try {
        // Register walkInterface component
        Alpine.data('walkInterface', () => ({
            showSidebar: true,
            selectedWalk: null,
            isLoading: false,
            filteredWalks: [],
            map: null,
            markers: new Map(),
            currentRoute: null,
            
            init() {
                const configData = document.getElementById('config-data');
                const walksData = document.getElementById('walks-data');
                
                this.config = configData ? JSON.parse(configData.textContent) : {};
                this.filteredWalks = walksData ? JSON.parse(walksData.textContent).walks || [] : [];
                
                this.initializeMap();
                this.setupEventListeners();
            },
            
            // Import methods from walkInterface.js
            ...window.walkInterface()
        }));

        // Register walkList component
        Alpine.data('walkList', () => ({
            walks: [],
            isLoading: false,
            isLoadingMore: false,
            error: null,
            hasMore: true,
            searchQuery: '',
            page: 1,
            
            init() {
                this.fetchWalks();
            },

            async fetchWalks() {
                try {
                    this.isLoading = true;
                    this.error = null;
                    this.page = 1;
                    
                    const response = await window.ApiService.filterWalks({
                        search: this.searchQuery,
                        page: this.page,
                        page_size: 10
                    });

                    this.walks = response.walks || [];
                    this.hasMore = this.walks.length >= 10;
                    this.$nextTick(() => {
                        if (window.Motion) {
                            initializeHoverEffects();
                        }
                    });
                } catch (err) {
                    console.error('Error fetching walks:', err);
                    this.error = 'Failed to load walks';
                } finally {
                    this.isLoading = false;
                }
            },

            async loadMore() {
                if (this.isLoadingMore || !this.hasMore) return;
                
                try {
                    this.isLoadingMore = true;
                    this.page++;
                    
                    const response = await window.ApiService.filterWalks({
                        search: this.searchQuery,
                        page: this.page,
                        page_size: 10
                    });

                    const newWalks = response.walks || [];
                    this.walks = [...this.walks, ...newWalks];
                    this.hasMore = newWalks.length >= 10;
                    
                    this.$nextTick(() => {
                        if (window.Motion) {
                            initializeHoverEffects();
                        }
                    });
                } catch (err) {
                    console.error('Error loading more walks:', err);
                    this.error = 'Failed to load more walks';
                    this.page--; // Revert page increment on error
                } finally {
                    this.isLoadingMore = false;
                }
            }
        }));

        console.log('Alpine components registered successfully');
    } catch (error) {
        console.error('Error registering Alpine components:', error);
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.classList.remove('hidden');
            errorContainer.textContent = 'Failed to initialize components. Please refresh the page.';
        }
    }
});

// Initialize remaining features after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.Motion) {
        initializeHoverEffects();
    } else {
        window.addEventListener('motion:ready', initializeHoverEffects);
    }
});

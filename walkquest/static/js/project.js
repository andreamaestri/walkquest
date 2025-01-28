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

        // Get natural height by temporarily removing constraints
        expandableContent.style.height = 'auto';
        expandableContent.style.opacity = '0';
        const targetHeight = expandableContent.offsetHeight;
        expandableContent.style.height = '0px';

        // Start animations
        const animations = [
            // Main card animation
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

            // Expand content
            window.Motion.animate(
                expandableContent,
                { height: [0, targetHeight] },
                {
                    type: "spring",
                    stiffness: 150,
                    damping: 15
                }
            ),

            // Fade in content
            window.Motion.animate(
                expandableContent,
                {
                    opacity: [0, 1]
                },
                {
                    delay: window.Motion.stagger(0.1),
                    duration: 0.4,
                    at: "<",  // Start at the same time as height animation
                    easing: [0.2, 0, 0, 1]
                }
            ),

            // Animate margin
            window.Motion.animate(
                expandableContent,
                { marginTop: [0, 16] },
                {
                    delay: 0.1,  // Slight delay for visual polish
                    duration: 0.2,
                    easing: [0.2, 0, 0, 1]
                }
            ),

            // Animate categories
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

        // Return cleanup function for hover end
        return () => {
            // Reverse all animations with custom timing
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
        Alpine.data('walkList', () => ({
            // Essential properties
            walks: [],
            error: null,
            searchQuery: '',
            isLoadingMore: false,
            hasMore: true,
            page: 1,

            init() {
                this.fetchWalks();
            },

            async fetchWalks() {
                try {
                    const response = await window.ApiService.filterWalks({
                        search: this.searchQuery,
                        page: this.page,
                        page_size: 10
                    });

                    const newWalks = response.walks || [];

                    if (this.page === 1) {
                        this.walks = newWalks;
                    } else {
                        this.walks = [...this.walks, ...newWalks];
                    }

                    this.hasMore = newWalks.length >= 10;
                    this.error = null;
                } catch (error) {
                    this.error = 'Failed to load walks';
                }
            },

            async loadMore() {
                if (this.isLoadingMore || !this.hasMore) return;
                this.isLoadingMore = true;
                this.page++;
                await this.fetchWalks();
                this.isLoadingMore = false;
            }
        }));

        console.log('Project initialization completed');
    } catch (error) {
        console.error('Initialization error:', error);
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.classList.remove('hidden');
            errorContainer.textContent = 'Application initialization failed. Please refresh the page.';
        }
    }
});

// Initialize remaining features after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Setup hover animations when Motion is ready
    if (window.Motion) {
        initializeHoverEffects();
    } else {
        window.addEventListener('motion:ready', initializeHoverEffects);
    }
});

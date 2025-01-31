import { WalkService } from './services/WalkService.js';
import { MapService } from './services/MapService.js';

document.addEventListener('alpine:init', () => {
    // Register loading component
    Alpine.data('loading', () => ({
        show: false,
        init() {
            window.addEventListener('loading:show', () => this.show = true);
            window.addEventListener('loading:hide', () => this.show = false);
        }
    }));

    // Register mobile menu component
    Alpine.data('mobileMenu', () => ({
        isOpen: false,
        toggleMenu() {
            this.isOpen = !this.isOpen;
        }
    }));

    Alpine.data('walkInterface', () => ({
        walkService: null,
        mapService: null,
        isLoading: false,
        error: null,
        searchQuery: '',
        showSidebar: false,

        async init() {
            try {
                // Initialize services
                const config = JSON.parse(document.getElementById('config-data').textContent);
                this.walkService = new WalkService();
                this.mapService = new MapService(
                    document.getElementById('map'),
                    config
                );

                // Initialize data and map
                await Promise.all([
                    this.walkService.initialize(),
                    this.mapService.initialize()
                ]);

                // Subscribe to walk updates
                this.walkService.subscribe(walks => {
                    this.mapService.updateWalks(this.walkService.toGeoJSON());
                });

                // Restore sidebar state
                this.showSidebar = localStorage.getItem('sidebar') === 'true';

                // Add window resize handler
                window.addEventListener('resize', () => this.mapService.map?.resize());
            } catch (error) {
                console.error('Initialization failed:', error);
                this.error = error.message;
            }
        },

        async handleSearch() {
            if (this.isLoading) return;
            
            try {
                this.isLoading = true;
                window.dispatchEvent(new Event('loading:show'));
                await this.walkService.fetchWalks(this.searchQuery);
            } catch (error) {
                this.error = 'Search failed. Please try again.';
            } finally {
                this.isLoading = false;
                window.dispatchEvent(new Event('loading:hide'));
            }
        },

        async loadMore() {
            if (this.isLoading) return;
            
            try {
                this.isLoading = true;
                await this.walkService.loadMore();
            } catch (error) {
                this.error = 'Failed to load more walks.';
            } finally {
                this.isLoading = false;
            }
        },

        async handleWalkSelection(walk) {
            if (!walk) return;

            this.$store.walks.setSelectedWalk(walk);
            this.showSidebar = true;
            localStorage.setItem('sidebar', 'true');

            const color = {
                'Moderate': '#4338CA',
                'Challenging': '#DC2626',
                'Easy': '#10B981'
            }[walk.steepness_level] || '#4338CA';

            try {
                const coordinates = await this.mapService.displayRoute(walk.id, color);
                if (coordinates) {
                    this.mapService.fitToCoordinates(coordinates, this.showSidebar);
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    this.error = 'Failed to load walk route.';
                }
            }
        }
    }));
});

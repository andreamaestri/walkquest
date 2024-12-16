import { api } from './services.js';
import { getCategoryEmoji, getCategoryColor } from './alpine-components.js';

// Utility functions
const utils = {
    formatDistance: (distance) => `${(distance / 1000).toFixed(1)}km`,
};

// Define walkStore and make it globally available
const walkStore = {
    map: null,
    markers: new Map(),
    currentRoute: null,
    config: null,
    isInitialized: false,
    isLoading: true,
    error: null,
    tags: [],
    walks: [],
    selectedWalkId: null,
    selectedWalk: null,
    filters: {
        search: '',
        categories: [],
        features: []
    },
    initializationAttempts: 0,
    maxInitAttempts: 3,
    features: [],
    categories: [],

    async initialize(config) {
        this.config = config;
        
        try {
            this.map = new maplibregl.Map({
                container: 'map',
                style: config.map.style || 'https://demotiles.maplibre.org/style.json',
                center: config.map.defaultCenter,
                zoom: config.map.defaultZoom
            });

            // Add navigation controls
            this.map.addControl(new maplibregl.NavigationControl(), 'top-right');
            
            // Wait for map to load
            await new Promise(resolve => this.map.on('load', resolve));
            
            this.isInitialized = true;
            this.isLoading = false;
            
            return true;
        } catch (error) {
            console.error('Map initialization failed:', error);
            this.error = 'Map initialization failed';
            this.isLoading = false;
            return false;
        }
    },

    async fetchInitialData() {
        try {
            this.isLoading = true;
            console.log('Starting data fetch...'); // Debug log
            
            // First get config and initialize map
            this.config = await api.getConfig();
            if (!this.config) throw new Error('Failed to load configuration');

            const mapInit = await this.initialize(this.config);
            if (!mapInit) throw new Error('Map initialization failed');

            console.log('Map initialized, fetching data...'); // Debug log

            // Then get all data in parallel
            const [tags, walks] = await Promise.all([
                api.getTags(),
                api.getWalks()
            ]);

            console.log('Data fetched:', { tagsCount: tags.length, walksCount: walks.length }); // Debug log

            // Split tags into features and categories
            this.features = tags.filter(tag => tag.type === 'feature');
            this.categories = tags.filter(tag => tag.type === 'category');
            
            // Validate walks data
            if (!Array.isArray(walks)) {
                console.error('Walks data is not an array:', walks);
                throw new Error('Invalid walks data format');
            }

            this.walks = walks;
            console.log(`Successfully loaded ${this.walks.length} walks`); // Debug log
            
            if (this.walks.length > 0) {
                await this.updateMarkers(this.walks);
                this.renderWalkList();
                console.log('UI updated with walk data'); // Debug log
            } else {
                console.warn('No walks data available');
            }
        } catch (error) {
            console.error('Initialization error:', error);
            this.error = error.message;
        } finally {
            this.isLoading = false;
        }
    },

    displayWalkGeometry(geometry) {
        if (!this.map) return;

        // Remove existing route
        if (this.currentRoute) {
            this.map.removeLayer(this.currentRoute);
            this.map.removeSource(this.currentRoute);
        }

        // Add new route
        const sourceId = `route-${geometry.properties.walk_id}`;
        const layerId = `route-layer-${geometry.properties.walk_id}`;

        this.map.addSource(sourceId, {
            type: 'geojson',
            data: geometry
        });

        this.map.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': this.config.map.markerColors.selected,
                'line-width': 4
            }
        });

        // Fit bounds to show full route
        const bounds = new maplibregl.LngLatBounds();
        geometry.geometry.coordinates.forEach(coord => bounds.extend(coord));
        this.map.fitBounds(bounds, { padding: 50 });

        this.currentRoute = layerId;
    },

    renderWalkList() {
        const walkList = document.getElementById('walk-list');
        if (!walkList) return;

        walkList.innerHTML = this.walks.map(walk => `
            <div class="walk-item" data-walk-id="${walk.id}">
                <h3 class="walk-title">${walk.walk_name}</h3>
                <div class="walk-details">
                    <span class="distance">${utils.formatDistance(walk.distance)}</span>
                    ${walk.features.map(feature => 
                        `<span class="feature">${getCategoryEmoji(feature)} ${feature.name}</span>`
                    ).join('')}
                </div>
                <div class="categories">
                    ${walk.related_categories.map(cat => 
                        `<span class="category-tag" style="background-color: ${getCategoryColor(cat)}">${cat.name}</span>`
                    ).join('')}
                </div>
            </div>
        `).join('');

        // Add click handlers
        walkList.querySelectorAll('.walk-item').forEach(item => {
            item.addEventListener('click', () => {
                const walkId = item.dataset.walkId;
                this.selectWalk(walkId);
            });
        });
    },

    updateMarkers(walks) {
        if (!this.map) return;

        // Remove existing markers
        this.markers.forEach(marker => marker.remove());
        this.markers.clear();

        // Add new markers
        walks.forEach(walk => {
            const marker = new maplibregl.Marker({
                color: this.config?.map?.markerColors?.default || '#FF0000'
            })
                .setLngLat([walk.longitude, walk.latitude])
                .setPopup(new maplibregl.Popup().setHTML(`
                    <h4>${walk.walk_name}</h4>
                    <p>${utils.formatDistance(walk.distance)}</p>
                `))
                .addTo(this.map);
            
            marker.getElement().addEventListener('click', () => {
                this.selectWalk(walk.id);
            });
            
            this.markers.set(walk.id, marker);
        });
    },

    async search(query) {
        this.filters.search = query;
        await this.applyFilters();
    },

    async filterByCategory(categories) {
        this.filters.categories = categories;
        await this.applyFilters();
    },

    async filterByFeature(features) {
        this.filters.features = features;
        await this.applyFilters();
    },

    async applyFilters() {
        this.isLoading = true;
        try {
            // API returns array directly
            const walks = await api.filterWalks({
                search: this.filters.search,
                categories: this.filters.categories,
                features: this.filters.features
            });
            this.walks = Array.isArray(walks) ? walks : [];
            this.updateMarkers(this.walks);
            this.renderWalkList();
        } catch (error) {
            console.error('Filter application failed:', error);
            this.error = 'Filter application failed';
        } finally {
            this.isLoading = false;
        }
    },

    async toggleFavorite(walkId) {
        try {
            const result = await api.toggleFavorite(walkId);
            const walk = this.walks.find(w => w.id === result.walk_id);
            if (walk) {
                walk.is_favorite = result.is_favorite;
            }
        } catch (error) {
            console.error('Toggle favorite failed:', error);
            this.error = 'Failed to toggle favorite';
        }
    },

    async selectWalk(id) {
        if (id === this.selectedWalkId) return;
        
        this.selectedWalkId = id;
        if (id) {
            try {
                const [walk, geometry] = await Promise.all([
                    api.getWalk(id),
                    api.getWalkGeometry(id)
                ]);
                
                this.selectedWalk = walk;
                this.displayWalkGeometry(geometry);
                
                // Use the openModal function if it exists
                if (this.openModal) {
                    this.openModal(walk);
                }
            } catch (error) {
                console.error('Failed to load walk details:', error);
                this.selectedWalk = null;
                this.error = 'Failed to load walk details';
            }
        } else {
            this.selectedWalk = null;
        }
    }
};

window.walkStore = walkStore;

// DOM manipulation functions
function initializeUI() {
    // Initialize modal and store the openModal function
    walkStore.openModal = initializeModal();
    
    // Search functionality
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            walkStore.filters.search = e.target.value;
            walkStore.applyFilters();
        }, 300));
    }

    // Mobile menu toggle
    const mobileMenuButton = document.querySelector('.mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Update loading indicator visibility
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        Object.defineProperty(walkStore, 'isLoading', {
            set(value) {
                this._isLoading = value;
                loadingIndicator.classList.toggle('hidden', !value);
            },
            get() {
                return this._isLoading;
            }
        });
    }

    // Feature filter initialization
    const featureFilters = document.getElementById('feature-filters');
    if (featureFilters) {
        walkStore.features.forEach(feature => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `feature-${feature.slug}`;
            checkbox.value = feature.slug;
            checkbox.addEventListener('change', () => {
                const selectedFeatures = Array.from(featureFilters.querySelectorAll('input:checked'))
                    .map(input => input.value);
                walkStore.filterByFeature(selectedFeatures);
            });

            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = feature.name;

            featureFilters.appendChild(checkbox);
            featureFilters.appendChild(label);
        });
    }

    // Category filter initialization
    const categoryFilters = document.getElementById('category-filters');
    if (categoryFilters) {
        walkStore.categories.forEach(category => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `category-${category.slug}`;
            checkbox.value = category.slug;
            checkbox.addEventListener('change', () => {
                const selectedCategories = Array.from(categoryFilters.querySelectorAll('input:checked'))
                    .map(input => input.value);
                walkStore.filterByCategory(selectedCategories);
            });

            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = category.name;

            categoryFilters.appendChild(checkbox);
            categoryFilters.appendChild(label);
        });
    }
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Modal functionality
function initializeModal() {
    const walkModal = document.getElementById('walk-modal');
    const closeModalButton = document.getElementById('close-modal');
    const walkDetails = document.getElementById('walk-details');

    if (!walkModal || !closeModalButton || !walkDetails) {
        console.warn('Modal elements not found, skipping modal initialization');
        return;
    }

    function openModal(walk) {
        if (!walk) return;
        
        walkDetails.innerHTML = `
            <h2 class="text-xl font-semibold mb-4">${walk.walk_name}</h2>
            <div class="walk-stats mb-4">
                <p class="mb-2">Distance: ${utils.formatDistance(walk.distance)}</p>
                ${walk.has_pub ? '<p class="mb-2">🍺 Has pub</p>' : ''}
                ${walk.has_cafe ? '<p class="mb-2">☕ Has café</p>' : ''}
            </div>
            <div class="categories mb-4">
                <h3 class="font-semibold mb-2">Categories:</h3>
                <div class="flex flex-wrap gap-2">
                    ${walk.related_categories.map(cat => 
                        `<span class="bg-gray-100 px-2 py-1 rounded-md text-sm">${cat.name}</span>`
                    ).join('')}
                </div>
            </div>
        `;
        walkModal.classList.remove('hidden');
    }

    function closeModal() {
        walkModal.classList.add('hidden');
    }

    // Event listeners
    closeModalButton.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target === walkModal) {
            closeModal();
        }
    });
    
    // Escape key handler
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !walkModal.classList.contains('hidden')) {
            closeModal();
        }
    });

    // Return the openModal function to be used by other parts of the code
    return openModal;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
    walkStore.fetchInitialData();
});

export { walkStore };
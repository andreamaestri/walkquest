import { api } from './services.js';
import { getCategoryEmoji, getCategoryColor } from './alpine-components.js';

// Default configuration fallback
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

// Check for required dependencies
const checkDependencies = () => {
    if (typeof window._ === 'undefined') {
        throw new Error('Lodash is required but not loaded');
    }
    if (typeof window.dayjs === 'undefined') {
        throw new Error('Day.js is required but not loaded');
    }
};

try {
    checkDependencies();
} catch (error) {
    console.error('Dependency error:', error);
    // Add visible error message to the page
    document.addEventListener('DOMContentLoaded', () => {
        const error = document.createElement('div');
        error.className = 'error-message';
        error.textContent = 'Required libraries failed to load. Please refresh the page.';
        document.body.prepend(error);
    });
}

// Access libraries with fallbacks
const _ = window._ || {
    escape: (str) => String(str).replace(/[&<>"']/g, (m) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]),
    debounce: (fn, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn.apply(this, args), delay);
        };
    }
};

const dayjs = window.dayjs || ((date) => new Date(date).toLocaleString());

// Utility functions for data formatting and manipulation
const utils = {
    formatDistance: (distance) => `${(distance / 1000).toFixed(1)}km`,
    formatDate: (date) => typeof dayjs === 'function' ? dayjs(date).fromNow() : new Date(date).toLocaleString(),
    sanitizeHtml: _.escape, // Use lodash's escape function
    debounce: _.debounce, // Use lodash's debounce
    // Template helper for walk item rendering
    walkItemTemplate: (walk) => `
        <div class="walk-item" data-walk-id="${walk.id}">
            <h3 class="walk-title">${utils.sanitizeHtml(walk.walk_name)}</h3>
            <div class="walk-details">
                <span class="distance">${utils.formatDistance(walk.distance)}</span>
                ${walk.features.map(feature => 
                    `<span class="feature">${getCategoryEmoji(feature)} ${utils.sanitizeHtml(feature.name)}</span>`
                ).join('')}
            </div>
            <div class="categories">
                ${walk.related_categories.map(cat => 
                    `<span class="category-tag" style="background-color: ${getCategoryColor(cat)}">${utils.sanitizeHtml(cat.name)}</span>`
                ).join('')}
            </div>
        </div>
    `
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
            this.error = null;
            
            // Get configuration
            try {
                const configData = await api.getConfig();
                this.config = {
                    ...DEFAULT_CONFIG,
                    ...configData
                };
                console.log('Loaded configuration:', this.config);
            } catch (configError) {
                console.warn('Failed to load configuration, using defaults:', configError);
                this.config = DEFAULT_CONFIG;
            }

            const mapInit = await this.initialize(this.config);
            if (!mapInit) {
                throw new Error('Map initialization failed');
            }

            // Rest of data fetching
            const [tags, walksData] = await Promise.all([
                api.getTags(),
                api.getWalks()
            ]);

            console.log('Raw walks data:', walksData); // Debug log

            this.features = tags.filter(tag => tag.type === 'feature');
            this.categories = tags.filter(tag => tag.type === 'category');
            
            // Handle both array and object responses
            const walks = Array.isArray(walksData) ? walksData : walksData.walks || [];
            
            if (!Array.isArray(walks)) {
                console.error('Invalid walks data format:', walks);
                throw new Error('Invalid walks data format received');
            }

            this.walks = walks;
            console.log('Processed walks:', this.walks);
            
            if (this.walks.length > 0) {
                await this.updateMarkers(this.walks);
                this.renderWalkList();
            } else {
                console.warn('No walks data received');
            }
        } catch (error) {
            console.error('Initialization error:', error);
            this.error = error.message;
        } finally {
            this.isLoading = false;
        }
    },

    async applyFilters() {
        this.isLoading = true;
        this.error = null;
        try {
            const response = await api.filterWalks({
                search: this.filters.search,
                categories: this.filters.categories,
                features: this.filters.features
            });

            console.log('Filter API response:', response); // Debug log

            // Handle both array and object responses
            const walks = Array.isArray(response) ? response : response.walks || [];
            
            if (!Array.isArray(walks)) {
                console.error('Invalid filtered walks format:', walks);
                throw new Error('Invalid walks data format received');
            }

            this.walks = walks;
            console.log('Updated walks list:', this.walks);
            
            await this.updateMarkers(this.walks);
            this.renderWalkList();
        } catch (error) {
            console.error('Filter application failed:', error);
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

        walkList.innerHTML = this.walks.map(walk => utils.walkItemTemplate(walk)).join('');

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
            const markerColor = walk.is_favorite 
                ? this.config.map.markerColors.favorite 
                : this.config.map.markerColors.default;

            const marker = new maplibregl.Marker({
                color: markerColor
            })
                .setLngLat([walk.longitude, walk.latitude])
                .setPopup(new maplibregl.Popup().setHTML(`
                    <h4>${utils.sanitizeHtml(walk.walk_name)}</h4>
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
const debounce = _.debounce;

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
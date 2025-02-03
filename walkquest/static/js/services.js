// ApiService class definition
const ApiService = {
    baseUrl: window.location.origin + '/api',
    csrfToken: null,

    init() {
        // Get CSRF token from meta tag
        const csrfTokenMeta = document.querySelector('meta[name="csrf-token"]');
        if (!csrfTokenMeta) {
            console.error('CSRF token meta tag not found');
            return;
        }
        this.csrfToken = csrfTokenMeta.content;

        // Ensure baseUrl is set
        if (!this.baseUrl) {
            this.baseUrl = window.location.origin + '/api';
        }

        console.log('ApiService initialized with baseUrl:', this.baseUrl);
    },

    async fetch(endpoint, options = {}) {
        // Ensure we're initialized
        if (!this.csrfToken) {
            this.init();
        }

        // Conditionally set headers based on the request method
        const defaultHeaders = {
            'Accept': 'application/json'
        };

        // If the method is not GET, include Content-Type and X-CSRFToken
        if (options.method && options.method.toUpperCase() !== 'GET') {
            defaultHeaders['Content-Type'] = 'application/json';
            defaultHeaders['X-CSRFToken'] = this.csrfToken;
        }

        const defaultOptions = {
            headers: {
                ...defaultHeaders,
                ...options.headers
            },
            credentials: 'same-origin' // Include cookies for authentication
        };

        try {
            const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
            console.log('Making API request to:', url);
            
            const response = await fetch(url, {
                ...defaultOptions,
                ...options
            });

            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType?.includes('application/json')) {
                    const error = await response.json();
                    throw new Error(error.message || `API Error: ${response.status}`);
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error, 'to endpoint:', endpoint);
            throw new Error(`API request failed: ${error.message}`);
        }
    },

    async getWalks(params = {}) {
        const queryParams = new URLSearchParams();
        if (params.search) queryParams.append('search', params.search);
        if (params.categories?.length) {
            queryParams.append('categories', params.categories.join(','));
        }
        
        const url = `/walks${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        console.log('Fetching walks with URL:', url);
        
        const data = await this.fetch(url);
        
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid API response format');
        }

        return {
            walks: Array.isArray(data) ? data : (data.walks || []),
            total: typeof data.total === 'number' ? data.total : (Array.isArray(data) ? data.length : 0)
        };
    },

    async getWalk(walkId) {
        return this.fetch(`/walks/${walkId}`);
    },

    async getWalkGeometry(walkId) {
        const data = await this.fetch(`/walks/${walkId}/geometry`);
        if (!data.geometry) {
            throw new Error('Invalid geometry data');
        }
        return data;
    },

    async getTags() {
        const tags = await this.fetch('/tags');
        return tags.map(tag => ({
            name: tag.name,
            slug: tag.slug,
            usage_count: tag.usage_count,
            type: tag.type
        }));
    },

    async getConfig() {
        try {
            const data = await this.fetch('/config');
            if (!data) {
                throw new Error('Empty configuration received');
            }
            return data;
        } catch (error) {
            console.error('Config fetch error:', error);
            throw error;
        }
    },

    async toggleFavorite(walkId) {
        const result = await this.fetch(`/walks/${walkId}/favorite`, {
            method: 'POST'
        });
        return {
            status: result.status,
            is_favorite: result.is_favorite,
            walk_id: result.walk_id
        };
    },

    async filterWalks(filters = {}) {
        try {
            console.log('Filtering walks with:', filters);
            const queryParams = new URLSearchParams();
            
            if (filters.search) {
                queryParams.append('search', filters.search);
            }
            if (filters.categories?.length) {
                queryParams.append('categories', filters.categories.join(','));
            }
            if (filters.features?.length) {
                queryParams.append('features', filters.features.join(','));
            }

            const url = `/walks?${queryParams.toString()}`;
            console.log('Fetching filtered walks with URL:', url);
            
            const response = await this.fetch(url);
            console.log('API filterWalks response:', response);

            if (!response || typeof response !== 'object') {
                throw new Error('Invalid API response format');
            }

            return {
                walks: Array.isArray(response) ? response : [],
                total: Array.isArray(response) ? response.length : 0
            };
        } catch (error) {
            console.error('Filter walks error:', error);
            throw error;
        }
    },

    async getWalkMarkers() {
        const response = await this.fetch('/walks/markers');
        if (!response?.markers) {
            throw new Error('Invalid marker data response');
        }
        return response.markers;
    }
};

// Make ApiService globally available
window.ApiService = ApiService;

// Initialize immediately when loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ApiService.init());
} else {
    ApiService.init();
}

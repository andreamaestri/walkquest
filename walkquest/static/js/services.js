class ApiService {
    constructor() {
        this.csrfToken = document.querySelector('meta[name="csrf-token"]').content;
        this.baseUrl = window.location.origin + '/api';
    }

    async fetch(endpoint, options = {}) {
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

            const data = await response.json();
            return data;

        } catch (error) {
            console.error('API request failed:', error);
            throw new Error(`API request failed: ${error.message}`);
        }
    }

    // API endpoints with proper response handling
    async getWalks(params = {}) {
        const queryParams = new URLSearchParams();
        if (params.search) queryParams.append('search', params.search);
        if (params.categories?.length) {
            queryParams.append('categories', params.categories.join(','));
        }
        
        const data = await this.fetch(`/walks`); // Remove trailing slash
        console.log('API getWalks response:', data); // Debug log
        
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid API response format');
        }

        return {
            walks: Array.isArray(data) ? data : (data.walks || []),
            total: typeof data.total === 'number' ? data.total : (Array.isArray(data) ? data.length : 0)
        };
    }

    async getWalk(walkId) {
        return this.fetch(`/walks/${walkId}`);
    }

    async getWalkGeometry(walkId) {
        const data = await this.fetch(`/walks/${walkId}/geometry`);
        if (!data.geometry) {
            throw new Error('Invalid geometry data');
        }
        return data;
    }

    async getTags() {
        const tags = await this.fetch('/tags');
        return tags.map(tag => ({
            name: tag.name,
            slug: tag.slug,
            usage_count: tag.usage_count,
            type: tag.type
        }));
    }

    async getConfig() {
        try {
            const data = await this.fetch('/config');
            if (!data) {
                throw new Error('Empty configuration received');
            }
            return data;
        } catch (error) {
            console.error('Config fetch error:', error);
            throw error; // Let walkStore handle the fallback
        }
    }

    async toggleFavorite(walkId) {
        const result = await this.fetch(`/walks/${walkId}/favorite`, {
            method: 'POST'
        });
        return {
            status: result.status,
            is_favorite: result.is_favorite,
            walk_id: result.walk_id
        };
    }

    async filterWalks(filters = {}) {
        const response = await this.fetch('/walks/filter', { // Remove trailing slash
            method: 'POST',
            body: JSON.stringify({
                categories: filters.categories || [],
                difficulty: filters.difficulty,
                distance: filters.distance,
                duration: filters.duration,
                search: filters.search || ''
            })
        });

        console.log('API filterWalks response:', response); // Debug log

        if (!response || typeof response !== 'object') {
            throw new Error('Invalid API response format');
        }

        return {
            walks: Array.isArray(response) ? response : (response.walks || []),
            total: typeof response.total === 'number' ? response.total : (Array.isArray(response) ? response.length : 0),
            filters: response.applied_filters || {}
        };
    }
}

// Export an instance of ApiService instead
export const api = new ApiService();

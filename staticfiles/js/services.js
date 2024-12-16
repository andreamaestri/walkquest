class ApiService {
    constructor() {
        // Get CSRF token from cookie instead of meta tag
        this.csrfToken = this.getCsrfToken();
        this.baseUrl = '/api';
    }

    getCsrfToken() {
        const name = 'csrftoken';
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    async fetch(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.csrfToken,
                'Accept': 'application/json'
            },
            credentials: 'include'  // Changed from 'same-origin' to 'include'
        };

        try {
            const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
            const response = await fetch(url, {
                ...defaultOptions,
                ...options,
                headers: {
                    ...defaultOptions.headers,
                    ...options.headers
                }
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
        // Changed from direct fetch to using the class's fetch method
        try {
            const queryParams = new URLSearchParams();
            if (params.search) queryParams.append('search', params.search);
            if (params.categories?.length) {
                queryParams.append('categories', params.categories.join(','));
            }
            if (params.features?.length) {
                queryParams.append('features', params.features.join(','));
            }
            
            const query = queryParams.toString();
            console.log('Fetching walks with params:', query || 'none'); // Debug log

            const data = await this.fetch(`/walks${query ? '?' + query : ''}`); // Use this.fetch
            console.log('Raw API response:', data); // Debug log

            if (!Array.isArray(data)) {
                console.warn('API response is not an array:', data);
                return [];
            }

            return data;
        } catch (error) {
            console.error('Failed to fetch walks:', error);
            return [];
        }
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

    async getTags(type = null) {
        const tags = await this.fetch('/tags');
        if (type) {
            return tags.filter(tag => tag.type === type);
        }
        return tags;
    }

    async getConfig() {
        return this.fetch('/config');
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

    // Update filterWalks to use GET instead of body parameters
    async filterWalks(params = {}) {
        return this.getWalks(params); // Reuse getWalks logic
    }

    async getFeatures() {
        return this.getTags('feature');
    }

    async getCategories() {
        return this.getTags('category');
    }
}

export const api = new ApiService();

class ApiService {
    constructor() {
        this.csrfToken = document.querySelector('meta[name="csrf-token"]').content;
        this.baseUrl = '/api';
    }

    async fetch(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.csrfToken,
                'Accept': 'application/json'
            },
            credentials: 'same-origin' // Include cookies for authentication
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
        const searchParams = new URLSearchParams(params);
        const data = await this.fetch(`/walks?${searchParams}`);
        return {
            walks: data.walks || [],
            total: data.total || 0
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

    async filterWalks(categories) {
        return this.fetch('/walks/filter', {
            method: 'POST',
            body: JSON.stringify({ categories })
        });
    }
}

export const api = new ApiService();

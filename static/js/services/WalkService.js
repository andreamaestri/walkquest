export class WalkService {
    constructor() {
        this.walks = [];
        this.page = 1;
        this.hasMore = true;
        this.searchQuery = '';
        this._subscribers = new Set();
    }

    subscribe(callback) {
        this._subscribers.add(callback);
        return () => this._subscribers.delete(callback);
    }

    _notify() {
        this._subscribers.forEach(cb => cb(this.walks));
    }

    async initialize() {
        const walksData = document.getElementById('walks-data');
        if (!walksData) return false;

        try {
            const initialData = JSON.parse(walksData.textContent);
            this.walks = initialData.walks || [];
            this.hasMore = initialData.hasMore || false;
            this._notify();
            return true;
        } catch (error) {
            console.error('Failed to parse initial data:', error);
            throw error;
        }
    }

    async fetchWalks(query = '') {
        try {
            const response = await window.ApiService.filterWalks({
                search: query,
                page: 1,
                page_size: 10
            });
            
            this.walks = response.walks || [];
            this.hasMore = this.walks.length >= 10;
            this.page = 1;
            this.searchQuery = query;
            this._notify();
            
            return this.walks;
        } catch (error) {
            console.error('Failed to fetch walks:', error);
            throw error;
        }
    }

    async loadMore() {
        if (!this.hasMore) return [];
        
        try {
            const response = await window.ApiService.filterWalks({
                search: this.searchQuery,
                page: this.page + 1,
                page_size: 10
            });
            
            const newWalks = response.walks || [];
            this.walks = [...this.walks, ...newWalks];
            this.hasMore = newWalks.length >= 10;
            this.page++;
            this._notify();
            
            return newWalks;
        } catch (error) {
            console.error('Failed to load more walks:', error);
            throw error;
        }
    }

    toGeoJSON() {
        return {
            type: 'FeatureCollection',
            features: this.walks
                .filter(walk => walk.latitude && walk.longitude)
                .map(walk => ({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [walk.longitude, walk.latitude]
                    },
                    properties: {
                        id: walk.id,
                        walk_name: walk.walk_name,
                        steepness_level: walk.steepness_level,
                        description: walk.description,
                        distance_km: walk.distance_km,
                        ascent_meters: walk.ascent_meters,
                        time_minutes: walk.time_minutes
                    }
                }))
        };
    }
}

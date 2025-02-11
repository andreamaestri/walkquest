import ky from 'ky';

const api = ky.create({
  prefixUrl: '/api',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value
  },
  hooks: {
    beforeRequest: [
      (request) => {
        console.log('Request URL:', request.url);
      }
    ],
    afterResponse: [
      async (request, options, response) => {
        console.log('Response Status:', response.status);
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Something went wrong');
        }
      }
    ]
  }
});

// Helper to normalize walk data
const normalizeWalkData = (data) => {
  if (!data) return [];
  
  // If it's already an array, process it
  if (Array.isArray(data)) {
    return data.map(walk => ({
      ...walk,
      id: walk.id,
      walk_name: walk.walk_name || 'Unnamed Walk',
      highlights: walk.highlights || '',
      steepness_level: walk.steepness_level || 'Unknown',
      pubs_list: Array.isArray(walk.pubs_list) ? walk.pubs_list : []
    }));
  }
  
  // If it's a single walk object
  if (data.id) {
    return [{
      ...data,
      walk_name: data.walk_name || 'Unnamed Walk',
      highlights: data.highlights || '',
      steepness_level: data.steepness_level || 'Unknown',
      pubs_list: Array.isArray(data.pubs_list) ? data.pubs_list : []
    }];
  }
  
  // If it has a walks property
  if (data.walks) {
    return normalizeWalkData(data.walks);
  }
  
  return [];
};

export const WalksAPI = {
  async filterWalks(params = {}) {
    try {
      console.log('Fetching walks with params:', params);
      const response = await api.get('walks/walks', {
        searchParams: params
      }).json();
      
      console.log('Raw API Response:', response);
      
      const normalizedWalks = normalizeWalkData(response);
      console.log('Normalized walks:', normalizedWalks);
      
      return { walks: normalizedWalks };
    } catch (error) {
      console.error('API filterWalks error:', error);
      throw new Error(`Failed to fetch walks: ${error.message}`);
    }
  },

  async search(query) {
    try {
      const response = await api.get('walks/walks', {
        searchParams: { search: query }
      }).json();
      
      const normalizedWalks = normalizeWalkData(response);
      return { walks: normalizedWalks };
    } catch (error) {
      console.error('API search error:', error);
      throw new Error(`Failed to search walks: ${error.message}`);
    }
  },

  async filter(categories) {
    try {
      const response = await api.post('walks/filter/', {
        json: { tag: categories }
      }).json();
      
      const normalizedWalks = normalizeWalkData(response);
      return { walks: normalizedWalks };
    } catch (error) {
      console.error('API filter error:', error);
      throw new Error(`Failed to filter walks: ${error.message}`);
    }
  },

  async getGeometry(walkId) {
    try {
      if (!walkId) throw new Error('Walk ID is required');
      
      const response = await api.get(`walks/geometry/${walkId}/`).json();
      return response;
    } catch (error) {
      console.error('API getGeometry error:', error);
      throw new Error(`Failed to fetch geometry: ${error.message}`);
    }
  },

  async getFeatures() {
    try {
      const response = await api.get('walks/features/autocomplete/').json();
      return response;
    } catch (error) {
      console.error('API getFeatures error:', error);
      throw new Error(`Failed to fetch features: ${error.message}`);
    }
  }
};

export default {
  filterWalks: WalksAPI.filterWalks,
  search: WalksAPI.search,
  filter: WalksAPI.filter,
  getGeometry: WalksAPI.getGeometry,
  getFeatures: WalksAPI.getFeatures
}

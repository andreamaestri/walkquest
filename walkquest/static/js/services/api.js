import ky from 'ky';

// Track active requests to allow cancellation
const activeRequests = new Map();

// Utility to cancel existing requests by endpoint
const cancelActiveRequest = (endpoint) => {
  if (activeRequests.has(endpoint)) {
    const controller = activeRequests.get(endpoint);
    controller.abort();
    activeRequests.delete(endpoint);
    console.log(`Cancelled in-flight request to: ${endpoint}`);
  }
};

// Create ky instance with common configuration
const api = ky.create({
  prefixUrl: '/api',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value
  },
  hooks: {
    beforeRequest: [
      (request, options) => {
        console.log('Request URL:', request.url);
        
        // Get normalized endpoint for tracking
        const endpoint = request.url.toString().replace(/^.*\/api\//, '');
        
        // Cancel any existing request to the same endpoint
        cancelActiveRequest(endpoint);
        
        // Create and store new AbortController
        const controller = new AbortController();
        activeRequests.set(endpoint, controller);
        
        // Set signal in options instead of on request
        options.signal = controller.signal;
      }
    ],
    afterResponse: [
      async (request, options, response) => {
        console.log('Response Status:', response.status);
        
        // Clean up completed request
        const endpoint = request.url.toString().replace(/^.*\/api\//, '');
        activeRequests.delete(endpoint);
        
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
  
  const normalizeWalk = (walk) => ({
    ...walk,
    id: walk.id,
    walk_name: walk.walk_name || 'Unnamed Walk',
    highlights: walk.highlights || '',
    steepness_level: walk.steepness_level || 'Unknown',
    slug: walk.slug || `walk-${walk.id}` // Ensure we always have a slug
  });
  
  if (Array.isArray(data)) {
    return data.map(walk => normalizeWalk(walk));
  }
  
  if (data.id) {
    return [normalizeWalk(data)];
  }
  
  if (data.walks) {
    return normalizeWalkData(data.walks);
  }
  
  return [];
};

// API Methods
const filterWalks = async (params = {}) => {
  try {
    const endpoint = params.latitude && params.longitude ? 'walks/nearby' : 'walks';
    
    // If location parameters are provided, use the nearby endpoint
    if (params.latitude && params.longitude) {
      const searchParams = {
        latitude: params.latitude,
        longitude: params.longitude,
        radius: params.radius || 5000,
        limit: params.limit || 50
      };
      
      const data = await api.get('walks/nearby', { searchParams }).json();
      return normalizeWalkData(data);
    }
    
    // Otherwise use the standard filtering endpoint
    const searchParams = {};
    if (params.search) searchParams.search = params.search;
    if (params.categories?.length) {
      searchParams.categories = params.categories.join(',');
    }
    
    const data = await api.get('walks', { searchParams }).json();
    return normalizeWalkData(data);
  } catch (error) {
    // Don't report aborted requests as errors
    if (error.name === 'AbortError') {
      console.log('Walk filter request was cancelled');
      return [];
    }
    console.error('Error fetching walks:', error);
    throw error;
  }
};

const search = async (query) => {
  try {
    const data = await api.get('walks/search', {
      searchParams: { q: query }
    }).json();
    
    return { walks: normalizeWalkData(data) };
  } catch (error) {
    // Don't report aborted requests as errors
    if (error.name === 'AbortError') {
      console.log('Search request was cancelled');
      return { walks: [] };
    }
    console.error('API search error:', error);
    throw error;
  }
};

const filter = async (categories) => {
  try {
    const response = await api.get('walks', {
      searchParams: { categories: categories.join(',') }
    }).json();
    
    const normalizedWalks = normalizeWalkData(response);
    return { walks: normalizedWalks };
  } catch (error) {
    console.error('API filter error:', error);
    throw new Error(`Failed to filter walks: ${error.message}`);
  }
};

const getGeometry = async (walkId) => {
  try {
    const data = await api.get(`walks/${walkId}/geometry`).json();
    return data;
  } catch (error) {
    // Don't report aborted requests as errors
    if (error.name === 'AbortError') {
      console.log(`Request for walk ${walkId} geometry was cancelled`);
      return null;
    }
    console.error('Error fetching route geometry:', error);
    throw error;
  }
};

const getFeatures = async () => {
  try {
    const response = await api.get('filters').json();
    return response;
  } catch (error) {
    console.error('API getFeatures error:', error);
    throw new Error(`Failed to fetch features: ${error.message}`);
  }
};

const toggleFavorite = async (walkId) => {
  try {
    const response = await api.post(`walks/${walkId}/favorite`).json();
    
    if (response.status !== 'success') {
      throw new Error(response.message || 'Failed to toggle favorite');
    }
    
    return {
      walkId: response.walk_id,
      is_favorite: response.is_favorite
    };
  } catch (error) {
    console.error('Failed to toggle favorite:', error);
    throw error;
  }
};

// Export the utility function for component usage
export const cancelRequest = cancelActiveRequest;

// Cleanup utility for component unmounting
export const cancelAllRequests = () => {
  for (const [endpoint, controller] of activeRequests.entries()) {
    controller.abort();
    console.log(`Cancelled request to: ${endpoint}`);
  }
  activeRequests.clear();
};

// Single export of all methods
export {
  filterWalks,
  search,
  filter,
  getGeometry,
  getFeatures,
  toggleFavorite
}

// Export the API object
export const WalksAPI = {
  filterWalks,
  search,
  filter,
  getGeometry,
  getFeatures,
  toggleFavorite,
  cancelRequest,
  cancelAllRequests
}

// Default export
export default WalksAPI

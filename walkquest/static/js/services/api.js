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
        
        // Get normalized endpoint for tracking
        const endpoint = request.url.toString().replace(/^.*\/api\//, '');
        
        // Cancel any existing request to the same endpoint
        cancelActiveRequest(endpoint);
        
        // Create and store new AbortController
        const controller = new AbortController();
        activeRequests.set(endpoint, controller);
        
        // Attach signal to this request
        request.signal = controller.signal;
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
const filterWalks = async (params = {}, signal) => {
  try {
    // Create a request-specific controller if none provided
    const controller = signal ? null : new AbortController();
    const requestSignal = signal || controller?.signal;
    
    // Determine endpoint for tracking
    const endpoint = params.latitude && params.longitude ? 'walks/nearby' : 'walks';
    
    // Track this request for potential cancellation
    if (controller) {
      cancelActiveRequest(endpoint);
      activeRequests.set(endpoint, controller);
    }
    
    // If location parameters are provided, use the nearby endpoint
    if (params.latitude && params.longitude) {
      const searchParams = new URLSearchParams({
        latitude: params.latitude,
        longitude: params.longitude,
        radius: params.radius || 5000,
        limit: params.limit || 50
      });
      
      const response = await fetch(`/api/walks/nearby?${searchParams}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value
        },
        signal: requestSignal
      });

      // Clean up on completion
      if (controller) {
        activeRequests.delete(endpoint);
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return normalizeWalkData(data);
    }
    
    // Otherwise use the standard filtering endpoint
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    if (params.categories?.length) {
      searchParams.append('categories', params.categories.join(','));
    }
    
    const response = await fetch(`/api/walks${searchParams.toString() ? '?' + searchParams.toString() : ''}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value
      },
      signal: requestSignal
    });

    // Clean up on completion
    if (controller) {
      activeRequests.delete(endpoint);
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
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

const search = async (query, signal) => {
  try {
    // Create a request-specific controller if none provided
    const controller = signal ? null : new AbortController();
    const requestSignal = signal || controller?.signal;
    
    // Track this request for potential cancellation
    const endpoint = 'walks/search';
    if (controller) {
      cancelActiveRequest(endpoint);
      activeRequests.set(endpoint, controller);
    }
    
    const response = await fetch(`/api/walks/search?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: requestSignal
    });
    
    // Clean up on completion
    if (controller) {
      activeRequests.delete(endpoint);
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
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

const getGeometry = async (walkId, signal) => {
  try {
    // Create a request-specific controller if none provided
    const controller = signal ? null : new AbortController();
    const requestSignal = signal || controller?.signal;
    
    // Track this request for potential cancellation
    const endpoint = `walks/${walkId}/geometry`;
    if (controller) {
      cancelActiveRequest(endpoint);
      activeRequests.set(endpoint, controller);
    }
    
    const response = await fetch(`/api/walks/${walkId}/geometry`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: requestSignal
    });
    
    // Clean up on completion
    if (controller) {
      activeRequests.delete(endpoint);
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
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
  getFeatures
}

// Export the API object
export const WalksAPI = {
  filterWalks,
  search,
  filter,
  getGeometry,
  getFeatures,
  cancelRequest,
  cancelAllRequests
}

// Default export
export default WalksAPI

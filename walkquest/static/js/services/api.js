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
  
  const normalizeWalk = (walk) => ({
    ...walk,
    id: walk.id,
    walk_name: walk.walk_name || 'Unnamed Walk',
    highlights: walk.highlights || '',
    steepness_level: walk.steepness_level || 'Unknown',
    pubs_list: Array.isArray(walk.pubs_list) ? walk.pubs_list : [],
    isExpanded: walk.isExpanded || false // Added isExpanded property
  });
  
  // If it's already an array, process it
  if (Array.isArray(data)) {
    return data.map(walk => normalizeWalk(walk));
  }
  
  // If it's a single walk object
  if (data.id) {
    return [normalizeWalk(data)];
  }
  
  // If it has a walks property
  if (data.walks) {
    return normalizeWalkData(data.walks);
  }
  
  return [];
};

// API Methods
const filterWalks = async (params = {}) => {
  try {
    console.log('Fetching walks with params:', params);
    const response = await api.get('walks/walks', {
      searchParams: params
    }).json();
    
    console.log('Raw API Response:', response);
    
    const normalizedWalks = normalizeWalkData(response);
    if (!Array.isArray(normalizedWalks)) {
      throw new Error('Invalid walks data received');
    }
    
    console.log('Normalized walks:', normalizedWalks);
    
    return { walks: normalizedWalks };
  } catch (error) {
    console.error('API filterWalks error:', error);
    throw new Error(`Failed to fetch walks: ${error.message}`);
  }
};

const search = async (query) => {
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
};

const filter = async (categories) => {
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
};

const getGeometry = async (walkId) => {
  try {
    if (!walkId) throw new Error('Walk ID is required');
    
    const response = await api.get(`walks/geometry/${walkId}/`).json();
    return response;
  } catch (error) {
    console.error('API getGeometry error:', error);
    throw new Error(`Failed to fetch geometry: ${error.message}`);
  }
};

const getFeatures = async () => {
  try {
    const response = await api.get('walks/features/autocomplete/').json();
    return response;
  } catch (error) {
    console.error('API getFeatures error:', error);
    throw new Error(`Failed to fetch features: ${error.message}`);
  }
};

// Export the API object
export const WalksAPI = {
  filterWalks,
  search,
  filter,
  getGeometry,
  getFeatures
};

// Named exports for individual methods
export {
  filterWalks,
  search,
  filter,
  getGeometry,
  getFeatures
};

// Default export
export default WalksAPI;

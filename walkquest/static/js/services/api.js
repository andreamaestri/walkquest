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
    isExpanded: walk.isExpanded || false
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
    console.log('Fetching walks with params:', params)
    const response = await fetch('/api/walks', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log('Raw API Response:', data)

    // Ensure we return an array of walks
    const walks = Array.isArray(data) ? data : (data.walks || [])
    console.log('Processed walks:', walks)

    return { walks }
  } catch (error) {
    console.error('Error fetching walks:', error)
    throw error
  }
}

const search = async (query) => {
  try {
    const response = await api.get('walks', {
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
    const response = await fetch(`/api/walks/${walkId}/geometry`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
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
  getFeatures
}

// Default export
export default WalksAPI

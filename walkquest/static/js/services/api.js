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

export const WalksAPI = {
  async filterWalks(params = {}) {
    const response = await api.get('walks/').json();
    return response;
  },

  async search(query) {
    const response = await api.get(`walks/?search=${query}`).json();
    return response;
  },

  async filter(categories) {
    const response = await api.post('walks/filter/', { tag: categories }).json();
    return response;
  },

  async getGeometry(walkId) {
    const response = await api(`walks/geometry/${walkId}/`).json();
    return response;
  },

  async getFeatures() {
    const response = await api('walks/features/autocomplete/').json();
    return response;
  }
}

export default {
  filterWalks: WalksAPI.filterWalks,
  search: WalksAPI.search,
  filter: WalksAPI.filter,
  getGeometry: WalksAPI.getGeometry,
  getFeatures: WalksAPI.getFeatures
}

import axios from 'axios'

const api = axios.create({
  baseURL: '/walks/api',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value
  }
})

export const WalksAPI = {
  async filterWalks(params = {}) {
    const response = await api.get('/list/', { params })
    return response.data
  },

  async search(query) {
    const response = await api.get('/search/', { params: { q: query } })
    return response.data
  },

  async filter(categories) {
    const response = await api.post('/filter/', { tag: categories })
    return response.data
  },

  async getGeometry(walkId) {
    const response = await api.get(`/geometry/${walkId}/`)
    return response.data
  },

  async getFeatures() {
    const response = await api.get('/features/autocomplete/')
    return response.data
  }
}

export default {
  filterWalks: WalksAPI.filterWalks,
  search: WalksAPI.search,
  filter: WalksAPI.filter,
  getGeometry: WalksAPI.getGeometry,
  getFeatures: WalksAPI.getFeatures
}

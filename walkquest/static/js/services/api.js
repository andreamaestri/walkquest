import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value
  }
})

export const WalksAPI = {
  async list(params = {}) {
    const response = await api.get('/walks', { params })
    return response.data
  },

  async get(walkId) {
    const response = await api.get(`/walks/${walkId}`)
    return response.data
  },

  async toggleFavorite(walkId) {
    const response = await api.post(`/walks/${walkId}/favorite`)
    return response.data
  },

  async getTags() {
    const response = await api.get('/tags')
    return response.data
  },

  async getFilters() {
    const response = await api.get('/walks/filters')
    return response.data
  }
}

export const ConfigAPI = {
  async get() {
    const response = await api.get('/config')
    return response.data
  }
}

export default api

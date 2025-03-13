import { defineStore } from 'pinia'

export const useAdventureStore = defineStore('adventure', {
  state: () => ({
    adventures: [],
    isLoading: false,
    error: null
  }),

  getters: {
    getAdventureById: (state) => (id) => {
      return state.adventures.find(adventure => adventure.id === id)
    },
    activeAdventures: (state) => {
      return state.adventures.filter(adventure => adventure.status === 'IN_PROGRESS')
    }
  },

  actions: {
    // Helper function to get CSRF token from multiple sources
    getCSRFToken() {
      // First try the cookie (Django's default approach)
      let csrfToken = this.getCSRFCookie();
      
      // If not found in cookie, try meta tag
      if (!csrfToken) {
        const metaToken = document.querySelector('meta[name="csrf-token"]');
        if (metaToken) {
          csrfToken = metaToken.getAttribute('content');
        }
      }
      
      // If still not found, try hidden input field
      if (!csrfToken) {
        const inputToken = document.querySelector('input[name="csrfmiddlewaretoken"]');
        if (inputToken) {
          csrfToken = inputToken.value;
        }
      }
      
      return csrfToken;
    },

    // Get CSRF token from cookie
    getCSRFCookie() {
      const name = 'csrftoken';
      let cookieValue = null;
      if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i].trim();
          if (cookie.substring(0, name.length + 1) === (name + '=')) {
            cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
            break;
          }
        }
      }
      return cookieValue;
    },

    async createAdventure(adventureData) {
      this.isLoading = true
      this.error = null
      
      try {
        const csrfToken = this.getCSRFToken();
        if (!csrfToken) {
          throw new Error('CSRF token not found');
        }

        const response = await fetch('/api/adventures/log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRFToken': csrfToken
          },
          credentials: 'same-origin',
          body: JSON.stringify({
            title: adventureData.title,
            description: adventureData.description,
            start_date: adventureData.startDate,
            end_date: adventureData.endDate,
            start_time: adventureData.startTime || null,
            end_time: adventureData.endTime || null,
            difficulty_level: adventureData.difficultyLevel,
            categories: adventureData.categories,
            companion_ids: adventureData.companion_ids || [],
            walk_id: adventureData.walkId
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to create adventure');
        }

        const data = await response.json()
        this.adventures.push(data)
        return data

      } catch (error) {
        this.error = error.message
        throw error

      } finally {
        this.isLoading = false
      }
    },

    async fetchAdventures() {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await fetch('/api/adventures/')
        if (!response.ok) {
          throw new Error('Failed to fetch adventures')
        }

        const data = await response.json()
        this.adventures = data

      } catch (error) {
        this.error = error.message
        throw error

      } finally {
        this.isLoading = false
      }
    },

    async updateAdventureStatus(id, status) {
      this.isLoading = true
      this.error = null
      
      try {
        const csrfToken = this.getCSRFToken();
        if (!csrfToken) {
          throw new Error('CSRF token not found');
        }

        const response = await fetch(`/api/adventures/${id}/status/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRFToken': csrfToken
          },
          credentials: 'same-origin',
          body: JSON.stringify({ status })
        })

        if (!response.ok) {
          throw new Error('Failed to update adventure status')
        }

        const data = await response.json()
        
        // Update adventure in store
        const index = this.adventures.findIndex(a => a.id === id)
        if (index !== -1) {
          this.adventures[index] = { ...this.adventures[index], ...data }
        }

        return data

      } catch (error) {
        this.error = error.message
        throw error

      } finally {
        this.isLoading = false
      }
    }
  }
})

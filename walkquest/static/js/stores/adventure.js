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

        // Prepare data, ensuring optional fields are handled properly
        const payload = {
          title: adventureData.title,
          description: adventureData.description,
          start_date: adventureData.startDate,
          end_date: adventureData.endDate,
          difficulty_level: adventureData.difficultyLevel,
          walk_id: adventureData.walkId
        };

        // Only add non-null values for optional fields
        if (adventureData.startTime) payload.start_time = adventureData.startTime;
        if (adventureData.endTime) payload.end_time = adventureData.endTime;
        
        // Only add non-empty arrays
        if (adventureData.categories && adventureData.categories.length > 0) {
          payload.categories = adventureData.categories;
        } else {
          // Send default category if none provided
          payload.categories = ['circular'];
        }
        
        if (adventureData.companion_ids && adventureData.companion_ids.length > 0) {
          payload.companion_ids = adventureData.companion_ids;
        }

        const response = await fetch('/api/adventures/log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            // Django CSRF protection
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest'
          },
          credentials: 'include',
          body: JSON.stringify({
            title: adventureData.title,
            description: adventureData.description,
            start_date: adventureData.startDate,
            end_date: adventureData.endDate,
            start_time: adventureData.startTime || null,
            end_time: adventureData.endTime || null,
            difficulty_level: adventureData.difficultyLevel,
            categories: Array.isArray(adventureData.categories) ? adventureData.categories : [],
            companion_ids: Array.isArray(adventureData.companion_ids) ? adventureData.companion_ids : [],
            walk_id: adventureData.walkId
          })
        })

        if (!response.ok) {
          let errorMessage = 'Failed to create adventure';
          try {
            const errorData = await response.json();
            if (errorData.message) {
              errorMessage = errorData.message;
            } else if (errorData.detail) {
              errorMessage = errorData.detail;
            } else if (typeof errorData === 'object') {
              // Handle validation errors which might be returned as an object with field names as keys
              const errors = [];
              for (const [field, fieldErrors] of Object.entries(errorData)) {
                if (Array.isArray(fieldErrors)) {
                  errors.push(`${field}: ${fieldErrors.join(', ')}`);
                } else if (typeof fieldErrors === 'string') {
                  errors.push(`${field}: ${fieldErrors}`);
                } else if (typeof fieldErrors === 'object') {
                  errors.push(`${field}: ${JSON.stringify(fieldErrors)}`);
                }
              }
              if (errors.length > 0) {
                errorMessage = errors.join('\n');
              }
            }
            throw new Error(errorMessage, { cause: errorData });
          } catch (parseError) {
            // If we can't parse the error as JSON, just throw with status text
            throw new Error(`${errorMessage}: ${response.statusText}`);
          }
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

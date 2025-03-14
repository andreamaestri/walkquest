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

        // Validate required fields before sending
        const requiredFields = ['title', 'startDate', 'endDate', 'startTime', 'endTime', 'difficultyLevel', 'walkId'];
        const missingFields = requiredFields.filter(field => !adventureData[field]);
        
        if (missingFields.length > 0) {
          throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        // Prepare data with ALL required fields - ensure none are null/undefined
        const payload = {
          title: adventureData.title,
          description: adventureData.description || "",
          // Convert dates to ISO format strings if they're Date objects
          start_date: typeof adventureData.startDate === 'object' 
            ? adventureData.startDate.toISOString().split('T')[0] 
            : adventureData.startDate,
          end_date: typeof adventureData.endDate === 'object'
            ? adventureData.endDate.toISOString().split('T')[0]
            : adventureData.endDate,
          start_time: adventureData.startTime,
          end_time: adventureData.endTime,
          walk_id: adventureData.walkId,
          difficulty_level: adventureData.difficultyLevel.replace(/'/g, "'"),
          // Always include companion_ids as an array (even if empty)
          companion_ids: [],
          // Always include categories with at least a default value
          categories: (adventureData.categories && adventureData.categories.length > 0) 
            ? adventureData.categories 
            : ['circular']
        };
        
        // Handle companions properly - convert from objects to IDs if needed
        if (adventureData.companions && adventureData.companions.length > 0) {
          // Extract IDs from companion objects if they're objects
          payload.companion_ids = adventureData.companions.map(companion => 
            typeof companion === 'object' ? companion.id : companion
          ).filter(id => id !== null && id !== undefined);
        } else if (adventureData.companion_ids && adventureData.companion_ids.length > 0) {
          // If companion_ids is directly provided, filter out null values
          payload.companion_ids = adventureData.companion_ids.filter(id => id !== null && id !== undefined);
        }

        console.log('Sending adventure payload:', JSON.stringify(payload));

        const response = await fetch('/api/adventures/log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest'
          },
          credentials: 'include',
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          let errorMessage = 'Failed to create adventure';
          
          // Enhanced error handling
          try {
            const errorData = await response.json();
            console.log('Server error response:', errorData);
            
            if (errorData.message) {
              errorMessage = errorData.message;
            } else if (errorData.detail) {
              // Handle detailed validation errors from FastAPI/Pydantic
              if (Array.isArray(errorData.detail)) {
                const errors = errorData.detail.map(err => {
                  const field = err.loc[err.loc.length - 1];
                  return `${field}: ${err.msg}`;
                });
                errorMessage = errors.join(', ');
              } else {
                errorMessage = errorData.detail;
              }
            } else if (typeof errorData === 'object') {
              // Handle other validation errors
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
                errorMessage = errors.join(', ');
              }
            }
            throw new Error(errorMessage, { cause: errorData });
          } catch (parseError) {
            // If we can't parse the error as JSON, just throw with status text
            throw new Error(`${errorMessage}: ${response.statusText}`);
          }
        }

        const data = await response.json();
        this.adventures.push(data);
        return data;

      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.isLoading = false;
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

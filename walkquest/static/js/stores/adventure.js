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
    async createAdventure(adventureData) {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await fetch('/api/adventures/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            title: adventureData.title,
            description: adventureData.description,
            start_date: adventureData.startDate,
            end_date: adventureData.endDate,
            start_time: adventureData.startTime || null,
            end_time: adventureData.endTime || null,
            difficulty_level: adventureData.difficultyLevel,
            related_categories: adventureData.categories,
            companions: adventureData.companions || [],
            walk_id: adventureData.walkId
          })
        })

        if (!response.ok) {
          throw new Error('Failed to create adventure')
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
        const response = await fetch(`/api/adventures/${id}/status/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
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

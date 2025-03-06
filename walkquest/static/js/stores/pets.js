import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePetsStore = defineStore('pets', () => {
  const userPets = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  async function fetchUserPets() {
    isLoading.value = true
    error.value = null
    try {
      const response = await fetch('/api/pets/')
      if (!response.ok) throw new Error('Failed to fetch pets')
      userPets.value = await response.json()
    } catch (e) {
      error.value = e.message
      console.error('Error fetching pets:', e)
    } finally {
      isLoading.value = false
    }
  }

  async function addPet(name) {
    isLoading.value = true
    error.value = null
    try {
      const response = await fetch('/api/pets/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      })
      if (!response.ok) throw new Error('Failed to add pet')
      const newPet = await response.json()
      userPets.value.push(newPet)
      return newPet
    } catch (e) {
      error.value = e.message
      console.error('Error adding pet:', e)
      throw e
    } finally {
      isLoading.value = false
    }
  }

  return {
    userPets,
    isLoading,
    error,
    fetchUserPets,
    addPet
  }
})

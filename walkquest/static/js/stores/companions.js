import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useCompanionsStore = defineStore('companions', () => {
  const userCompanions = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  async function fetchUserCompanions() {
    isLoading.value = true
    error.value = null
    try {
      const response = await fetch('/api/adventures/companions/')
      if (!response.ok) throw new Error('Failed to fetch companions')
      const data = await response.json()
      userCompanions.value = data.companions
    } catch (e) {
      error.value = e.message
      console.error('Error fetching companions:', e)
    } finally {
      isLoading.value = false
    }
  }

  async function addCompanion(name) {
    isLoading.value = true
    error.value = null
    try {
      const response = await fetch('/api/adventures/companions/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      })
      if (!response.ok) throw new Error('Failed to add companion')
      const newCompanion = await response.json()
      userCompanions.value.push(newCompanion)
      return newCompanion
    } catch (e) {
      error.value = e.message
      console.error('Error adding companion:', e)
      throw e
    } finally {
      isLoading.value = false
    }
  }

  return {
    userCompanions,
    isLoading,
    error,
    fetchUserCompanions,
    addCompanion
  }
})

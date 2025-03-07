import { ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'

export function usePreferences() {
  const authStore = useAuthStore()
  const preferences = ref(loadPreferences())

  // Watch for auth state changes to load correct preferences
  watch(() => authStore.isAuthenticated, (isAuthenticated) => {
    if (isAuthenticated) {
      loadUserPreferences()
    } else {
      // Reset to local preferences when logged out
      preferences.value = loadPreferences()
    }
  })

  function loadPreferences() {
    const stored = localStorage.getItem('preferences')
    return stored ? JSON.parse(stored) : {
      theme: 'system', // system, light, dark
      language: 'en',
      notifications: true,
      mapStyle: 'streets', // streets, satellite, terrain
      units: 'metric' // metric, imperial
    }
  }

  async function loadUserPreferences() {
    if (!authStore.isAuthenticated) return

    try {
      const response = await fetch('/api/preferences/')
      if (response.ok) {
        const data = await response.json()
        preferences.value = {
          ...loadPreferences(), // Keep defaults for missing values
          ...data
        }
        // Sync to localStorage as backup
        saveToLocal()
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error)
    }
  }

  async function savePreference(key, value) {
    preferences.value[key] = value
    saveToLocal()

    if (authStore.isAuthenticated) {
      try {
        await fetch('/api/preferences/', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
          },
          body: JSON.stringify({ [key]: value })
        })
      } catch (error) {
        console.error('Failed to save preference to server:', error)
      }
    }
  }

  function saveToLocal() {
    localStorage.setItem('preferences', JSON.stringify(preferences.value))
  }

  return {
    preferences,
    savePreference,
    loadUserPreferences
  }
}
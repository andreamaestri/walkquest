import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useUiStore } from './ui'
import { useWalksStore } from './walks'
import { calculateDistance, formatDistance, isWithinRadius } from '../utils/distance'

export const useLocationStore = defineStore('location', () => {
  const uiStore = useUiStore()
  const walksStore = useWalksStore()

  // State
  const userLocation = ref(null)
  const searchRadius = ref(5000) // 5km default radius
  const nearbyWalks = ref([])

  // Computed
  const formattedSearchRadius = computed(() => formatDistance(searchRadius.value))

  // Actions
  async function setUserLocation(location) {
    try {
      uiStore.setLoadingState('location', true)
      userLocation.value = location
      await findNearbyWalks()
    } catch (error) {
      console.error('Error setting location:', error)
      uiStore.setError('Failed to update location')
    } finally {
      uiStore.setLoadingState('location', false)
    }
  }

  async function findNearbyWalks() {
    if (!userLocation.value) return

    try {
      uiStore.setLoadingState('location', true)
      const walks = walksStore.walks
      nearbyWalks.value = walks.filter(walk => {
        if (!walk.latitude || !walk.longitude) return false
        
        return isWithinRadius(
          userLocation.value.latitude,
          userLocation.value.longitude,
          walk.latitude,
          walk.longitude,
          searchRadius.value
        )
      }).map(walk => ({
        ...walk,
        distance: calculateDistance(
          userLocation.value.latitude,
          userLocation.value.longitude,
          walk.latitude,
          walk.longitude
        ),
      })).sort((a, b) => a.distance - b.distance) // Sort by distance
    } catch (error) {
      console.error('Error finding nearby walks:', error)
      uiStore.setError('Failed to find nearby walks')
      nearbyWalks.value = []
    } finally {
      uiStore.setLoadingState('location', false)
    }
  }

  function setSearchRadius(radius) {
    searchRadius.value = radius
    if (userLocation.value) {
      findNearbyWalks()
    }
  }

  function clearLocation() {
    userLocation.value = null
    nearbyWalks.value = []
  }

  function getFormattedDistance(walkId) {
    const walk = nearbyWalks.value.find(w => w.id === walkId)
    return walk ? formatDistance(walk.distance) : null
  }

  return {
    // State
    userLocation,
    searchRadius,
    nearbyWalks,
    
    // Computed
    formattedSearchRadius,
    
    // Actions
    setUserLocation,
    findNearbyWalks,
    setSearchRadius,
    clearLocation,
    getFormattedDistance
  }
})
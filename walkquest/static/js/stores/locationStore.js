import { defineStore } from 'pinia'
import { ref, computed, shallowRef } from 'vue'
import { useUiStore } from './ui'
import { useWalksStore } from './walks'
import { calculateDistance, formatDistance } from '../utils/distance'

export const useLocationStore = defineStore('location', () => {
  const uiStore = useUiStore()
  const walksStore = useWalksStore()

  // State
  const userLocation = ref(null)
  const searchRadius = ref(5000) // 5km default radius
  const nearbyWalks = shallowRef([])
  
  // Use Map for O(1) lookup
  const walkDistances = new Map()
  
  // Computed
  const formattedSearchRadius = computed(() => formatDistance(searchRadius.value))

  // Helper function to get cached distance
  function getCachedDistance(lat1, lng1, lat2, lng2) {
    const key = `${lat1},${lng1}-${lat2},${lng2}`
    const cached = walkDistances.get(key)
    if (cached !== undefined) {
      return cached
    }
    const distance = calculateDistance(lat1, lng1, lat2, lng2)
    walkDistances.set(key, distance)
    return distance
  }

  // Actions
  async function setUserLocation(location) {
    if (!location?.latitude || !location?.longitude) {
      console.error('Invalid location data:', location)
      return
    }

    try {
      userLocation.value = {
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        place_name: location.place_name
      }

      await findNearbyWalks()
      
    } catch (error) {
      console.error('Error setting location:', error)
      userLocation.value = null
    }
  }

  async function findNearbyWalks() {
    if (!userLocation.value?.latitude || !userLocation.value?.longitude) {
      nearbyWalks.value = []
      return
    }

    try {
      const timerLabel = `findNearby-${Date.now()}`
      console.time(timerLabel)
      
      const userLat = userLocation.value.latitude
      const userLng = userLocation.value.longitude
      
      // Process walks in chunks for better performance
      const chunkSize = 50
      const walks = walksStore.walks
      const results = []
      
      for (let i = 0; i < walks.length; i += chunkSize) {
        const chunk = walks.slice(i, Math.min(i + chunkSize, walks.length))
        
        // Process chunk
        const chunkResults = chunk
          .map(walk => {
            if (!walk.latitude || !walk.longitude) return null
            
            const distance = getCachedDistance(
              userLat,
              userLng,
              Number(walk.latitude),
              Number(walk.longitude)
            )
            
            if (distance <= searchRadius.value) {
              return { ...walk, distance }
            }
            return null
          })
          .filter(Boolean)
        
        results.push(...chunkResults)
        
        // Allow UI to update between chunks
        if (i + chunkSize < walks.length) {
          await new Promise(resolve => setTimeout(resolve, 0))
        }
      }

      // Sort by distance and update state
      nearbyWalks.value = results.sort((a, b) => a.distance - b.distance)
      
      console.timeEnd(timerLabel)

    } catch (error) {
      console.error('Error finding nearby walks:', error)
      nearbyWalks.value = []
    }
  }

  function clearLocation() {
    userLocation.value = null
    nearbyWalks.value = []
    walkDistances.clear()
  }

  function setSearchRadius(radius) {
    if (typeof radius !== 'number' || radius <= 0) return
    searchRadius.value = radius
    if (userLocation.value) {
      findNearbyWalks()
    }
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
    clearLocation,
    setSearchRadius
  }
})
import { defineStore } from 'pinia'
import { ref, computed, shallowRef } from 'vue'
import { useUiStore } from './ui'
import { useWalkStore } from './walkStore'
import { calculateDistance, formatDistance } from '../utils/distance'

export const useLocationStore = defineStore('location', () => {
  const uiStore = useUiStore()
  const walkStore = useWalkStore()

  // Load saved state
  const loadSavedState = () => {
    try {
      const savedLocation = localStorage.getItem('userLocation')
      const savedRadius = localStorage.getItem('searchRadius')
      return {
        location: savedLocation ? JSON.parse(savedLocation) : null,
        radius: savedRadius ? Number(savedRadius) : 5000
      }
    } catch (error) {
      console.error('Error loading saved location state:', error)
      return { location: null, radius: 5000 }
    }
  }

  const { location: savedLocation, radius: savedRadius } = loadSavedState()

  // State
  const userLocation = ref(savedLocation)
  const searchRadius = ref(savedRadius)
  const nearbyWalks = shallowRef([])
  // Limit the Map size to prevent unbounded growth
  const MAX_DISTANCE_CACHE_SIZE = 1000
  const walkDistances = new Map()
  const hasSearched = ref(false)
  
  // Computed
  const formattedSearchRadius = computed(() => formatDistance(searchRadius.value))
  const hasLocation = computed(() => !!userLocation.value)

  // Save state helper
  const saveState = () => {
    try {
      if (userLocation.value) {
        localStorage.setItem('userLocation', JSON.stringify(userLocation.value))
      } else {
        localStorage.removeItem('userLocation')
      }
      localStorage.setItem('searchRadius', String(searchRadius.value))
    } catch (error) {
      console.error('Error saving location state:', error)
    }
  }

  // Actions
  async function setUserLocation(location) {
    if (!location?.latitude || !location?.longitude) {
      console.error('Invalid location data:', location)
      return
    }

    try {
      uiStore.setLoadingState('location', true)
      
      const normalizedLocation = {
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        place_name: location.place_name
      }

      userLocation.value = normalizedLocation
      saveState()
      
      await findNearbyWalks()
      
    } catch (error) {
      console.error('Error setting location:', error)
      userLocation.value = null
      localStorage.removeItem('userLocation')
    } finally {
      uiStore.setLoadingState('location', false)
    }
  }

  function getFormattedDistance(walkId) {
    const distance = walkDistances.get(walkId)
    if (distance === undefined) return ''
    return formatDistance(distance)
  }

  async function findNearbyWalks() {
    if (!userLocation.value?.latitude || !userLocation.value?.longitude) {
      nearbyWalks.value = []
      return
    }

    try {
      const userLat = userLocation.value.latitude
      const userLng = userLocation.value.longitude
      
      // Process walks in chunks for better performance
      const chunkSize = 50
      const walks = walkStore.walks
      const results = []
      
      for (let i = 0; i < walks.length; i += chunkSize) {
        const chunk = walks.slice(i, Math.min(i + chunkSize, walks.length))
        
        const chunkResults = chunk
          .map(walk => {
            if (!walk.latitude || !walk.longitude) return null
            
            const distance = calculateDistance(
              userLat,
              userLng,
              Number(walk.latitude),
              Number(walk.longitude)
            )
            
            // Store the distance for later use with cache size management
            walkDistances.set(walk.id, distance)
            
            // Trim cache if it exceeds maximum size
            if (walkDistances.size > MAX_DISTANCE_CACHE_SIZE) {
              // Remove oldest entries (first 20% of max size)
              const keysToDelete = Array.from(walkDistances.keys()).slice(0, MAX_DISTANCE_CACHE_SIZE * 0.2)
              keysToDelete.forEach(key => walkDistances.delete(key))
            }
            
            if (distance <= searchRadius.value) {
              return { ...walk, distance }
            }
            return null
          })
          .filter(Boolean)
        
        results.push(...chunkResults)
        
        if (i + chunkSize < walks.length) {
          await new Promise(resolve => setTimeout(resolve, 0))
        }
      }

      nearbyWalks.value = results.sort((a, b) => a.distance - b.distance)
      hasSearched.value = true

    } catch (error) {
      console.error('Error finding nearby walks:', error)
      nearbyWalks.value = []
      hasSearched.value = false
    }
  }

  function clearLocation() {
    userLocation.value = null
    nearbyWalks.value = []
    walkDistances.clear()
    localStorage.removeItem('userLocation')
    hasSearched.value = false
  }

  function setSearchRadius(radius) {
    if (typeof radius !== 'number' || radius <= 0) return
    searchRadius.value = radius
    localStorage.setItem('searchRadius', String(radius))
    if (userLocation.value) {
      findNearbyWalks()
    }
  }

  // Initialize if we have saved data
  if (savedLocation) {
    findNearbyWalks()
  }

  return {
    // State
    userLocation,
    searchRadius,
    nearbyWalks,
    hasLocation,
    hasSearched,

    // Computed
    formattedSearchRadius,

    // Actions
    setUserLocation,
    clearLocation,
    setSearchRadius,
    findNearbyWalks,
    getFormattedDistance
  }
})
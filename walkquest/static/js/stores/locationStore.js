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
  const nearbyWalks = ref([])
  
  // Cache spatial index using shallowRef for better performance
  const spatialIndex = shallowRef(new Map())
  const cellSize = 0.1 // roughly 11km at equator
  let indexInitialized = false

  // Computed
  const formattedSearchRadius = computed(() => formatDistance(searchRadius.value))

  // Initialize spatial index once
  function initializeSpatialIndex() {
    if (indexInitialized) return
    
    console.time('spatialIndex')
    const walks = walksStore.walks
    const newIndex = new Map()

    // Index walks by grid cells
    for (const walk of walks) {
      if (!walk.latitude || !walk.longitude) continue
      
      const lat = Number(walk.latitude)
      const lng = Number(walk.longitude)
      
      const cellX = Math.floor(lng / cellSize)
      const cellY = Math.floor(lat / cellSize)
      
      const key = `${cellX}:${cellY}`
      if (!newIndex.has(key)) {
        newIndex.set(key, [])
      }
      newIndex.get(key).push(walk)
    }

    spatialIndex.value = newIndex
    indexInitialized = true
    console.timeEnd('spatialIndex')
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

      // Initialize index if needed
      if (!indexInitialized) {
        initializeSpatialIndex()
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
      console.time('findNearby')
      
      // Get user location cell
      const userLat = userLocation.value.latitude
      const userLng = userLocation.value.longitude
      const userCellX = Math.floor(userLng / cellSize)
      const userCellY = Math.floor(userLat / cellSize)
      
      // Calculate radius in cells
      const radiusCells = Math.ceil(searchRadius.value / (111000 * cellSize))
      
      // Use Set for deduplication
      const candidates = new Set()
      
      // Collect walks from nearby cells
      for (let x = -radiusCells; x <= radiusCells; x++) {
        for (let y = -radiusCells; y <= radiusCells; y++) {
          const key = `${userCellX + x}:${userCellY + y}`
          const cellWalks = spatialIndex.value.get(key)
          if (cellWalks) {
            for (const walk of cellWalks) {
              candidates.add(walk)
            }
          }
        }
      }

      // Calculate distances in batch
      const results = []
      const batchSize = 100
      const walks = Array.from(candidates)
      
      for (let i = 0; i < walks.length; i += batchSize) {
        const batch = walks.slice(i, i + batchSize)
        const batchResults = batch.map(walk => {
          if (!walk.latitude || !walk.longitude) return null
          
          const distance = calculateDistance(
            userLat,
            userLng,
            Number(walk.latitude),
            Number(walk.longitude)
          )
          
          if (distance <= searchRadius.value) {
            return { ...walk, distance }
          }
          return null
        }).filter(Boolean)
        
        results.push(...batchResults)
      }

      // Sort and update state
      nearbyWalks.value = results.sort((a, b) => a.distance - b.distance)
      
      console.timeEnd('findNearby')

    } catch (error) {
      console.error('Error finding nearby walks:', error)
      nearbyWalks.value = []
    }
  }

  function setSearchRadius(radius) {
    searchRadius.value = Number(radius)
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
    if (!walk?.distance) return null
    return formatDistance(walk.distance)
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
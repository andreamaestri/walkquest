import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useUiStore } from './ui'
import { WalksAPI } from '../services/api'

export const useWalksStore = defineStore('walks', () => {
  const uiStore = useUiStore()
  
  // State
  const walks = ref([])
  const selectedWalk = ref(null)
  const loading = ref(false)
  
  // Actions
  const loadWalks = async () => {
    if (loading.value) return walks.value
    
    try {
      loading.value = true
      uiStore.setLoadingState('walks', true)
      
      const { walks: loadedWalks } = await WalksAPI.filterWalks()
      walks.value = loadedWalks?.map(walk => ({
        ...walk,
        isExpanded: false
      })) || []
      
      return walks.value
    } catch (error) {
      console.error('Failed to load walks:', error)
      uiStore.setError('Failed to load walks. Please try again.')
      return []
    } finally {
      loading.value = false
      uiStore.setLoadingState('walks', false)
    }
  }
  
  const setWalks = (newWalks) => {
    walks.value = newWalks
  }
  
  const setSelectedWalk = (walk) => {
    selectedWalk.value = walk
  }
  
  const setLoading = (state) => {
    loading.value = state
    uiStore.setLoadingState('walks', state)
  }

  // Computed
  const getWalkById = computed(() => {
    return (id) => walks.value.find(w => w.id === id)
  })
  
  return {
    // State
    walks,
    selectedWalk,
    loading,
    
    // Actions
    loadWalks,
    setWalks,
    setSelectedWalk,
    setLoading,
    
    // Computed
    getWalkById
  }
})
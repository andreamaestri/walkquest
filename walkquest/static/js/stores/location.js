import { defineStore } from 'pinia'

export const useLocationStore = defineStore('location', {
  state: () => ({
    userLocation: null
  }),
  
  actions: {
    setUserLocation(location) {
      this.userLocation = location
    },
    
    clearLocation() {
      this.userLocation = null
    }
  }
})

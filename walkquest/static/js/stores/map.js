import { defineStore } from 'pinia'

export const useMapStore = defineStore('map', {
  state: () => ({
    mapInstance: null,
    mapLoaded: false,
    selectedMarker: null,
    center: [-4.85, 50.4],
    zoom: 9.5
  }),

  actions: {
    setMapInstance(map) {
      this.mapInstance = map
      this.mapLoaded = true
    },

    setSelectedMarker(marker) {
      this.selectedMarker = marker
    },

    setCenter(center) {
      this.center = center
    },

    setZoom(zoom) {
      this.zoom = zoom
    }
  }
})
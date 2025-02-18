import { ref } from 'vue'

let mapInstance = null

export function useMap() {
  const setMapInstance = (map) => {
    mapInstance = map
  }

  const flyToLocation = async ({ center, zoom, pitch = 0 }) => {
    if (!mapInstance) return
    
    await mapInstance.flyTo({
      center,
      zoom,
      pitch,
      duration: 1000,
      essential: true
    })
  }

  return {
    mapInstance: ref(mapInstance),
    setMapInstance,
    flyToLocation
  }
}
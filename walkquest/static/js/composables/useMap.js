import { ref } from 'vue'

const mapInstance = ref(null)

export function useMap() {
  const setMapInstance = (map) => {
    mapInstance.value = map
  }

  const flyToLocation = async ({ center, zoom = 14, pitch = 45 }) => {
    if (!mapInstance.value) return

    return new Promise((resolve) => {
      mapInstance.value.flyTo({
        center,
        zoom,
        pitch,
        duration: 2000,
        essential: true
      })

      mapInstance.value.once('moveend', () => {
        resolve()
      })
    })
  }

  return {
    setMapInstance,
    flyToLocation,
    mapInstance
  }
}
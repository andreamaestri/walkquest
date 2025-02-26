import { ref, shallowRef } from 'vue';

export function useMap() {
  const mapInstance = shallowRef(null);
  
  // Set map instance
  const setMapInstance = (map) => {
    if (map) {
      mapInstance.value = map;
    }
  };

  // Add the missing flyToLocation function
  const flyToLocation = async (options) => {
    if (!mapInstance.value) {
      console.error('Map instance not available for flyToLocation');
      return;
    }
    
    try {
      // Extract options with defaults
      const {
        center,
        zoom = 12,
        pitch = 0,
        bearing = 0,
        duration = 2000,
        essential = true,
        callback = null
      } = options;
      
      // Fly to the specified location
      await mapInstance.value.flyTo({
        center,
        zoom,
        pitch,
        bearing,
        duration,
        essential
      });
      
      // Wait for moveend event before executing callback
      if (typeof callback === 'function') {
        const onMoveEnd = () => {
          mapInstance.value.off('moveend', onMoveEnd);
          callback();
        };
        
        mapInstance.value.once('moveend', onMoveEnd);
      }
    } catch (error) {
      console.error('Error flying to location:', error);
      throw error;
    }
  };
  
  // Return functions and state
  return {
    mapInstance,
    setMapInstance,
    flyToLocation
  };
}
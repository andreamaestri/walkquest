import { ref, shallowRef, nextTick } from 'vue';

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
      
      // Fly to the specified location with a delay to prevent state issues
      await mapInstance.value.flyTo({
        center,
        zoom,
        pitch,
        bearing,
        duration,
        essential
      });
      
      // Use a promise to handle the moveend event
      if (typeof callback === 'function') {
        return new Promise((resolve) => {
          const onMoveEnd = () => {
            // Remove the event listener to prevent memory leaks
            mapInstance.value.off('moveend', onMoveEnd);
            // Use nextTick to ensure Vue has updated the DOM
            nextTick(() => {
              callback();
              resolve();
            });
          };
          mapInstance.value.once('moveend', onMoveEnd);
        });
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
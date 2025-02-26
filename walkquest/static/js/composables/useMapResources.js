import { ref, onBeforeUnmount } from 'vue';
import { useMap } from './useMap';

/**
 * Composable for managing map resources like layers and sources
 * Provides utilities for checking existence, cleanup, and animation
 */
export function useMapResources() {
  const { mapInstance } = useMap();
  let animationFrame = null;

  /**
   * Check if a layer exists in the map
   * @param {string} layerId - The ID of the layer to check
   * @returns {boolean} - Whether the layer exists
   */
  const layerExists = (layerId) => {
    if (!mapInstance.value || !layerId) return false;
    try {
      return !!mapInstance.value.getLayer(layerId);
    } catch (error) {
      console.warn(`Error checking if layer exists (${layerId}):`, error);
      return false;
    }
  };

  /**
   * Check if a source exists in the map
   * @param {string} sourceId - The ID of the source to check
   * @returns {boolean} - Whether the source exists
   */
  const sourceExists = (sourceId) => {
    if (!mapInstance.value || !sourceId) return false;
    try {
      return !!mapInstance.value.getSource(sourceId);
    } catch (error) {
      console.warn(`Error checking if source exists (${sourceId}):`, error);
      return false;
    }
  };

  /**
   * Clean up map resources (layers and sources)
   * @param {Object} options - Cleanup options
   * @param {Array<string>} options.layerIds - Layer IDs to remove
   * @param {Array<string>} options.sourceIds - Source IDs to remove
   * @returns {Promise<void>}
   */
  const cleanupMapResources = async ({ layerIds = [], sourceIds = [] }) => {
    console.log('Cleaning up map resources');
    
    // 1. First cancel any animation frame
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
      console.log('Animation frame cancelled');
    }

    // 2. Only proceed with map cleanup if we have a map instance
    if (mapInstance.value) {
      try {
        // 3. Remove layers first (they depend on the source)
        for (const layerId of layerIds) {
          if (layerExists(layerId)) {
            console.log(`Removing layer: ${layerId}`);
            mapInstance.value.removeLayer(layerId);
          }
        }

        // 4. Wait a tick to ensure layers are removed before removing sources
        await new Promise(resolve => setTimeout(resolve, 0));
        
        // 5. Remove sources
        for (const sourceId of sourceIds) {
          try {
            if (mapInstance.value && sourceExists(sourceId)) {
              console.log(`Removing source: ${sourceId}`);
              mapInstance.value.removeSource(sourceId);
            }
          } catch (error) {
            console.error('Error removing map source:', error);
          }
        }
      } catch (error) {
        console.error('Error during map cleanup:', error);
      }
    }
  };

  /**
   * Generate a unique ID for map resources
   * @param {string} prefix - Prefix for the ID
   * @returns {string} - Unique ID
   */
  const generateUniqueId = (prefix = 'resource') => {
    return `${prefix}-${Math.random().toString(36).substring(2, 10)}`;
  };

  /**
   * Validate GeoJSON data
   * @param {Object} data - GeoJSON data to validate
   * @returns {boolean} - Whether the data is valid GeoJSON
   */
  const isValidGeoJSON = (data) => {
    if (!data || typeof data !== 'object') return false;
    if (!data.type) return false;
    if (!data.geometry || !data.geometry.coordinates) return false;
    if (!Array.isArray(data.geometry.coordinates)) return false;
    
    return true;
  };

  /**
   * Start an animation with automatic cleanup
   * @param {Function} animationCallback - Animation frame callback
   */
  const startAnimation = (animationCallback) => {
    // Cancel any existing animation
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
    
    // Start a new animation
    const animate = (timestamp) => {
      animationCallback(timestamp);
      animationFrame = requestAnimationFrame(animate);
    };
    
    animationFrame = requestAnimationFrame(animate);
  };

  /**
   * Stop any running animation
   */
  const stopAnimation = () => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  };

  // Clean up resources on component unmount
  onBeforeUnmount(() => {
    stopAnimation();
  });

  return {
    layerExists,
    sourceExists,
    cleanupMapResources,
    generateUniqueId,
    isValidGeoJSON,
    startAnimation,
    stopAnimation
  };
}
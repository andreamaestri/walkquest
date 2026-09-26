import { shallowRef } from 'vue';

// One map per page: shared module-level state so every component that calls
// useMap() talks to the same mapbox-gl instance.
const mapInstance = shallowRef(null);

export function useMap() {
  const setMapInstance = (map) => {
    mapInstance.value = map || null;
  };

  /** Flies to a location; resolves when the camera settles. */
  const flyToLocation = ({ center, zoom = 12, pitch = 0, bearing = 0, duration = 1600 } = {}) =>
    new Promise((resolve) => {
      const map = mapInstance.value;
      if (!map || !center) return resolve();
      map.once('moveend', () => resolve());
      map.flyTo({ center, zoom, pitch, bearing, duration, essential: true });
    });

  return { mapInstance, setMapInstance, flyToLocation };
}

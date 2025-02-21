/**
 * Calculates the distance between two points in meters using the Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in meters
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180
  const φ2 = lat2 * Math.PI/180
  const Δφ = (lat2-lat1) * Math.PI/180
  const Δλ = (lon2-lon1) * Math.PI/180

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

  return R * c // Distance in meters
}

/**
 * Formats a distance in meters to a human-readable string
 * @param {number} distance - Distance in meters
 * @returns {string} Formatted distance string
 */
export function formatDistance(distance) {
  if (!distance) return ''
  
  if (distance < 1000) {
    return `${Math.round(distance)}m`
  } else {
    return `${(distance / 1000).toFixed(1)}km`
  }
}

/**
 * Checks if a point is within a given radius of another point
 * @param {number} lat1 - Center point latitude
 * @param {number} lon1 - Center point longitude
 * @param {number} lat2 - Test point latitude
 * @param {number} lon2 - Test point longitude
 * @param {number} radius - Radius in meters
 * @returns {boolean} True if the point is within the radius
 */
export function isWithinRadius(lat1, lon1, lat2, lon2, radius) {
    return calculateDistance(lat1, lon1, lat2, lon2) <= radius;
}
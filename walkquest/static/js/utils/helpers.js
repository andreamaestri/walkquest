/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 */
export function debounce(func, wait, context = null) {
  let timeout;
  return function(...args) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context || this, args), wait);
  };
}

/**
 * Adds an event listener with automatic cleanup
 */
export function addEvent(target, event, handler, options = {}) {
  target.addEventListener(event, handler, options);
  return () => target.removeEventListener(event, handler, options);
}

/**
 * Gets a marker color based on steepness level
 */
export function getMarkerColor(steepnessLevel) {
  const colors = {
    "Warden's Ascent": '#DC2626',    // Red for challenging
    'Merchant Path': '#4338CA',       // Blue for moderate
    'Village Trail': '#10B981'        // Green for easy
  };
  return colors[steepnessLevel] || '#242424'; // Default color
}

/**
 * Gets badge information for a steepness level
 */
export const getBadgeInfo = (steepnessLevel) => {
  const badges = {
    "Warden's Ascent": {
      color: 'bg-red-100 text-red-800',
      icon: 'mdi:mountain'
    },
    'Merchant Path': {
      color: 'bg-blue-100 text-blue-800',
      icon: 'mdi:hiking'
    },
    'Village Trail': {
      color: 'bg-green-100 text-green-800',
      icon: 'mdi:nature-people'
    }
  }
  return badges[steepnessLevel] || { 
    color: 'bg-gray-100 text-gray-800', 
    icon: 'mdi:walk' 
  }
}
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
    'Easy': '#10B981',      // Green
    'Moderate': '#4338CA',  // Blue
    'Challenging': '#DC2626' // Red
  };
  return colors[steepnessLevel] || '#242424'; // Default color
}

/**
 * Gets badge information for a steepness level
 */
export const getBadgeInfo = (difficulty) => {
  const badges = {
    'easy': {
      color: 'badge-green',
      icon: '🟢'
    },
    'moderate': {
      color: 'badge-yellow',
      icon: '🟡'
    },
    'challenging': {
      color: 'badge-red',
      icon: '🔴'
    }
  }
  return badges[difficulty.toLowerCase()] || { color: 'badge-gray', icon: '⚪️' }
}
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
 * Normalizes steepness level values
 */
export function normalizeLevel(steepnessLevel) {
  if (!steepnessLevel) return "NOVICE WANDERER";
  
  // Handle possible aliases
  if (steepnessLevel === "NOVICE") return "NOVICE WANDERER";
  
  return steepnessLevel;
}

/**
 * Gets a marker color based on steepness level
 */
export function getMarkerColor(steepnessLevel) {
  const normalizedLevel = normalizeLevel(steepnessLevel);
  const colors = {
    "NOVICE WANDERER": '#10B981',      // Green for beginner
    "GREY'S PATHFINDER": '#3B82F6',    // Blue for beginner-moderate
    "TRAIL RANGER": '#FBBF24',         // Yellow for moderate
    "WARDEN'S ASCENT": '#F97316',      // Orange for moderate-challenging
    "MASTER WAYFARER": '#DC2626'       // Red for challenging
  };
  return colors[normalizedLevel] || '#242424'; // Default color
}

/**
 * Gets badge information for a steepness level
 */
export const getBadgeInfo = (steepnessLevel) => {
  const normalizedLevel = normalizeLevel(steepnessLevel);
  const badges = {
    "NOVICE WANDERER": {
      color: 'bg-green-100 text-green-800',
      icon: 'mdi:walk',
      text: 'Novice Wanderer'
    },
    "GREY'S PATHFINDER": {
      color: 'bg-blue-100 text-blue-800',
      icon: 'mdi:hiking',
      text: "Grey's Pathfinder"
    },
    "TRAIL RANGER": {
      color: 'bg-yellow-100 text-yellow-800',
      icon: 'mdi:mountain',
      text: 'Trail Ranger'
    },
    "WARDEN'S ASCENT": {
      color: 'bg-orange-100 text-orange-800',
      icon: 'mdi:mountain-peak',
      text: "Warden's Ascent"
    },
    "MASTER WAYFARER": {
      color: 'bg-red-100 text-red-800',
      icon: 'mdi:summit',
      text: 'Master Wayfarer'
    }
  }
  // Removed fallback unknown badge
  return badges[normalizedLevel];
}
/**
 * Composable for processing and formatting walk data
 */
import { computed } from 'vue';

/**
 * Category mappings with icons, colors and patterns
 */
const categoryMappings = {
  // Standard categories
  Nature: {
    color: "green",
    bgClass: "bg-green-100 text-green-900",
    icon: "mdi:tree",
  },
  // Extended mappings for detailed categories
  "circular walks": {
    color: "indigo",
    bgClass: "bg-indigo-100 text-indigo-900",
    icon: "mdi:rotate-right",
  },
  "linear walks": {
    color: "violet",
    bgClass: "bg-violet-100 text-violet-900",
    icon: "mdi:arrow-right",
  },
  "riverside walks": {
    color: "blue",
    bgClass: "bg-blue-100 text-blue-900",
    icon: "mdi:water",
  },
  "woodland walks": {
    color: "emerald",
    bgClass: "bg-emerald-100 text-emerald-900",
    icon: "mdi:pine-tree",
  },
  "coastal walks": {
    color: "cyan",
    bgClass: "bg-cyan-100 text-cyan-900",
    icon: "mdi:waves",
  },
  "mountain walks": {
    color: "slate",
    bgClass: "bg-slate-100 text-slate-900",
    icon: "mdi:mountain",
  },
  "walks with a café": {
    color: "amber",
    bgClass: "bg-amber-100 text-amber-900",
    icon: "mdi:coffee",
  },
  "walks with a pub": {
    color: "amber",
    bgClass: "bg-amber-800 text-amber-50",
    icon: "mdi:glass-mug-variant",
  },
  "walks without stiles": {
    color: "blue",
    bgClass: "bg-blue-100 text-blue-900",
    icon: "mdi:gate",
  },
  "walks with a good degree of shade": {
    color: "green",
    bgClass: "bg-green-100 text-green-900",
    icon: "mdi:weather-sunny-off",
  },
  "dog friendly walks": {
    color: "amber",
    bgClass: "bg-amber-100 text-amber-900",
    icon: "mdi:dog-side",
  },
  "family friendly walks": {
    color: "pink",
    bgClass: "bg-pink-100 text-pink-900",
    icon: "mdi:human-male-female-child",
  },
  "accessible walks": {
    color: "blue",
    bgClass: "bg-blue-100 text-blue-900",
    icon: "mdi:wheelchair-accessibility",
  },
};

// Default category for unknown categories
const defaultCategory = {
  color: "gray",
  bgClass: "bg-gray-100 text-gray-900",
  icon: "mdi:tag",
};

// Search patterns for partial matches
const categoryPatterns = [
  { pattern: /circular/i, match: "circular walks" },
  { pattern: /linear/i, match: "linear walks" },
  { pattern: /river/i, match: "riverside walks" },
  { pattern: /wood/i, match: "woodland walks" },
  { pattern: /forest/i, match: "woodland walks" },
  { pattern: /coast/i, match: "coastal walks" },
  { pattern: /sea/i, match: "coastal walks" },
  { pattern: /mountain/i, match: "mountain walks" },
  { pattern: /café|cafe/i, match: "walks with a café" },
  { pattern: /pub|beer/i, match: "walks with a pub" },
  { pattern: /without stile/i, match: "walks without stiles" },
  { pattern: /shade/i, match: "walks with a good degree of shade" },
  { pattern: /dog/i, match: "dog friendly walks" },
  { pattern: /family/i, match: "family friendly walks" },
  { pattern: /accessible|wheelchair/i, match: "accessible walks" },
];

/**
 * POI category definitions for classification
 */
const poiCategories = [
  {
    pattern: /(pub|inn|tavern)/i,
    icon: "mdi:glass-mug-variant",
    color: "text-amber-800",
    badge: "Refreshment",
  },
  {
    pattern: /(church|chapel|cathedral|abbey)/i,
    icon: "mdi:church",
    color: "text-blue-600",
    badge: "Religious",
  },
  {
    pattern: /(lake|river|waterfall|pond|reservoir|stream|beach|sea)/i,
    icon: "mdi:water",
    color: "text-blue-500",
    badge: "Water",
  },
  {
    pattern: /(hill|mountain|peak|ridge|valley|viewpoint|panorama)/i,
    icon: "mdi:mountain",
    color: "text-emerald-700",
    badge: "Landscape",
  },
  {
    pattern: /(café|cafe|restaurant|tea|coffee)/i,
    icon: "mdi:coffee",
    color: "text-amber-700",
    badge: "Refreshment",
  },
  {
    pattern: /(wood|forest|woodland|tree)/i,
    icon: "mdi:pine-tree",
    color: "text-green-600",
    badge: "Nature",
  },
  {
    pattern: /(garden|park|flower)/i,
    icon: "mdi:flower",
    color: "text-pink-500",
    badge: "Nature",
  },
  {
    pattern: /(museum|gallery|art)/i,
    icon: "mdi:bank",
    color: "text-purple-600",
    badge: "Cultural",
  },
  {
    pattern: /(bridge|viaduct|aqueduct)/i,
    icon: "mdi:bridge",
    color: "text-stone-600",
    badge: "Structure",
  },
  {
    pattern: /(wildlife|animal|bird)/i,
    icon: "mdi:paw",
    color: "text-orange-600",
    badge: "Wildlife",
  },
  {
    pattern: /(castle)/i,
    icon: "material-symbols:castle-rounded",
    color: "text-gray-700",
    badge: "Historical",
  },
  {
    pattern: /(lighthouse)/i,
    icon: "mdi:lighthouse",
    color: "text-yellow-700",
    badge: "Landmark",
  },
  {
    pattern: /(garden)/i,
    icon: "mdi:flower",
    color: "text-pink-500",
    badge: "Nature",
  },
];

/**
 * Process considerations and identify dog-related items
 */
function processDogConsiderations(consideration) {
  if (!consideration) return { text: "", isDog: false };

  const trimmed = consideration.trim();
  const dogTerms = [/\bdogs?\b/i, /\bcanine\b/i];

  // Check if it starts with "dogs" or contains dog-related terms
  const startsWithDogs = trimmed.toLowerCase().startsWith("dogs");
  const isDogRelated = dogTerms.some((term) => term.test(trimmed));

  if (!startsWithDogs && !isDogRelated) {
    return { text: trimmed, isDog: false };
  }

  // Remove "dogs" prefix if present and clean up the text
  const processedText = trimmed.replace(/^dogs\s*[:,-]?\s*/i, "").trim();
  return { text: processedText, isDog: true };
}

/**
 * Main composable for walk data processing
 */
export function useWalkData(walkProp) {
  /**
   * Parse POIs from string or array
   */
  const parsedPOIs = computed(() => {
    const pois = walkProp.value?.points_of_interest;
    if (!pois) return [];

    const mapper = (poi) => {
      const poiLower = poi.toLowerCase();
      const category = poiCategories.find((cat) =>
        cat.pattern.test(poiLower)
      ) || { icon: "mdi:map-marker", color: "text-primary", badge: "" };
      const isPriority = poi.length > 20;
      return {
        text: poi,
        icon: category.icon,
        iconColor: category.color,
        badge: isPriority ? category.badge : null,
      };
    };

    if (Array.isArray(pois)) {
      return pois.filter((poi) => poi && poi.length > 0).map(mapper);
    }
    if (typeof pois === "string") {
      return pois
        .split(";")
        .map((poi) => poi.trim())
        .filter((poi) => poi.length > 0)
        .map(mapper);
    }
    return [];
  });

  /**
   * Parse highlights from string or array
   */
  const parsedHighlights = computed(() => {
    const highlights = walkProp.value?.highlights;
    if (!highlights) return [];
    const processHighlight = (h) => h && h.length > 0;

    if (Array.isArray(highlights)) {
      return highlights.filter(processHighlight);
    }
    if (typeof highlights === "string") {
      return highlights
        .split(";")
        .map((h) => h.trim())
        .filter(processHighlight);
    }
    return [];
  });

  /**
   * Parse trail considerations from string or array
   */
  const parsedConsiderations = computed(() => {
    const considerations = walkProp.value?.trail_considerations;
    if (!considerations) return [];

    // Handle case when trail_considerations is a string
    if (typeof considerations === "string") {
      return considerations
        .split(";")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .map(processDogConsiderations);
    }

    // Handle case when trail_considerations is an array
    if (Array.isArray(considerations)) {
      return considerations
        .filter(
          (item) => item && typeof item === "string" && item.trim().length > 0
        )
        .map(processDogConsiderations);
    }

    return [];
  });

  /**
   * Extract dog-specific considerations
   */
  const dogConsiderations = computed(() =>
    parsedConsiderations.value.filter((item) => item.isDog)
  );

  /**
   * Extract non-dog considerations 
   */
  const nonDogConsiderations = computed(() =>
    parsedConsiderations.value.filter((item) => !item.isDog)
  );

  /**
   * Combine dog-related considerations into a formatted string
   */
  const dogCombinedText = computed(() => {
    if (!dogConsiderations.value.length) return "";

    return dogConsiderations.value
      .map((item) => {
        let text = item.text;
        if (text && !/^[A-Z]/.test(text)) {
          text = text.charAt(0).toUpperCase() + text.slice(1);
        }
        return text;
      })
      .join("; ");
  });

  /**
   * Group POIs by category
   */
  const groupedPOIs = computed(() => {
    const grouped = {};

    parsedPOIs.value.forEach((poi) => {
      const category = poi.badge || "Other";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(poi);
    });

    // Sort categories - put "Other" at the end
    return Object.keys(grouped)
      .sort((a, b) =>
        a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b)
      )
      .reduce((obj, key) => {
        obj[key] = grouped[key];
        return obj;
      }, {});
  });

  /**
   * Count total features and categories
   */
  const totalFeaturesCount = computed(() => {
    let count = 0;

    // Add the number of features if they exist
    if (Array.isArray(walkProp.value?.features)) {
      count += walkProp.value.features.length;
    }

    // Add the number of categories if they exist
    if (Array.isArray(walkProp.value?.related_categories)) {
      count += walkProp.value.related_categories.length;
    }

    return count;
  });

  // List of keys that are already displayed in the walk drawer
  const displayedKeys = [
    "title",
    "walk_name",
    "description",
    "difficulty",
    "distance",
    "steepness",
    "highlights",
    "features",
    "categories",
    "points_of_interest",
    "has_pub",
    "has_cafe",
    "has_stiles",
    "has_bus_access",
    "is_favorite",
    "pubs_list",
    "footwear_category",
    "trail_considerations",
    "recommended_footwear",
  ];

  // Extract extra fields not already displayed
  const walkExtra = computed(() => {
    const extra = {};
    if (!walkProp.value) return extra;
    
    for (const key in walkProp.value) {
      if (!displayedKeys.includes(key)) {
        const value = walkProp.value[key];
        if (value != null && (typeof value !== "string" || value !== "")) {
          extra[key] = value;
        }
      }
    }
    return extra;
  });

  const hasExtraInfo = computed(() => Object.keys(walkExtra.value).length > 0);

  /**
   * Get icon for a category by name
   */
  function getCategoryIconByName(categoryName) {
    const category = poiCategories.find((cat) => cat.badge === categoryName);
    return category ? category.icon : "mdi:map-marker";
  }

  /**
   * Get CSS class for a category
   */
  function getCategoryClass(categoryName) {
    // Direct match
    if (categoryMappings[categoryName]) {
      return categoryMappings[categoryName].bgClass;
    }

    // Pattern match
    for (const pattern of categoryPatterns) {
      if (pattern.pattern.test(categoryName)) {
        return (
          categoryMappings[pattern.match]?.bgClass || defaultCategory.bgClass
        );
      }
    }

    return defaultCategory.bgClass;
  }

  /**
   * Get icon for a category
   */
  function getCategoryIcon(categoryName) {
    // Direct match
    if (categoryMappings[categoryName]) {
      return categoryMappings[categoryName].icon;
    }

    // Pattern match
    for (const pattern of categoryPatterns) {
      if (pattern.pattern.test(categoryName)) {
        return categoryMappings[pattern.match]?.icon || defaultCategory.icon;
      }
    }

    return defaultCategory.icon;
  }

  /**
   * Format complex values for display
   */
  function formatValue(value) {
    if (Array.isArray(value)) {
      return value
        .map((item) => {
          if (typeof item === "object" && item !== null) {
            return (
              item.name ||
              item.title ||
              Object.values(item)
                .filter((v) => typeof v === "string")
                .join(", ") ||
              "[Object]"
            );
          }
          return item;
        })
        .join(", ");
    } else if (typeof value === "object" && value !== null) {
      if (value.name || value.title) {
        return value.name || value.title;
      }
      const stringValues = Object.entries(value)
        .filter(([_, v]) => v !== null && v !== undefined)
        .map(([k, v]) => {
          if (typeof v === "object") {
            return `${k}: ${v.name || v.title || "[Object]"}`;
          }
          return `${k}: ${v}`;
        });
      return stringValues.join(", ");
    }
    return value;
  }

  /**
   * Format distance for display
   */
  function formatDistance(distance) {
    if (!distance) return 'Unknown distance';
    
    const distanceNum = parseFloat(distance);
    if (isNaN(distanceNum)) return distance;
    
    if (distanceNum >= 1) {
      return `${distanceNum.toFixed(1)} km`;
    } else {
      return `${Math.round(distanceNum * 1000)} m`;
    }
  }

  /**
   * Format duration for display
   */
  function formatDuration(duration) {
    if (!duration) return 'Unknown duration';
    
    const durationNum = parseInt(duration, 10);
    if (isNaN(durationNum)) return duration;
    
    if (durationNum < 60) {
      return `${durationNum} min`;
    } else {
      const hours = Math.floor(durationNum / 60);
      const minutes = durationNum % 60;
      return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
    }
  }

  /**
   * Format difficulty level
   */
  function formatDifficulty(difficulty) {
    if (!difficulty) return 'Unknown difficulty';
    
    const difficultyNum = parseInt(difficulty, 10);
    
    if (!isNaN(difficultyNum)) {
      switch(difficultyNum) {
        case 1: return 'Easy';
        case 2: return 'Moderate';
        case 3: return 'Challenging';
        case 4: return 'Difficult';
        case 5: return 'Very Difficult';
        default: return `Level ${difficultyNum}`;
      }
    }
    
    return difficulty;
  }

  /**
   * Open a location in Google Maps
   */
  function openInGoogleMaps(place) {
    let mapsUrl = "";

    if (place.name) {
      const searchQuery = encodeURIComponent(place.name);
      if (walkProp.value?.latitude && walkProp.value?.longitude) {
        const latitude = walkProp.value.latitude;
        const longitude = walkProp.value.longitude;
        mapsUrl = `https://www.google.com/maps/search/?api=1&query=${searchQuery}&query=${encodeURIComponent(
          `places near ${latitude},${longitude}`
        )}`;
      } else {
        mapsUrl = `https://www.google.com/maps/search/?api=1&query=${searchQuery}`;
      }
    } else if (walkProp.value?.latitude && walkProp.value?.longitude) {
      const latitude = walkProp.value.latitude;
      const longitude = walkProp.value.longitude;
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `places near ${latitude},${longitude}`
      )}`;
    }

    if (mapsUrl) {
      window.open(mapsUrl, "_blank");
    }
  }

  return {
    // Parsed data
    parsedPOIs,
    parsedHighlights,
    parsedConsiderations,
    dogConsiderations,
    nonDogConsiderations,
    dogCombinedText,
    groupedPOIs,
    totalFeaturesCount,
    walkExtra,
    hasExtraInfo,
    
    // Helper functions
    getCategoryIconByName,
    getCategoryClass,
    getCategoryIcon,
    formatValue,
    formatDistance,
    formatDuration,
    formatDifficulty,
    openInGoogleMaps,
    
    // For testing/debugging
    poiCategories,
    categoryMappings,
    categoryPatterns
  };
}
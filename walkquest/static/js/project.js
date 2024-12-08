/**
 * WalkQuest Project JavaScript
 * Handles virtual scrolling, map integration, and UI interactions
 */

import {
  Virtualizer,
  observeElementOffset,
  observeElementRect,
  elementScroll,
} from "@tanstack/virtual-core";
import mapboxgl from "mapbox-gl";
import "iconify-icon";
import SuperJSON from "superjson";


// WalkQuest configuration settings
export const WALKQUEST_CONFIG = Object.freeze({
  map: {
    style: "mapbox://styles/mapbox/outdoors-v12",
    defaultCenter: [-4.85, 50.4],
    defaultZoom: 9,
    markerColors: {
      default: "#4F46E5",
      selected: "#DC2626",
    },
  },
  virtualizer: {
    itemHeight: 92,
    overscan: 5,
    debounceMs: 300,
  }
});

export const initializeConfig = () => {
  try {
    const configScript = document.getElementById('config-data');
    const walksScript = document.getElementById('walks-data');
    
    if (!configScript || !walksScript) {
      throw new Error('Required configuration data missing');
    }

    const config = JSON.parse(configScript.textContent);
    const initialWalks = JSON.parse(walksScript.textContent);

    if (!config.map?.token) {
      throw new Error('Mapbox token missing from configuration');
    }

    window.WALKQUEST = {
      config: Object.freeze({...config}),
      initialWalks: initialWalks
    };

    return true;
  } catch (error) {
    console.error('Configuration initialization failed:', error);
    UI.showError(`Configuration Error: ${error.message}`);
    return false;
  }
};

/**
 * DataSanitizer - Handles data type conversion and validation
 */
class DataSanitizer {
  constructor() {
    this.parser = SuperJSON;
  }

  parseWalks(rawData) {
    try {
      const parsed = this.parser.parse(rawData);
      return Array.isArray(parsed) ? parsed.map(walk => this.sanitizeWalk(walk)) : [];
    } catch (error) {
      console.error('Failed to parse walks data:', error);
      return [];
    }
  }

  sanitizeWalk(walk) {
    return {
      ...walk,
      id: String(walk.id || ''),
      walk_id: String(walk.walk_id || ''),
      walk_name: String(walk.walk_name || ''),
      highlights: String(walk.highlights || ''),
      distance: this.parser.serialize(walk.distance),
      latitude: this.parser.serialize(walk.latitude),
      longitude: this.parser.serialize(walk.longitude),
      features: Array.isArray(walk.features) ? walk.features : [],
      has_pub: Boolean(walk.has_pub),
      has_cafe: Boolean(walk.has_cafe),
      has_bus_access: Boolean(walk.has_bus_access),
      has_stiles: Boolean(walk.has_stiles),
      created_at: walk.created_at ? new Date(walk.created_at) : null
    };
  }

  isValidWalk(walk) {
    return (
      walk &&
      typeof walk.id === 'string' &&
      typeof walk.walk_name === 'string' &&
      typeof walk.latitude === 'number' &&
      typeof walk.longitude === 'number'
    );
  }
}

// Create sanitizer instance
const dataSanitizer = new DataSanitizer();

// Utility functions
export const utils = {
  /**
   * Creates a debounced function that delays invoking the provided function
   * @param {Function} fn - Function to debounce
   * @param {number} ms - Delay in milliseconds
   * @returns {Function} Debounced function
   */
  debounce(fn, ms) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), ms);
    };
  },

  /**
   * Sanitizes input by removing potentially harmful characters
   * @param {string} input - String to sanitize
   * @returns {string} Sanitized string
   */
  sanitizeInput(input) {
    return input?.replace(/[<>]/g, "") || "";
  },

  /**
   * Formats distance in miles with fixed decimal places
   * @param {number} distance - Distance in miles
   * @returns {string} Formatted distance string
   */
  formatDistance(distance) {
    return distance
      ? `${Number(distance).toFixed(1)} miles`
      : "Distance unknown";
  },

  /**
   * Creates an HTML string for an iconify icon
   * @param {string} icon - Icon name
   * @param {string} className - Optional CSS classes
   * @returns {string} Icon HTML
   */
  createIcon(icon, className = "") {
    return `<iconify-icon icon="${icon}" ${
      className ? `class="${className}"` : ""
    }></iconify-icon>`;
  },

  /**
   * Validates and prepares map container
   * @param {string} containerId - ID of container element
   * @returns {HTMLElement} Validated container element
   */
  checkMapContainer(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error('Map container not found');
    }
    if (container.children.length > 0) {
      console.warn('Map container not empty, clearing contents');
      container.innerHTML = '';
    }
    return container;
  }
};

// UI helper functions
export const UI = {
  /**
   * Shows the loading indicator
   */
  showLoading() {
    const loader = document.getElementById("loading-indicator");
    if (loader) loader.classList.remove("hidden");
  },

  /**
   * Hides the loading indicator
   */
  hideLoading() {
    const loader = document.getElementById("loading-indicator");
    if (loader) loader.classList.add("hidden");
  },

  /**
   * Displays an error message toast
   * @param {string} message - Error message to display
   * @param {number} duration - Duration in milliseconds
   */
  showError(message, duration = 5000) {
    const container = document.createElement("div");
    container.className = "message message-error";
    container.innerHTML = `
          <div class="flex items-center">
              ${utils.createIcon("mdi:alert", "mr-2")}
              <p>${message}</p>
          </div>
      `;
    document.body.appendChild(container);
    setTimeout(() => {
      container.style.opacity = "0";
      setTimeout(() => container.remove(), 300);
    }, duration);
  },
};

/**
 * Manages map markers and marker-related operations
 */
class MarkerManager {
  constructor(map, config) {
    this.map = map;
    this.config = config;
    this.markers = new Map();
  }

  /**
   * Creates a new marker for a walk
   * @param {Object} walk - Walk data
   * @param {boolean} isSelected - Whether the walk is selected
   * @param {Function} onMarkerClick - Click handler
   * @returns {mapboxgl.Marker} Created marker
   */
  createMarker(walk, isSelected, onMarkerClick) {
    const marker = new mapboxgl.Marker({
      color: isSelected 
          ? this.config.markerColors.selected 
          : this.config.markerColors.default
    })
    .setLngLat([walk.longitude, walk.latitude])
    .addTo(this.map);

    marker.getElement().addEventListener('click', onMarkerClick);
    return marker;
  }

  /**
   * Updates all markers based on current walks
   * @param {Array} walks - Array of walk data
   * @param {number} selectedWalkId - Currently selected walk ID
   */
  updateMarkers(walks, selectedWalkId) {
    // Clear existing markers
    this.clear();

    // Add new markers
    for (const walk of walks) {
      if (!walk.latitude || !walk.longitude) continue;

      const marker = this.createMarker(
        walk,
        walk.id === selectedWalkId,
        () => this.onMarkerClick(walk.id)
      );
      this.markers.set(walk.id, marker);
    }
  }

  clear() {
    this.markers.forEach(marker => marker.remove());
    this.markers.clear();
  }
}

/**
 * WalkStore - Manages application state
 */
class WalkStore {
  constructor() {
    this.walks = [];
    this.selectedWalkId = null;
    this.virtualizer = null;
    this.map = null;
    this.markerManager = null;
    this.searchTerm = "";
    this.filters = {
      difficulty: null,
      features: [],
      amenities: {
        has_pub: false,
        has_cafe: false,
        has_bus_access: false,
        has_stiles: false,
      },
    };
  }

  initialize(mapId, listId) {
    try {
      // Check for required global config
      if (!window.WALKQUEST?.config) {
        throw new Error('Application configuration not found');
      }

      // Note the change from mapboxToken to mapbox_token to match JSON
      const { mapbox_token: mapboxToken, initialWalks } = window.WALKQUEST.config;

      if (!mapboxToken) {
        throw new Error('Mapbox token not found');
      }

      // Set mapbox token and initialize components
      window.MAPBOX_TOKEN = mapboxToken;
      this.initializeMap(mapId);
      this.initializeVirtualList(listId);
      this.markerManager = new MarkerManager(this.map, WALKQUEST_CONFIG.map);

      // Set initial walks if available
      if (Array.isArray(initialWalks)) {
        this.setWalks(initialWalks);
      }

      return true;
    } catch (error) {
      console.error('Store initialization failed:', error);
      UI.showError('Failed to initialize application: ' + error.message);
      throw error;
    }
  }

  sanitizeWalks(walks) {
    return Array.isArray(walks) ? walks.map(walk => ({
      ...walk,
      has_pub: walk.has_pub === true || walk.has_pub === 'True',
      has_cafe: walk.has_cafe === true || walk.has_cafe === 'True',
      has_bus_access: walk.has_bus_access === true || walk.has_bus_access === 'True',
      has_stiles: walk.has_stiles === true || walk.has_stiles === 'True',
      latitude: Number(walk.latitude),
      longitude: Number(walk.longitude),
      distance: walk.distance ? Number(walk.distance) : null,
      features: Array.isArray(walk.features) ? walk.features : []
    })) : [];
  }

  setWalks(walks) {
    this.walks = walks.filter(walk => dataSanitizer.isValidWalk(walk));
    this.updateVirtualList();
    if (this.map) {
      this.updateMarkers();
    }
    this.updateFilterUI();
  }

  initializeVirtualList(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.virtualizer = new Virtualizer({
      count: this.walks.length,
      getScrollElement: () => container,
      estimateSize: () => WALKQUEST_CONFIG.virtualizer.itemHeight,
      overscan: WALKQUEST_CONFIG.virtualizer.overscan,
      scrollToFn: elementScroll,
      observeElementRect,
      observeElementOffset,
    });

    this.updateVirtualList();
  }

  initializeMap(containerId) {
    try {
      // Validate container
      const container = utils.checkMapContainer(containerId);

      // Verify token exists
      const mapboxToken = window.WALKQUEST?.config?.mapboxToken;
      if (!mapboxToken) {
        throw new Error('Mapbox token not found in configuration');
      }

      // Initialize map
      mapboxgl.accessToken = mapboxToken;
      this.map = new mapboxgl.Map({
        container: containerId,
        style: WALKQUEST_CONFIG.map.style,
        center: WALKQUEST_CONFIG.map.defaultCenter,
        zoom: WALKQUEST_CONFIG.map.defaultZoom,
        attributionControl: true,
        preserveDrawingBuffer: true
      });

      // Add controls
      this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');
      this.map.addControl(new mapboxgl.FullscreenControl());

      // Initialize marker manager  
      this.markerManager = new MarkerManager(this.map, WALKQUEST_CONFIG.map);

      // Setup event handlers
      this.map.on('load', () => {
        if (this.walks.length > 0) {
          this.updateMarkers();
        }
      });

      this.map.on('error', (e) => {
        console.error('Map error:', e);
        UI.showError('Error loading map');
      });

    } catch (error) {
      console.error('Map initialization failed:', error);
      UI.showError('Failed to initialize map');
      throw error;
    }
  }

  // Remove duplicate getFilteredWalks method and keep the comprehensive one
  getFilteredWalks() {
    return this.walks.filter((walk) => {
      // Search term filter
      if (this.searchTerm) {
        const term = this.searchTerm.toLowerCase();
        if (
          !walk.walk_name.toLowerCase().includes(term) &&
          !walk.highlights.toLowerCase().includes(term)
        ) {
          return false;
        }
      }

      // Difficulty filter
      if (
        this.filters.difficulty &&
        walk.steepness_level !== this.filters.difficulty
      ) {
        return false;
      }

      // Features filter
      if (this.filters.features.length > 0) {
        if (
          !this.filters.features.every((feature) =>
            walk.features?.includes(feature)
          )
        ) {
          return false;
        }
      }

      // Amenities filter
      for (const [amenity, value] of Object.entries(this.filters.amenities)) {
        if (value && !walk[amenity]) {
          return false;
        }
      }

      return true;
    });
  }

  // Fix reference to createIcon in updateVirtualList
  updateVirtualList() {
    if (!this.virtualizer) return;

    const walks = this.getFilteredWalks();
    const container = document.getElementById("walk-list");
    if (!container) return;

    if (this.virtualizer.options.count !== walks.length) {
      this.virtualizer.options.count = walks.length;
    }

    const virtualItems = this.virtualizer.getVirtualItems();
    const totalHeight = this.virtualizer.getTotalSize();

    container.style.height = `${totalHeight}px`;
    container.style.position = "relative";

    container.innerHTML = virtualItems
      .map((virtualRow) => {
        const walk = walks[virtualRow.index];
        if (!walk) return "";

        return `
            <div class="walk-card ${
              walk.id === this.selectedWalkId ? "walk-card--selected" : ""
            }"
                 data-walk-id="${walk.id}"
                 data-index="${virtualRow.index}"
                 style="position: absolute; top: ${
                   virtualRow.start
                 }px; left: 0; right: 0;">
                <h3 class="text-lg font-semibold">${walk.walk_name}</h3>
                <p class="text-sm text-gray-600">${walk.highlights}</p>
                <div class="flex items-center mt-2 space-x-4">
                    ${
                      walk.distance
                        ? `
                        <span class="text-sm flex items-center">
                            ${utils.createIcon(
                              "mdi:map-marker-distance",
                              "mr-1"
                            )}
                            ${utils.formatDistance(walk.distance)}
                        </span>
                    `
                        : ""
                    }
                    ${
                      walk.duration
                        ? `
                        <span class="text-sm flex items-center">
                            ${utils.createIcon("mdi:clock-outline", "mr-1")}
                            ${walk.duration}
                        </span>
                    `
                        : ""
                    }
                </div>
                ${
                  walk.features?.length
                    ? `
                    <div class="flex flex-wrap gap-2 mt-2">
                        ${walk.features
                          .map(
                            (feature) => `
                            <span class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                ${feature}
                            </span>
                        `
                          )
                          .join("")}
                    </div>
                `
                    : ""
                }
            </div>
        `;
      })
      .join("");
  }

  updateMarkers() {
    if (!this.map || !this.markerManager) return;
    this.markerManager.updateMarkers(this.getFilteredWalks(), this.selectedWalkId);
  }

  selectWalk(walkId) {
    this.selectedWalkId = walkId;
    this.updateMarkers();
    this.updateVirtualList();

    const walk = this.walks.find((w) => w.id === walkId);
    if (walk?.latitude && walk?.longitude) {
      this.map.flyTo({
        center: [walk.longitude, walk.latitude],
        zoom: 14,
        duration: 1000,
      });
    }
  }

  setSearchTerm(term) {
    this.searchTerm = term;
    this.updateVirtualList();
  }

  cleanup() {
    if (this.markerManager) {
      this.markerManager.clear();
    }
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.virtualizer = null;
    this.walks = [];
    this.selectedWalkId = null;
  }

  getStatistics() {
    const stats = {
        difficulties: {},
        features: {}
    };

    this.walks.forEach(walk => {
        if (walk.steepness_level) {
            stats.difficulties[walk.steepness_level] = (stats.difficulties[walk.steepness_level] || 0) + 1;
        }
        if (Array.isArray(walk.features)) {
            walk.features.forEach(feature => {
                stats.features[feature] = (stats.features[feature] || 0) + 1;
            });
        }
    });

    return stats;
  }

  updateFilterUI() {
    const stats = this.getStatistics();
    
    const difficultyContainer = document.querySelector('.difficulty-filters');
    if (difficultyContainer) {
        WALKQUEST_CONFIG.filters.difficulties.forEach(difficulty => {
            const element = difficultyContainer.querySelector(`[data-difficulty="${difficulty}"]`);
            if (element?.querySelector('.count')) {
                element.querySelector('.count').textContent = `(${stats.difficulties[difficulty] || 0})`;
            }
        });
    }

    const featureContainer = document.querySelector('.feature-filters');
    if (featureContainer) {
        WALKQUEST_CONFIG.filters.features.forEach(feature => {
            const element = featureContainer.querySelector(`[data-feature="${feature}"]`);
            if (element?.querySelector('.count')) {
                element.querySelector('.count').textContent = `(${stats.features[feature] || 0})`;
            }
        });
    }
  }
}

// Export singleton instance
export const walkStore = new WalkStore();

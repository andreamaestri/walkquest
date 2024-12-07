/**
 * WalkQuest Project JavaScript
 * Handles virtual scrolling, map integration, and UI interactions
 */

import { 
    Virtualizer,
    observeElementOffset,
    observeElementRect,
    elementScroll
} from '@tanstack/virtual-core';
import mapboxgl from 'mapbox-gl';
import 'iconify-icon';

// Remove old iconify script loading code
// const iconifyScript = document.createElement('script');
// iconifyScript.src = 'https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js';
// document.head.appendChild(iconifyScript);

// Removed duplicate WalkStore class declaration

/**
 * Icon class for managing Iconify icons
 */
export class Icon {
    constructor(name, options = {}) {
        this.name = name;
        this.color = options.color || 'currentColor';
        this.size = options.size || '24';
        this.class = options.class || '';
    }

    createElement() {
        const icon = document.createElement('iconify-icon');
        icon.icon = this.name;
        icon.style.color = this.color;
        icon.style.fontSize = `${this.size}px`;
        if (this.class) {
            icon.className = this.class;
        }
        return icon;
    }

    toString() {
        return `<iconify-icon icon="${this.name}" style="color: ${this.color}; font-size: ${this.size}px" ${this.class ? `class="${this.class}"` : ''}></iconify-icon>`;
    }
}

// Configuration
export const CONFIG = {
    map: {
        style: 'mapbox://styles/mapbox/outdoors-v12',
        defaultCenter: [-4.85, 50.40], // Cornwall
        defaultZoom: 9,
        markerColors: {
            default: '#4F46E5',
            selected: '#DC2626'
        }
    },
    virtualizer: {
        itemHeight: 92,
        overscan: 5,
        debounceMs: 300
    }
};

// Helper function for icons - simplified for web component
function createIcon(icon, className = '') {
    return `<iconify-icon icon="${icon}" ${className ? `class="${className}"` : ''}></iconify-icon>`;
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
    this.markers = new Map();
    this.searchTerm = "";
  }

  initialize(mapId, listId) {
    this.initializeMap(mapId);
    this.initializeVirtualList(listId);
  }

  initializeMap(containerId) {
    const container = document.getElementById(containerId);
    if (!container || !window.mapboxgl || !window.MAPBOX_TOKEN) {
        console.error('Map initialization failed:', {
            container: !!container,
            mapboxgl: !!window.mapboxgl,
            token: !!window.MAPBOX_TOKEN
        });
        return;
    }

    mapboxgl.accessToken = window.MAPBOX_TOKEN;

    try {
        this.map = new mapboxgl.Map({
            container: containerId,
            style: CONFIG.map.style,
            center: CONFIG.map.defaultCenter,
            zoom: CONFIG.map.defaultZoom,
        });

        this.map.addControl(new mapboxgl.NavigationControl(), "top-right");
        this.map.addControl(
            new mapboxgl.GeolocateControl({
                positionOptions: { enableHighAccuracy: true },
                trackUserLocation: true,
                showUserHeading: true,
            })
        );

        // Update markers once map is loaded
        this.map.on('load', () => {
            if (this.walks.length > 0) {
                this.updateMarkers();
            }
        });
    } catch (error) {
        console.error('Map initialization error:', error);
    }
}

  initializeVirtualList(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.virtualizer = new Virtualizer({
      count: this.getFilteredWalks().length,
      getScrollElement: () => container,
      estimateSize: () => CONFIG.virtualizer.itemHeight,
      overscan: CONFIG.virtualizer.overscan,
      scrollToFn: elementScroll,
      observeElementRect,
      observeElementOffset,
      onChange: () => this.updateVirtualList(),
    });

    // Handle container resizing
    new ResizeObserver(() => {
      this.virtualizer?.measure();
    }).observe(container);
  }

  setWalks(walks) {
    this.walks = walks;
    this.updateMarkers();
    this.updateVirtualList();
  }

  getFilteredWalks() {
    if (!this.searchTerm) return this.walks;
    const term = this.searchTerm.toLowerCase();
    return this.walks.filter(
      (walk) =>
        walk.walk_name.toLowerCase().includes(term) ||
        walk.highlights.toLowerCase().includes(term)
    );
  }

  updateMarkers() {
    for (const marker of this.markers.values()) {
      marker.remove();
    }
    this.markers.clear();

    for (const walk of this.walks) {
      if (!walk.latitude || !walk.longitude) continue;

      const marker = new mapboxgl.Marker({
        color:
          walk.id === this.selectedWalkId
            ? CONFIG.map.markerColors.selected
            : CONFIG.map.markerColors.default,
      })
        .setLngLat([walk.longitude, walk.latitude])
        .setPopup(this.createPopup(walk))
        .addTo(this.map);

      marker.getElement().addEventListener("click", () => {
        this.selectWalk(walk.id);
      });

      this.markers.set(walk.id, marker);
    }
  }

  createPopup(walk) {
    return new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div class="p-4">
                <h3 class="font-bold text-lg">${walk.walk_name}</h3>
                <p class="text-sm text-gray-600 mt-1">${walk.distance} miles</p>
                ${
                  walk.has_pub
                    ? '<p class="text-sm text-green-600 mt-1">Has pub 🍺</p>'
                    : ""
                }
            </div>
        `);
  }

  updateVirtualList() {
    if (!this.virtualizer) return;

    const walks = this.getFilteredWalks();
    const container = document.getElementById('walk-list');
    if (!container) return;

    // Update virtualizer count if needed
    if (this.virtualizer.options.count !== walks.length) {
        this.virtualizer.options.count = walks.length;
    }

    const virtualItems = this.virtualizer.getVirtualItems();
    const totalHeight = this.virtualizer.getTotalSize();

    container.style.height = `${totalHeight}px`;
    container.style.position = 'relative';

    container.innerHTML = virtualItems.map(virtualRow => {
        const walk = walks[virtualRow.index];
        if (!walk) return '';

        return `
            <div class="walk-card ${walk.id === this.selectedWalkId ? 'walk-card--selected' : ''}"
                 data-walk-id="${walk.id}"
                 data-index="${virtualRow.index}"
                 style="position: absolute; top: ${virtualRow.start}px; left: 0; right: 0;">
                <h3 class="text-lg font-semibold">${walk.walk_name}</h3>
                <p class="text-sm text-gray-600">${walk.highlights}</p>
                <div class="flex items-center mt-2 space-x-4">
                    ${walk.distance ? `
                        <span class="text-sm flex items-center">
                            ${createIcon('mdi:map-marker-distance', 'mr-1')}
                            ${walk.distance} miles
                        </span>
                    ` : ''}
                    ${walk.duration ? `
                        <span class="text-sm flex items-center">
                            ${createIcon('mdi:clock-outline', 'mr-1')}
                            ${walk.duration}
                        </span>
                    ` : ''}
                </div>
                ${walk.features?.length ? `
                    <div class="flex flex-wrap gap-2 mt-2">
                        ${walk.features.map(feature => `
                            <span class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                ${feature}
                            </span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
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
    for (const marker of this.markers) {
      marker.remove();
    }
    this.markers.clear();
    this.map?.remove();
    this.virtualizer = null;
  }
}

// Export singleton instance
export const walkStore = new WalkStore();

// UI helper functions
export const UI = {
    showLoading() {
        const loader = document.getElementById('loading-indicator');
        if (loader) loader.classList.remove('hidden');
    },

    hideLoading() {
        const loader = document.getElementById('loading-indicator');
        if (loader) loader.classList.add('hidden');
    },

    showError(message) {
        const container = document.createElement('div');
        container.className = 'message message-error';
        container.innerHTML = `
            <div class="flex items-center">
                ${createIcon('mdi:alert', 'mr-2')}
                <p>${message}</p>
            </div>
        `;
        document.body.appendChild(container);
        setTimeout(() => container.remove(), 5000);
    }
};

// Utility functions
export const utils = {
  debounce(fn, ms) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), ms);
    };
  },

  sanitizeInput(input) {
    return input.replace(/[<>]/g, "");
  },
};
// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.remove('loading');
    initializeApp();
});

function initializeApp() {
    // Initialize store
    walkStore.initialize('map', 'walk-list');

    // Setup search handler
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', utils.debounce(
            (e) => walkStore.setSearchTerm(utils.sanitizeInput(e.target.value)),
            CONFIG.virtualizer.debounceMs
        ));
    }

    // Setup walk selection handler
    const walkList = document.getElementById('walk-list');
    if (walkList) {
        walkList.addEventListener('click', (e) => {
            const walkCard = e.target.closest('.walk-card');
            if (walkCard) {
                walkStore.selectWalk(walkCard.dataset.walkId);
            }
        });
    }

  // Auto-remove messages
  for (const el of document.querySelectorAll("[data-auto-remove]")) {
    const delay = Number.parseInt(el.dataset.autoRemove, 10) || 5000;
    setTimeout(() => {
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 300);
    }, delay);
  }
}



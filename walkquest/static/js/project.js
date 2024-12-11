// Import dependencies
const mapboxgl = window.mapboxgl;
const Supercluster = window.Supercluster;

// Core configuration
export const CONFIG = {
  map: {
    style: "mapbox://styles/mapbox/outdoors-v12",
    defaultCenter: [-4.85, 50.4], // Center of Cornwall
    defaultZoom: 9.5,
    bounds: [
      [-5.75, 49.95], // Southwest coordinates
      [-4.15, 50.85]  // Northeast coordinates
    ],
    maxBounds: [
      [-6.5, 49.5],   // Southwest limit
      [-3.5, 51.5]    // Northeast limit
    ],
    minZoom: 8,       // Prevent zooming out too far
    maxZoom: 16,       // Limit maximum zoom
    markerColors: { 
      default: "#3FB1CE", 
      selected: "#DC2626",
      features: {
        cafe: "#4B5563",     // Gray
        coastal: "#0EA5E9",  // Blue
        historic: "#8B5CF6", // Purple
        pub: "#F59E0B",      // Amber
        wildlife: "#10B981", // Green
        woodland: "#065F46"  // Dark Green
      }
    }
  },
  markers: {
    anchor: 'bottom',
    offset: [0, -15],
    clustering: {
      enabled: true,  // Can be disabled if Supercluster fails
      radius: 50,
      maxZoom: 14,
      minPoints: 2,
      colors: {
        small: '#4F46E5',
        medium: '#7C3AED',
        large: '#9333EA'
      }
    },
    popup: {
      offset: [0, -40], // Adjust offset for better positioning
      closeButton: false,
      maxWidth: '300px',
      anchor: 'bottom',
      className: 'walk-popup',
      focusAfterOpen: false, // Prevent focus issues
    }
  }
};

// Add initialization utilities
const initUtils = {
  validateConfig: (config) => {
    if (!config) throw new Error('Configuration object is empty');
    if (!config.mapboxToken) throw new Error('Mapbox token not found');
    return true;
  },
  
  parseJsonScript: (elementId) => {
    const element = document.getElementById(elementId);
    if (!element) throw new Error(`Element ${elementId} not found`);
    try {
      return JSON.parse(element.textContent);
    } catch (e) {
      throw new Error(`Failed to parse JSON from ${elementId}: ${e.message}`);
    }
  },
  
  initializeGlobalState: () => {
    const config = initUtils.parseJsonScript('config-data');
    const initialWalks = initUtils.parseJsonScript('walks-data');
    
    initUtils.validateConfig(config);
    
    window.WALKQUEST = {
      config,
      initialWalks
    };
    
    return { config, initialWalks };
  }
};

// Simplified utility functions
const utils = {
  debounce: (fn, ms) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), ms);
    };
  },
  formatDistance: d => d ? `${Number(d).toFixed(1)} miles` : "Distance unknown",
  createIcon: (icon, className = "") => 
    `<iconify-icon icon="${icon}"${className ? ` class="${className}"` : ""}></iconify-icon>`,
  checkMapContainer: (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error('Map container not found');
    }
    
    // Remove any existing map instance
    if (container._map) {
      container._map.remove();
    }
    
    // Clear any remaining content
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    
    return container;
  },
  renderWalkCard: (walk, isSelected) => {
    return `
        <div class="walk-card p-4 border-b cursor-pointer ${isSelected ? 'walk-card--selected' : ''}"
             data-walk-id="${walk.id}">
            <h3 class="font-semibold text-gray-900">${walk.walk_name}</h3>
            <div class="mt-1 text-sm text-gray-600">
                <span>${walk.steepness_level} | ${utils.formatDistance(walk.distance)}</span>
            </div>
        </div>
    `;
  },
  getMarkerColor: (walk) => {
    if (!walk.features?.length) return CONFIG.map.markerColors.default;
    // Use the color of the first feature found
    return walk.features.map(f => CONFIG.map.markerColors.features[f])
                       .find(Boolean) || CONFIG.map.markerColors.default;
  },

  createMarkerPopup: (walk) => {
    return `
      <div class="p-3">
        <h3 class="font-semibold text-gray-900">${walk.walk_name}</h3>
        <div class="mt-2 text-sm text-gray-600">
          <p>${walk.steepness_level} | ${utils.formatDistance(walk.distance)}</p>
          ${walk.features?.length ? `
            <div class="mt-1 flex gap-1">
              ${walk.features.map(f => `
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100">
                  ${f}
                </span>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
};

class WalkStore {
  constructor() {
    this.walks = [];
    this.selectedWalkId = null;
    this.map = null;
    this.markers = new Map();
    this.filters = {
      searchTerm: "",
      difficulty: new Set(),
      features: new Set()
    };
    this.listElement = null;
    this.markerCluster = null;
    this.clusteringEnabled = false;
  }

  initializeClustering() {
    try {
      if (typeof Supercluster !== 'function') {
        throw new Error('Supercluster library not loaded correctly');
      }

      this.markerCluster = new Supercluster({
        radius: CONFIG.markers.clustering.radius,
        maxZoom: CONFIG.markers.clustering.maxZoom,
        minPoints: CONFIG.markers.clustering.minPoints,
        // Updated map/reduce functions for v8
        map: (feature) => ({
          walkId: feature.properties.id,
          color: utils.getMarkerColor(feature.properties)
        }),
        reduce: (accumulated, props) => {
          if (!accumulated.walkIds) {
            accumulated.walkIds = [];
            accumulated.color = props.color;
          }
          accumulated.walkIds.push(props.walkId);
        }
      });

      this.clusteringEnabled = true;
      console.debug('Clustering initialized with Supercluster v8');

    } catch (error) {
      console.warn('Failed to initialize clustering:', error);
      this.clusteringEnabled = false;
    }
  }

  async initialize(mapId, listId) {
    try {
      // First ensure WALKQUEST global state is initialized
      if (!window.WALKQUEST) {
        const { config, initialWalks } = initUtils.initializeGlobalState();
        console.debug('Initialized WALKQUEST global state:', { config, initialWalks });
      }

      const config = window.WALKQUEST.config;
      initUtils.validateConfig(config);

      // Initialize clustering before map setup
      this.initializeClustering();

      // Initialize map with Cornwall-specific settings
      const mapContainer = utils.checkMapContainer(mapId);
      mapboxgl.accessToken = config.mapboxToken;
      this.map = new mapboxgl.Map({
        container: mapContainer,
        style: CONFIG.map.style,
        center: CONFIG.map.defaultCenter,
        zoom: CONFIG.map.defaultZoom,
        maxBounds: CONFIG.map.maxBounds,
        minZoom: CONFIG.map.minZoom,
        maxZoom: CONFIG.map.maxZoom,
        fitBoundsOptions: {
          padding: { top: 50, bottom: 50, left: 50, right: 50 }
        }
      });

      // Add navigation controls
      this.map.addControl(new mapboxgl.NavigationControl());

      // Fit to Cornwall bounds after load
      this.map.on('load', () => {
        this.map.fitBounds(CONFIG.map.bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 }
        });
        
        if (this.clusteringEnabled) {
          this.initializeMarkerLayer();
        }
      });

      // Setup list and events
      this.listElement = document.getElementById(listId);
      if (!this.listElement) {
        throw new Error('List container not found');
      }

      this.setupEventListeners();

      // Load initial data
      if (window.WALKQUEST.initialWalks) {
        this.setWalks(window.WALKQUEST.initialWalks);
      }

      return this;

    } catch (error) {
      console.error('Failed to initialize WalkStore:', error);
      this.handleInitializationError(error);
      throw error;
    }
  }

  handleInitializationError(error) {
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
      errorContainer.textContent = `Initialization Error: ${error.message}`;
      errorContainer.classList.remove('hidden');
    }
  }

  setupEventListeners() {
    // Search input handler
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filters.searchTerm = e.target.value;
        this.updateUI();
      });
    }

    // Difficulty filter handlers
    document.querySelectorAll('input[name="difficulty"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.filters.difficulty.add(e.target.value);
        } else {
          this.filters.difficulty.delete(e.target.value);
        }
        this.updateUI();
      });
    });

    // Feature filter handlers
    document.querySelectorAll('input[name="feature"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.filters.features.add(e.target.value);
        } else {
          this.filters.features.delete(e.target.value);
        }
        this.updateUI();
      });
    });

    // Walk list click handler
    this.listElement?.addEventListener('click', (e) => {
      const walkCard = e.target.closest('.walk-card');
      if (walkCard) {
        const walkId = parseInt(walkCard.dataset.walkId, 10);
        this.selectWalk(walkId);
      }
    });

    // Add HTMX response handler
    document.body.addEventListener('htmx:afterRequest', (evt) => {
      if (evt.detail.successful) {
        this.updateUI();
      }
    });

    // Remove map loading indicator event handlers
    this.map.on('dataloading', () => {
      // Removed spinner handling
    });

    this.map.on('idle', () => {
      // Removed spinner handling
    });
  }

  // Core data management methods
  setWalks(walks) {
    this.walks = walks.filter(this.isValidWalk);
    this.updateUI();
  }

  isValidWalk(walk) {
    return walk?.id && walk?.walk_name && walk?.latitude && walk?.longitude;
  }

  getFilteredWalks() {
    return this.walks.filter(walk => {
      // Search filter
      if (this.filters.searchTerm) {
        const term = this.filters.searchTerm.toLowerCase();
        if (!walk.walk_name.toLowerCase().includes(term)) return false;
      }
      
      // Difficulty filter
      if (this.filters.difficulty.size > 0 && !this.filters.difficulty.has(walk.steepness_level)) {
        return false;
      }
      
      // Features filter
      if (this.filters.features.size > 0) {
        const walkFeatures = new Set(walk.features || []);
        for (const feature of this.filters.features) {
          if (!walkFeatures.has(feature)) return false;
        }
      }
      
      return true;
    });
  }

  // UI update methods
  updateUI() {
    this.updateMarkers();
    this.updateWalkList();
    this.updateFilterCounts();
  }

  initializeMarkerLayer() {
    // Add cluster source
    this.map.addSource('walks', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      },
      cluster: true,
      clusterMaxZoom: CONFIG.markers.clustering.maxZoom,
      clusterRadius: CONFIG.markers.clustering.radius
    });

    // Add cluster layers
    this.map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'walks',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          CONFIG.markers.clustering.colors.small,
          10,
          CONFIG.markers.clustering.colors.medium,
          30,
          CONFIG.markers.clustering.colors.large
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20,
          10,
          30,
          30,
          40
        ]
      }
    });

    // Add cluster count
    this.map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'walks',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-size': 12
      },
      paint: {
        'text-color': '#ffffff'
      }
    });
  }

  createMarker(walk) {
    try {
      const marker = new mapboxgl.Marker({
        color: walk.id === this.selectedWalkId ? 
          CONFIG.map.markerColors.selected : 
          utils.getMarkerColor(walk),
        scale: walk.id === this.selectedWalkId ? 1.2 : 1,
        anchor: CONFIG.markers.anchor,
        offset: CONFIG.markers.offset,
      });

      const popup = new mapboxgl.Popup({
        ...CONFIG.markers.popup,
        className: `walk-popup${walk.id === this.selectedWalkId ? ' walk-popup--selected' : ''}`
      })
      .setHTML(utils.createMarkerPopup(walk));

      marker
        .setLngLat([walk.longitude, walk.latitude])
        .setPopup(popup)
        .addTo(this.map);

      this.setupMarkerInteractions(marker, popup, walk);
      return marker;

    } catch (error) {
      console.error(`Failed to create marker for walk ${walk.id}:`, error);
      return null;
    }
  }

  setupMarkerInteractions(marker, popup, walk) {
    const element = marker.getElement();
    
    try {
      // Simpler hover interaction without transform
      element.addEventListener('mouseenter', () => {
        if (!popup.isOpen()) {
          popup.addTo(this.map);
        }
      });
      
      element.addEventListener('mouseleave', () => {
        if (walk.id !== this.selectedWalkId) {
          popup.remove();
        }
      });

      element.addEventListener('click', () => {
        this.selectWalk(walk.id);
      });

    } catch (error) {
      console.error('Failed to setup marker interactions:', error);
    }
  }

  updateMarkers() {
    if (!this.map) return;
    
    try {
      // Clear existing markers
      this.markers.forEach(m => m.remove());
      this.markers.clear();

      const filteredWalks = this.getFilteredWalks();

      if (this.clusteringEnabled && this.markerCluster) {
        // Convert walks to GeoJSON features
        const features = filteredWalks.map(walk => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [walk.longitude, walk.latitude]
          },
          properties: { ...walk }
        }));

        // Load features into supercluster
        this.markerCluster.load(features);

        // Get clusters for current bounds and zoom
        const bounds = this.map.getBounds();
        const zoom = Math.round(this.map.getZoom());
        
        const clusters = this.markerCluster.getClusters(
          [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
          zoom
        );

        // Create markers for clusters and points
        clusters.forEach(cluster => {
          if (cluster.properties.cluster) {
            this.createClusterMarker(cluster);
          } else {
            const walk = cluster.properties;
            const marker = this.createMarker(walk);
            if (marker) {
              this.markers.set(walk.id, marker);
            }
          }
        });

      } else {
        // Fallback: create individual markers without clustering
        filteredWalks.forEach(walk => {
          const marker = this.createMarker(walk);
          if (marker) {
            this.markers.set(walk.id, marker);
          }
        });
      }

    } catch (error) {
      console.error('Failed to update markers:', error);
      this.clusteringEnabled = false;
      this.updateMarkers(); // Retry without clustering
    }
  }

  // Add new method for cluster markers
  createClusterMarker(cluster) {
    const count = cluster.properties.point_count;
    const size = count < 10 ? 'small' : count < 30 ? 'medium' : 'large';
    const color = CONFIG.markers.clustering.colors[size];

    const el = document.createElement('div');
    el.className = `marker-cluster marker-cluster--${size}`;
    el.style.background = color;
    el.innerHTML = `<span>${count}</span>`;

    const marker = new mapboxgl.Marker({
      element: el
    })
    .setLngLat(cluster.geometry.coordinates)
    .addTo(this.map);

    // Add click handler to expand cluster
    el.addEventListener('click', () => {
      const clusterId = cluster.properties.cluster_id;
      const children = this.markerCluster.getChildren(clusterId);
      
      if (children.length === 1) {
        // Single point - zoom to it
        this.map.flyTo({
          center: children[0].geometry.coordinates,
          zoom: this.map.getZoom() + 2
        });
      } else {
        // Multiple points - fit bounds
        const coords = children.map(child => child.geometry.coordinates);
        const bounds = coords.reduce((bounds, coord) => bounds.extend(coord), new mapboxgl.LngLatBounds(coords[0], coords[0]));
        
        this.map.fitBounds(bounds, {
          padding: 50
        });
      }
    });

    return marker;
  }

  updateWalkList() {
    if (!this.listElement) return;
    
    const filteredWalks = this.getFilteredWalks();
    this.listElement.innerHTML = filteredWalks
      .map(walk => utils.renderWalkCard(walk, walk.id === this.selectedWalkId))
      .join('');

    // Show/hide no results message
    const noResults = document.getElementById('no-results');
    if (noResults) {
      noResults.classList.toggle('hidden', filteredWalks.length > 0);
    }
  }

  updateFilterCounts() {
    // Optional method - implement if you need to update filter UI counters
    // Can be left as empty method if not needed
  }

  selectWalk(walkId) {
    // Ensure walkId is a number
    const numericWalkId = parseInt(walkId, 10);
    console.debug('Selecting walk:', { walkId: numericWalkId });

    this.selectedWalkId = numericWalkId;
    const walk = this.walks.find(w => w.id === numericWalkId);
    
    if (!walk) {
      console.warn('Walk not found:', numericWalkId);
      return;
    }

    console.debug('Found walk:', { walk });

    if (walk.latitude && walk.longitude) {
      // Update markers
      this.markers.forEach((marker, id) => {
        const markerWalk = this.walks.find(w => w.id === id);
        const color = id === numericWalkId ? 
          CONFIG.map.markerColors.selected : 
          utils.getMarkerColor(markerWalk);
        
        marker.getElement().style.color = color;
        
        // Show popup for selected walk
        if (id === numericWalkId) {
          marker.togglePopup();
        }
      });

      // Ensure the map exists before attempting to fly
      if (this.map) {
        console.debug('Flying to coordinates:', { lng: walk.longitude, lat: walk.latitude });
        
        this.map.flyTo({
          center: [walk.longitude, walk.latitude],
          zoom: 14,
          duration: 1500,
          essential: true // This animation is considered essential for UX
        });
      } else {
        console.warn('Map not initialized');
      }
    } else {
      console.warn('Invalid coordinates for walk:', { walk });
    }
    
    this.updateUI();
  }

  cleanup() {
    this.markers.forEach(m => m.remove());
    this.markers.clear();
    if (this.map) this.map.remove();
    this.map = null;
    this.walks = [];
  }

  updateMapFromResults(response) {
    try {
      const walks = JSON.parse(response);
      this.setWalks(walks);
      this.renderWalkCards(walks);
    } catch (error) {
      console.error('Failed to update map from results:', error);
    }
  }

  renderWalkCards(walks) {
    const template = document.getElementById('walk-card-template');
    const container = document.getElementById('walk-list');
    if (!template || !container) return;

    container.innerHTML = '';
    walks.forEach(walk => {
      const card = template.content.cloneNode(true).firstElementChild;
      
      card.dataset.walkId = walk.id;
      if (walk.id === this.selectedWalkId) {
        card.classList.add('walk-card--selected');
      }

      card.querySelector('h3').textContent = walk.walk_name;
      card.querySelector('.difficulty').textContent = walk.steepness_level;
      card.querySelector('.distance').textContent = utils.formatDistance(walk.distance);

      if (walk.features?.length) {
        const featuresContainer = card.querySelector('.features');
        walk.features.forEach(feature => {
          const tag = document.createElement('span');
          tag.className = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100';
          tag.textContent = feature;
          featuresContainer.appendChild(tag);
        });
      }

      card.addEventListener('click', () => this.selectWalk(walk.id));
      container.appendChild(card);
    });

    // Update no results message
    const noResults = document.getElementById('no-results');
    if (noResults) {
      noResults.classList.toggle('hidden', walks.length > 0);
    }
  }
}

export const walkStore = new WalkStore();

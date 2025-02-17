# Revised WalkQuest Walk Card & Map Marker Sync Implementation Plan

## Overview
This document outlines the implementation plan for synchronizing walk card and map marker interactions between WalkInterface.vue and WalkList.vue components using vue-mapbox-gl library.

## 1. Component Structure

### WalkInterface.vue
```vue
<template>
  <div class="flex h-full">
    <!-- Map Container -->
    <div class="w-2/3 h-full relative">
      <MapboxMap
        :access-token="mapboxToken"
        map-style="mapbox://styles/mapbox/streets-v11"
        @mb-created="handleMapCreated">
        <!-- Search Control -->
        <MapboxGeocoder
          :access-token="mapboxToken"
          :zoom="12"
          :marker="false"
          placeholder="Search for walks nearby..."
          @mb-result="handleSearchResult"
        />
        
        <!-- Clustered Walk Markers -->
        <MapboxCluster
          :source-id="'walks'"
          :geojson="walkGeoJson"
          @mb-cluster-click="handleClusterClick"
          @mb-feature-click="handleMarkerClick"
          @mb-feature-mouseenter="handleMarkerMouseEnter"
          @mb-feature-mouseleave="handleMarkerMouseLeave">
          <!-- Custom Marker Popups -->
          <MapboxPopup
            v-if="activeWalkId"
            :lng-lat="activeWalkLocation"
            :offset="[0, -15]"
            :close-on-click="false">
            <WalkPopupContent :walk="activeWalk" />
          </MapboxPopup>
        </MapboxCluster>
      </MapboxMap>
    </div>

    <!-- Walk List Container with Virtual Scroll -->
    <div class="w-1/3 h-full">
      <RecycleScroller
        class="h-full"
        :items="walks"
        :item-size="200"
        key-field="id"
        v-slot="{ item }">
        <WalkCard
          :walk="item"
          :is-active="activeWalkId === item.id"
          @click="handleWalkSelect(item.id)"
        />
      </RecycleScroller>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useWalksStore } from '@/stores/walks'
import { useUiStore } from '@/stores/ui'
import {
  MapboxMap,
  MapboxGeocoder,
  MapboxCluster,
  MapboxPopup
} from '@studiometa/vue-mapbox-gl'
import WalkCard from './WalkCard.vue'
import WalkPopupContent from './WalkPopupContent.vue'

// Store access
const walksStore = useWalksStore()
const uiStore = useUiStore()

// Computed properties
const walks = computed(() => walksStore.walks)
const activeWalkId = computed(() => walksStore.activeWalkId)
const activeWalk = computed(() => walksStore.activeWalk)
const activeWalkLocation = computed(() => {
  if (!activeWalk.value) return null
  return [activeWalk.value.longitude, activeWalk.value.latitude]
})

// Convert walks to GeoJSON for clustering
const walkGeoJson = computed(() => ({
  type: 'FeatureCollection',
  features: walks.value.map(walk => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [walk.longitude, walk.latitude]
    },
    properties: {
      id: walk.id,
      title: walk.title,
      difficulty: walk.difficulty
    }
  }))
}))

// Event Handlers
const handleMapCreated = (map) => {
  // Store map instance if needed
}

const handleSearchResult = (result) => {
  // Update map view and filter walks based on search result
}

const handleClusterClick = (cluster) => {
  // Zoom to cluster extent
}

const handleMarkerClick = (feature) => {
  walksStore.setActiveWalk(feature.properties.id)
}

const handleMarkerMouseEnter = (feature) => {
  // Handle hover state
  uiStore.$patch({ hoveredWalkId: feature.properties.id })
}

const handleMarkerMouseLeave = () => {
  // Clear hover state
  uiStore.$patch({ hoveredWalkId: null })
}

const handleWalkSelect = (walkId) => {
  walksStore.setActiveWalk(walkId)
}

onMounted(async () => {
  await walksStore.loadWalks()
})
</script>
```

### WalkPopupContent.vue
```vue
<template>
  <div class="p-4 max-w-sm">
    <h3 class="text-lg font-semibold mb-2">{{ walk.title }}</h3>
    <div class="flex items-center gap-2 mb-2">
      <iconify-icon icon="mdi:map-marker" />
      <span>{{ walk.location }}</span>
    </div>
    <div class="flex items-center gap-2 mb-2">
      <iconify-icon icon="mdi:clock-outline" />
      <span>{{ walk.duration }}</span>
    </div>
    <div class="flex items-center gap-2">
      <iconify-icon icon="mdi:terrain" />
      <span>{{ walk.difficulty }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  walk: {
    type: Object,
    required: true
  }
})
</script>
```

## 2. Store Structure (Existing in Pinia)

The store structure is already set up in main.js. We'll extend it with walk-specific functionality:

```js
// stores/walks.js
import { defineStore } from 'pinia'

export const useWalksStore = defineStore('walks', {
  state: () => ({
    walks: [],
    activeWalkId: null,
    loading: false,
    error: null,
    filters: {
      difficulty: null,
      duration: null,
      distance: null
    }
  }),

  getters: {
    activeWalk: (state) => 
      state.walks.find(w => w.id === state.activeWalkId),

    filteredWalks: (state) => {
      return state.walks.filter(walk => {
        if (state.filters.difficulty && walk.difficulty !== state.filters.difficulty) {
          return false
        }
        // Add other filter conditions
        return true
      })
    }
  },

  actions: {
    setActiveWalk(id) {
      this.activeWalkId = id
    },

    updateFilters(filters) {
      this.filters = { ...this.filters, ...filters }
    },

    async loadWalks() {
      this.loading = true
      try {
        const response = await fetch('/api/walks/')
        this.walks = await response.json()
      } catch (err) {
        this.error = err
      } finally {
        this.loading = false
      }
    }
  }
})
```

## 3. Key Features

### Map Features
- Clustered markers using MapboxCluster
- Interactive popups with walk details
- Geocoder search integration
- Smooth animations for marker/card sync
- Responsive map controls

### List Features
- Virtual scrolling for performance
- Synchronized card highlighting
- Smooth scroll to active card
- Clear visual feedback

## 4. Implementation Steps

1. **Setup Map Components**
   - Configure MapboxMap with proper token
   - Add MapboxGeocoder for location search
   - Implement MapboxCluster for marker clustering
   - Add MapboxPopup for walk information

2. **Enhance Virtual List**
   - Verify RecycleScroller configuration
   - Implement proper card highlighting
   - Add scroll into view behavior

3. **State Management**
   - Extend existing Pinia store
   - Add walk-specific actions
   - Implement filter logic

4. **Interaction Handling**
   - Marker click events
   - Card selection events
   - Search result handling
   - Cluster interaction

## 5. Performance Considerations

1. **Map Optimization**
   - Use clustering for large datasets
   - Implement marker visibility tracking
   - Optimize popup rendering

2. **List Performance**
   - Leverage existing virtual scrolling
   - Minimize reactivity overhead
   - Optimize card rendering

3. **State Updates**
   - Batch store updates when possible
   - Use computed properties effectively
   - Implement proper cleanup

## 6. Testing Requirements

1. **Component Tests**
   - Map initialization
   - Marker clustering
   - Popup behavior
   - Card interactions

2. **Integration Tests**
   - Map-list synchronization
   - Search functionality
   - Filter behavior
   - State management

3. **Performance Tests**
   - Large dataset handling
   - Scroll performance
   - Map interaction responsiveness

This revised implementation plan leverages the vue-mapbox-gl library and existing infrastructure while maintaining high performance and user experience standards.
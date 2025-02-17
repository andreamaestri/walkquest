# WalkQuest Walk Card & Map Marker Sync Implementation Plan

## Overview
This document outlines the implementation plan for synchronizing walk card and map marker interactions between WalkInterface.vue and WalkList.vue components using Mapbox GL JS.


```

2. Configure WalkList.vue RecycleScroller:
```vue
<RecycleScroller
  class="h-full w-full"
  :items="walks"
  :item-size="200" // Base item height
  key-field="id"
  :buffer="150" // Expanded padding for smoother scrolling
  v-slot="{ item, index }"
>
  <WalkCard 
    :walk="item"
    :is-active="activeWalkId === item.id"
    @click="handleWalkSelect(item.id)"
  />
</RecycleScroller>
```

## 2. State Management

### Pinia Store Structure (walks.js)
```js
export const useWalksStore = defineStore('walks', {
  state: () => ({
    walks: [],
    activeWalkId: null,
    mapBounds: null,
    visibleMarkers: new Set(),
    loading: false,
    error: null
  }),
  
  getters: {
    activeWalk: (state) => 
      state.walks.find(w => w.id === state.activeWalkId),
      
    walksInView: (state) => 
      state.walks.filter(w => state.visibleMarkers.has(w.id))
  },
  
  actions: {
    setActiveWalk(id) {
      this.activeWalkId = id
    },
    
    updateMapBounds(bounds) {
      this.mapBounds = bounds
    },
    
    updateVisibleMarkers(ids) {
      this.visibleMarkers = new Set(ids)
    },

    async loadWalks() {
      this.loading = true
      try {
        // Load walks from API
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

## 3. Component Integration

### WalkInterface.vue
```vue
<template>
  <div class="flex h-full">
    <!-- Map Container -->
    <MapView
      class="w-2/3 h-full"
      :walks="walks"
      :active-walk-id="activeWalkId"
      @marker-click="handleMarkerClick"
      @bounds-change="handleBoundsChange"
      @visible-markers-change="handleVisibleMarkersChange"
    />
    
    <!-- Walk List Container -->
    <WalkList 
      class="w-1/3 h-full"
      :walks="walks"
      :active-walk-id="activeWalkId"
      @walk-selected="handleWalkSelect"
    />
  </div>
</template>

<script setup>
import { useWalksStore } from '@/stores/walks'
import MapView from './MapView.vue'
import WalkList from './WalkList.vue'

const store = useWalksStore()

// Event Handlers
const handleMarkerClick = (walkId) => {
  store.setActiveWalk(walkId)
}

const handleWalkSelect = (walkId) => {
  store.setActiveWalk(walkId)
}

const handleBoundsChange = (bounds) => {
  store.updateMapBounds(bounds) 
}

const handleVisibleMarkersChange = (markerIds) => {
  store.updateVisibleMarkers(markerIds)
}
</script>
```

### WalkList.vue
```vue
<template>
  <div class="h-full overflow-hidden">
    <RecycleScroller
      class="h-full w-full"
      :items="walks"
      :item-size="200"
      key-field="id"
      :buffer="150"
      v-slot="{ item }"
    >
      <WalkCard
        :walk="item"
        :is-active="item.id === activeWalkId"
        @click="$emit('walk-selected', item.id)"
      />
    </RecycleScroller>
  </div>
</template>

<script setup>
import { RecycleScroller } from 'vue-virtual-scroller'
import WalkCard from './WalkCard.vue'

defineProps({
  walks: {
    type: Array,
    required: true
  },
  activeWalkId: {
    type: String,
    default: null
  }
})

defineEmits(['walk-selected'])
</script>
```

## 4. Map Integration

### MapView.vue Enhancements
```vue
<template>
  <div class="relative h-full">
    <div ref="mapContainer" class="absolute inset-0" />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import mapboxgl from 'mapbox-gl'

const mapContainer = ref(null)
const map = ref(null)
const markers = ref(new Map())

const props = defineProps({
  walks: {
    type: Array,
    required: true
  },
  activeWalkId: {
    type: String,
    default: null
  }
})

const emit = defineEmits([
  'marker-click',
  'bounds-change',
  'visible-markers-change'
])

// Initialize map
onMounted(() => {
  map.value = new mapboxgl.Map({
    container: mapContainer.value,
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [-74.5, 40], // Default center
    zoom: 9
  })
  
  setupMapEvents()
  setupMarkers()
})

// Cleanup
onBeforeUnmount(() => {
  markers.value.forEach(marker => marker.remove())
  map.value?.remove()
})

// Watch for active walk changes
watch(() => props.activeWalkId, (newId) => {
  if (newId) {
    const walk = props.walks.find(w => w.id === newId)
    if (walk) {
      map.value?.flyTo({
        center: [walk.longitude, walk.latitude],
        zoom: 14,
        duration: 1500
      })
    }
  }
})

function setupMapEvents() {
  map.value.on('moveend', () => {
    const bounds = map.value.getBounds()
    emit('bounds-change', bounds)
    
    // Find visible markers
    const visibleMarkers = props.walks.filter(walk => {
      const lngLat = new mapboxgl.LngLat(walk.longitude, walk.latitude)
      return bounds.contains(lngLat)
    })
    
    emit('visible-markers-change', visibleMarkers.map(w => w.id))
  })
}

function setupMarkers() {
  props.walks.forEach(walk => {
    const marker = new mapboxgl.Marker({
      color: '#FF0000',
      draggable: false
    })
      .setLngLat([walk.longitude, walk.latitude])
      .setPopup(new mapboxgl.Popup().setHTML(walk.name))
      .addTo(map.value)
    
    marker.getElement().addEventListener('click', () => {
      emit('marker-click', walk.id)
    })
    
    markers.value.set(walk.id, marker)
  })
}
</script>
```

## 5. Implementation Steps

1. **Fix Virtual Scroller**
   - Add CSS import to main.js
   - Configure RecycleScroller in WalkList.vue
   - Verify proper rendering and recycling

2. **Setup Store**
   - Create walks.js Pinia store
   - Implement state management
   - Add actions for sync operations

3. **Enhance Components**
   - Update WalkInterface.vue with layout and handlers
   - Implement WalkList.vue with virtual scrolling
   - Configure MapView.vue with marker management

4. **Test Integration**
   - Verify card-marker sync
   - Test virtual scrolling performance
   - Validate map interactions
   - Check memory usage

## 6. Performance Considerations

1. **Virtual List Optimization**
   - Fixed item size: 200px
   - Buffer size: 150px
   - DOM recycling enabled
   - Proper cleanup in onBeforeUnmount

2. **Map Performance**
   - Marker clustering for large datasets
   - Bounds-based marker visibility
   - Event debouncing
   - Memory leak prevention

3. **State Management**
   - Computed property caching
   - Minimal state updates
   - Efficient marker tracking
   - Optimized store subscriptions

## 7. Testing Requirements

1. **Component Tests**
   - Virtual list rendering
   - Map marker creation
   - Event handling
   - State management

2. **Integration Tests**
   - Card-marker sync
   - Virtual scroll behavior
   - Map interaction
   - Performance metrics

3. **User Flow Tests**
   - Click interactions
   - Scroll behavior
   - Map navigation
   - State consistency

This implementation plan follows Vue 3 Composition API patterns, uses Pinia for state management, and implements proper virtual scrolling with MapBox integration.